"""
index.py - IFSE Open indexer
Every write to data/ifse.db goes through here, under one lock: the crawler
threads, the dashboard and the filter purge share a single connection.
"""

import json
import threading
import time

import store
import textnorm

_lock = threading.RLock()
_conn = None

LOG_KEEP_DAYS = 90


def conn():
    global _conn
    with _lock:
        if _conn is None:
            _conn = store.connect_rw()
            _conn.execute("UPDATE frontier SET state=0 WHERE state=1")   # fetches cut by a restart
            _conn.commit()
        return _conn


def log(event: str, url: str = "", detail: str = "", commit: bool = True) -> None:
    with _lock:
        c = conn()
        c.execute("INSERT INTO index_log(ts, event, url, detail) VALUES (?,?,?,?)",
                  (time.time(), event, url, detail[:500]))
        if commit:
            c.commit()


# ── pages ─────────────────────────────────────────────────
def _fts_row(page: dict) -> tuple:
    return (
        textnorm.host_text(page["host"]),
        textnorm.index_text(page["title"]),
        textnorm.index_text(page["description"]),
        textnorm.index_text(page["headings"]),
        textnorm.index_text(page["body"]),
    )


def upsert_page(page: dict) -> str:
    """'added' or 'updated'. A re-crawled page keeps its id and first_seen."""
    with _lock:
        c = conn()
        old = c.execute("SELECT id FROM pages WHERE url=?", (page["url"],)).fetchone()
        t = time.time()
        if old:
            pid = old["id"]
            c.execute("""UPDATE pages SET host=?, title=?, description=?, headings=?, body=?, lang=?,
                         size_kb=?, words=?, depth=?, fetched_at=? WHERE id=?""",
                      (page["host"], page["title"], page["description"], page["headings"], page["body"],
                       page["lang"], page["size_kb"], page["words"], page["depth"], t, pid))
            c.execute("DELETE FROM fts WHERE rowid=?", (pid,))
            event = "updated"
        else:
            cur = c.execute("""INSERT INTO pages(url, host, title, description, headings, body, lang,
                               size_kb, words, depth, first_seen, fetched_at)
                               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                            (page["url"], page["host"], page["title"], page["description"], page["headings"],
                             page["body"], page["lang"], page["size_kb"], page["words"], page["depth"], t, t))
            pid = cur.lastrowid
            event = "added"
        c.execute("INSERT INTO fts(rowid, host, title, description, headings, body) VALUES (?,?,?,?,?,?)",
                  (pid, *_fts_row(page)))
        log(event, page["url"], page["title"][:120], commit=False)
        c.commit()
        return event


def delete_pages(ids: list, reason: str, event: str = "removed") -> int:
    if not ids:
        return 0
    with _lock:
        c = conn()
        n = 0
        for i in range(0, len(ids), 500):
            chunk = ids[i:i + 500]
            marks = ",".join("?" * len(chunk))
            urls = [r["url"] for r in c.execute(f"SELECT url FROM pages WHERE id IN ({marks})", chunk)]
            c.execute(f"DELETE FROM fts WHERE rowid IN ({marks})", chunk)
            n += c.execute(f"DELETE FROM pages WHERE id IN ({marks})", chunk).rowcount
            for u in urls:
                log(event, u, reason, commit=False)
        c.commit()
        return n


def delete_host(host: str, reason: str) -> int:
    with _lock:
        ids = [r["id"] for r in conn().execute(
            "SELECT id FROM pages WHERE host=? OR host LIKE ?", (host, "%." + host))]
        return delete_pages(ids, reason)


# ── frontier ──────────────────────────────────────────────
def enqueue(urls: list, depth: int, note: str = "") -> int:
    """New URLs only; returns how many were added."""
    from urllib.parse import urlsplit
    if not urls:
        return 0
    with _lock:
        c = conn()
        t = time.time()
        n = 0
        for u in urls:
            host = (urlsplit(u).hostname or "").lower()
            if not host:
                continue
            n += c.execute("INSERT OR IGNORE INTO frontier(url, host, depth, state, added_at, note) VALUES (?,?,?,0,?,?)",
                           (u, host, depth, t, note)).rowcount
        c.commit()
        return n


def requeue(urls: list) -> int:
    with _lock:
        c = conn()
        n = 0
        for u in urls:
            n += c.execute("UPDATE frontier SET state=0, added_at=? WHERE url=?", (time.time(), u)).rowcount
        c.commit()
        return n


def set_state(url: str, state: int, note: str = "") -> None:
    with _lock:
        c = conn()
        c.execute("UPDATE frontier SET state=?, note=? WHERE url=?", (state, note[:200], url))
        c.commit()


def claim(busy_hosts: set, ready_at: dict, limit: int = 300) -> dict | None:
    """The next waiting URL whose host is free and past its delay."""
    t = time.time()
    with _lock:
        c = conn()
        for r in c.execute("SELECT url, host, depth FROM frontier WHERE state=0 ORDER BY depth, added_at LIMIT ?", (limit,)):
            if r["host"] in busy_hosts or ready_at.get(r["host"], 0) > t:
                continue
            c.execute("UPDATE frontier SET state=1 WHERE url=?", (r["url"],))
            c.commit()
            return dict(r)
    return None


def host_load(host: str) -> int:
    """Pages of this host already known (indexed or queued)."""
    with _lock:
        return conn().execute("SELECT COUNT(*) FROM frontier WHERE host=?", (host,)).fetchone()[0]


def term_count() -> int:
    """Walks the whole vocabulary: call it rarely."""
    with _lock:
        return conn().execute("SELECT COUNT(*) FROM fts_vocab").fetchone()[0]


def counts_light() -> dict:
    with _lock:
        c = conn()
        q = dict(c.execute("SELECT state, COUNT(*) FROM frontier GROUP BY state").fetchall())
        return {
            "documents": c.execute("SELECT COUNT(*) FROM pages").fetchone()[0],
            "hosts": c.execute("SELECT COUNT(DISTINCT host) FROM pages").fetchone()[0],
            "queue_waiting": q.get(0, 0),
            "queue_fetching": q.get(1, 0),
            "queue_done": q.get(2, 0),
            "queue_failed": q.get(3, 0),
            "queue_filtered": q.get(4, 0),
        }


def prune_log() -> None:
    with _lock:
        c = conn()
        c.execute("DELETE FROM index_log WHERE ts < ?", (time.time() - LOG_KEEP_DAYS * 86400,))
        c.commit()


def dumps(o) -> str:
    return json.dumps(o, ensure_ascii=False)
