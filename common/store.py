"""
store.py - IFSE Open
The index database both services share. The indexer service owns every
write; the search service opens it read-only.

data/
  ifse.db        pages, full-text index, crawl frontier, index log
  filters.json   the owner's indexing filters (see filters.py)
  settings.json  crawler settings edited from the dashboard
  status.json    what the crawler is doing, rewritten every few seconds
"""

import json
import os
import sqlite3
import tempfile
import time

DATA_DIR = os.environ.get("IFSE_DATA", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"))
DB_PATH = os.path.join(DATA_DIR, "ifse.db")
FILTERS_PATH = os.path.join(DATA_DIR, "filters.json")
SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")
STATUS_PATH = os.path.join(DATA_DIR, "status.json")

SCHEMA = """
CREATE TABLE IF NOT EXISTS pages (
    id          INTEGER PRIMARY KEY,
    url         TEXT NOT NULL UNIQUE,
    host        TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    headings    TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    lang        TEXT NOT NULL DEFAULT 'mixed',
    size_kb     INTEGER NOT NULL DEFAULT 0,
    words       INTEGER NOT NULL DEFAULT 0,
    depth       INTEGER NOT NULL DEFAULT 0,
    first_seen  REAL NOT NULL,
    fetched_at  REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS pages_host ON pages(host);
CREATE INDEX IF NOT EXISTS pages_fetched ON pages(fetched_at);

CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
    host, title, description, headings, body,
    tokenize = 'unicode61 remove_diacritics 2'
);
CREATE VIRTUAL TABLE IF NOT EXISTS fts_vocab USING fts5vocab(fts, row);

-- state: 0 waiting, 1 being fetched, 2 done, 3 failed, 4 filtered out
CREATE TABLE IF NOT EXISTS frontier (
    url       TEXT PRIMARY KEY,
    host      TEXT NOT NULL,
    depth     INTEGER NOT NULL DEFAULT 0,
    state     INTEGER NOT NULL DEFAULT 0,
    added_at  REAL NOT NULL,
    note      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS frontier_state ON frontier(state, depth, added_at);
CREATE INDEX IF NOT EXISTS frontier_host ON frontier(host);

-- what happened to the index: added, updated, filtered, removed, purged ...
CREATE TABLE IF NOT EXISTS index_log (
    id     INTEGER PRIMARY KEY,
    ts     REAL NOT NULL,
    event  TEXT NOT NULL,
    url    TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS index_log_ts ON index_log(ts);
"""


def _tune(conn: sqlite3.Connection) -> sqlite3.Connection:
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def connect_rw() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.executescript(SCHEMA)
    return _tune(conn)


def connect_ro() -> sqlite3.Connection | None:
    """None until the indexer has created the database."""
    if not os.path.exists(DB_PATH):
        return None
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False, timeout=30)
    return _tune(conn)


def read_json(path: str, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path: str, data) -> None:
    """Atomic: readers never see half a file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def now() -> float:
    return time.time()
