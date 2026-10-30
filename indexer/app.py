"""
app.py - IFSE Open indexer service
Crawler + indexer + the owner's dashboard, on port 5101. Keep this port on
your own machine or private network: it is the control room of the index.

The dashboard asks for the admin token (env IFSE_ADMIN_TOKEN, or the one
written to data/admin_token on first start).
"""

import functools
import hmac
import os
import secrets
import sys
import threading
import time

from flask import Flask, jsonify, make_response, redirect, render_template, request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "common"))

import crawler as crawler_mod  # noqa: E402
import filters  # noqa: E402
import index  # noqa: E402
import store  # noqa: E402

VERSION = "1.1"

app = Flask(__name__)
app.json.ensure_ascii = False
crawler = crawler_mod.Crawler()


# ── admin token ───────────────────────────────────────────
def _admin_token() -> str:
    tok = os.environ.get("IFSE_ADMIN_TOKEN", "").strip()
    if tok:
        return tok
    path = os.path.join(store.DATA_DIR, "admin_token")
    try:
        with open(path, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        tok = secrets.token_urlsafe(24)
        os.makedirs(store.DATA_DIR, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(tok)
        print(f"[IFSE Open] admin token written to {path}", flush=True)
        return tok


ADMIN_TOKEN = _admin_token()
_fails: dict = {}


def _authorized() -> bool:
    given = request.cookies.get("ifse_admin") or request.headers.get("X-Admin-Token", "")
    return bool(given) and hmac.compare_digest(given, ADMIN_TOKEN)


def admin(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not _authorized():
            return jsonify(ok=False, error="unauthorized"), 401
        if request.method == "POST" and not request.is_json:
            return jsonify(ok=False, error="JSON body required"), 415
        return fn(*a, **kw)
    return wrapper


def body() -> dict:
    return request.get_json(silent=True) or {}


def _int(name: str, default: int, lo: int = 0, hi: int = 10 ** 9) -> int:
    try:
        return max(lo, min(hi, int(request.args.get(name, default))))
    except ValueError:
        return default


@app.after_request
def headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    return resp


# ── pages ─────────────────────────────────────────────────
@app.route("/")
def home():
    if not _authorized():
        return render_template("login.html", version=VERSION)
    return render_template("dashboard.html", version=VERSION, search_url=os.environ.get("IFSE_SEARCH_URL", "").rstrip("/"))


@app.route("/login", methods=["POST"])
def login():
    ip = request.remote_addr or "?"
    fails = [t for t in _fails.get(ip, []) if t > time.time() - 600]
    if len(fails) >= 8:
        return jsonify(ok=False, error="too many attempts, wait 10 minutes"), 429
    token = (body().get("token") or request.form.get("token") or "").strip()
    if not token or not hmac.compare_digest(token, ADMIN_TOKEN):
        _fails[ip] = fails + [time.time()]
        return jsonify(ok=False, error="wrong token"), 403
    resp = make_response(jsonify(ok=True))
    resp.set_cookie("ifse_admin", ADMIN_TOKEN, httponly=True, samesite="Strict", max_age=30 * 86400,
                    secure=request.is_secure)
    return resp


@app.route("/logout")
def logout():
    resp = make_response(redirect("/"))
    resp.delete_cookie("ifse_admin")
    return resp


# ── overview ──────────────────────────────────────────────
_terms_cache = [0, 0.0]


def overview() -> dict:
    c = index.counts_light()
    if _terms_cache[1] < time.time() - 15:
        _terms_cache[0] = index.term_count()
        _terms_cache[1] = time.time()
    c["index_terms"] = _terms_cache[0]
    c.update(crawler.status())
    c["version"] = VERSION
    c["updated"] = time.time()
    return c


@app.route("/api/admin/status")
@admin
def status():
    return jsonify(overview())


def _status_writer():
    """data/status.json is how the search service learns what the crawler does."""
    while True:
        try:
            s = overview()
            s.pop("current", None)
            store.write_json(store.STATUS_PATH, s)
        except Exception as e:
            print(f"[IFSE Open] status: {e}", flush=True)
        time.sleep(5)


def _housekeeping():
    while True:
        time.sleep(3600)
        try:
            index.prune_log()
        except Exception as e:
            print(f"[IFSE Open] housekeeping: {e}", flush=True)


# ── crawling ──────────────────────────────────────────────
@app.route("/api/admin/seeds", methods=["POST"])
@admin
def seeds():
    raw = body().get("urls") or []
    if isinstance(raw, str):
        raw = raw.splitlines()
    urls, bad = [], []
    for u in raw[:5000]:
        u = u.strip()
        if not u:
            continue
        if "://" not in u:
            u = "https://" + u
        c = crawler_mod.clean_url(u)
        (urls if c else bad).append(c or u)
    added = index.enqueue(urls, 0, "seed")
    requeued = index.requeue([u for u in urls]) if body().get("recrawl") else 0
    index.log("seeds", "", f"{added} new, {requeued} re-queued")
    return jsonify(ok=True, added=added, requeued=requeued, invalid=bad)


@app.route("/api/admin/control", methods=["POST"])
@admin
def control():
    action = body().get("action")
    if action == "pause":
        crawler_mod.save_settings({"paused": True})
    elif action == "resume":
        crawler_mod.save_settings({"paused": False})
    else:
        return jsonify(ok=False, error="action is pause or resume"), 400
    crawler.reload()
    index.log(action)
    return jsonify(ok=True, status=crawler.status())


@app.route("/api/admin/settings", methods=["GET", "POST"])
@admin
def settings():
    if request.method == "POST":
        s = crawler_mod.save_settings(body())
        crawler.reload()
        crawler.start()
        index.log("settings", "", index.dumps(s))
        return jsonify(ok=True, settings=s)
    return jsonify(ok=True, settings=crawler_mod.load_settings())


@app.route("/api/admin/queue")
@admin
def queue():
    state = _int("state", 0, 0, 4)
    page = _int("page", 1, 1)
    rows = index.conn().execute(
        "SELECT url, host, depth, state, added_at, note FROM frontier WHERE state=? ORDER BY added_at DESC LIMIT 50 OFFSET ?",
        (state, (page - 1) * 50)).fetchall()
    return jsonify(ok=True, items=[dict(r) for r in rows])


@app.route("/api/admin/queue/clear", methods=["POST"])
@admin
def queue_clear():
    state = int(body().get("state", 0))
    if state not in (0, 3, 4):
        return jsonify(ok=False, error="only waiting, failed or filtered can be cleared"), 400
    with index._lock:
        n = index.conn().execute("DELETE FROM frontier WHERE state=?", (state,)).rowcount
        index.conn().commit()
    index.log("queue_cleared", "", f"state {state}: {n}")
    return jsonify(ok=True, removed=n)


@app.route("/api/admin/queue/retry", methods=["POST"])
@admin
def queue_retry():
    state = int(body().get("state", 3))
    if state not in (3, 4):
        return jsonify(ok=False, error="only failed or filtered can be retried"), 400
    with index._lock:
        n = index.conn().execute("UPDATE frontier SET state=0, note='' WHERE state=?", (state,)).rowcount
        index.conn().commit()
    return jsonify(ok=True, requeued=n)


# ── filters ───────────────────────────────────────────────
@app.route("/api/admin/filters")
@admin
def filters_get():
    return jsonify(ok=True, filters=filters.load(), types=filters.TYPES)


@app.route("/api/admin/filters/rule", methods=["POST"])
@admin
def filters_rule():
    rule, err = filters.validate_rule(body())
    if not rule:
        return jsonify(ok=False, error=err), 400
    data = filters.load()
    rules = [r for r in data["rules"] if r["id"] != rule["id"]]
    existed = len(rules) != len(data["rules"])
    rules.append(rule)
    data["rules"] = rules
    filters.save(data)
    crawler.reload()
    index.log("filter_changed" if existed else "filter_added", "", f"{rule['action']} {rule['type']}={rule['value']}")
    return jsonify(ok=True, rule=rule)


@app.route("/api/admin/filters/delete", methods=["POST"])
@admin
def filters_delete():
    rid = body().get("id")
    data = filters.load()
    gone = [r for r in data["rules"] if r["id"] == rid]
    data["rules"] = [r for r in data["rules"] if r["id"] != rid]
    filters.save(data)
    crawler.reload()
    if gone:
        r = gone[0]
        index.log("filter_removed", "", f"{r['action']} {r['type']}={r['value']}")
    return jsonify(ok=True, removed=len(gone))


@app.route("/api/admin/filters/options", methods=["POST"])
@admin
def filters_options():
    b = body()
    data = filters.load()
    if "allowlist_only" in b:
        data["allowlist_only"] = bool(b["allowlist_only"])
    for k in ("min_words", "max_page_kb"):
        if k in b:
            try:
                data[k] = max(0, int(b[k]))
            except (TypeError, ValueError):
                return jsonify(ok=False, error=f"{k} must be a number"), 400
    if "allowed_langs" in b:
        data["allowed_langs"] = [x for x in b["allowed_langs"] if x in ("ar", "en", "mixed")]
    filters.save(data)
    crawler.reload()
    index.log("filter_options", "", index.dumps({k: data[k] for k in ("allowlist_only", "min_words", "max_page_kb", "allowed_langs")}))
    return jsonify(ok=True, filters=data)


@app.route("/api/admin/filters/test", methods=["POST"])
@admin
def filters_test():
    """Would this URL be kept? Uses the indexed copy when there is one."""
    url = crawler_mod.clean_url(str(body().get("url", "")).strip())
    if not url:
        return jsonify(ok=False, error="not a valid http(s) URL"), 400
    comp = filters.Compiled()
    ok, why = comp.check_url(url)
    row = index.conn().execute("SELECT * FROM pages WHERE url=?", (url,)).fetchone()
    result = {"url": url, "url_check": {"keep": ok, "why": why}, "indexed": bool(row)}
    if row:
        pk, pwhy = comp.check_page(dict(row))
        result["page_check"] = {"keep": pk, "why": pwhy}
    return jsonify(ok=True, **result)


def _scan(comp: filters.Compiled, limit: int | None = None) -> list:
    out = []
    last = 0
    while True:
        rows = index.conn().execute(
            "SELECT id, url, host, title, description, headings, body, lang, words, size_kb FROM pages WHERE id>? ORDER BY id LIMIT 500",
            (last,)).fetchall()
        if not rows:
            return out
        for r in rows:
            ok, why = comp.check_page(dict(r))
            if not ok:
                out.append({"id": r["id"], "url": r["url"], "title": r["title"], "why": why})
                if limit and len(out) >= limit:
                    return out
        last = rows[-1]["id"]


@app.route("/api/admin/filters/apply", methods=["POST"])
@admin
def filters_apply():
    """Run the current filters over pages already in the index.
    dry=true lists what would go; dry=false removes it."""
    dry = bool(body().get("dry", True))
    hits = _scan(filters.Compiled())
    if dry:
        return jsonify(ok=True, dry=True, count=len(hits), sample=hits[:200])
    n = index.delete_pages([h["id"] for h in hits], "filters applied to the index", event="purged")
    index.log("filters_applied", "", f"{n} pages removed")
    return jsonify(ok=True, dry=False, removed=n)


# ── index browser ─────────────────────────────────────────
_SORTS = {
    "new": "fetched_at DESC",
    "old": "fetched_at ASC",
    "title": "title COLLATE NOCASE ASC",
    "words": "words DESC",
    "size": "size_kb DESC",
}


@app.route("/api/admin/pages")
@admin
def pages():
    q = request.args.get("q", "").strip()
    host = request.args.get("host", "").strip().lower()
    lang = request.args.get("lang", "")
    sort = _SORTS.get(request.args.get("sort", "new"), _SORTS["new"])
    page = _int("page", 1, 1)
    per = _int("per", 50, 10, 200)
    where, args = [], []
    if q:
        where.append("(url LIKE ? OR title LIKE ?)")
        args += [f"%{q}%", f"%{q}%"]
    if host:
        where.append("(host=? OR host LIKE ?)")
        args += [host, "%." + host]
    if lang in ("ar", "en", "mixed"):
        where.append("lang=?")
        args.append(lang)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    c = index.conn()
    total = c.execute(f"SELECT COUNT(*) FROM pages {w}", args).fetchone()[0]
    rows = c.execute(
        f"SELECT id, url, host, title, lang, words, size_kb, depth, first_seen, fetched_at FROM pages {w} ORDER BY {sort} LIMIT ? OFFSET ?",
        args + [per, (page - 1) * per]).fetchall()
    return jsonify(ok=True, total=total, page=page, per=per, items=[dict(r) for r in rows])


@app.route("/api/admin/page")
@admin
def page_detail():
    row = index.conn().execute("SELECT * FROM pages WHERE id=?", (_int("id", 0),)).fetchone()
    if not row:
        return jsonify(ok=False, error="not found"), 404
    hist = index.conn().execute("SELECT ts, event, detail FROM index_log WHERE url=? ORDER BY ts DESC LIMIT 30",
                                (row["url"],)).fetchall()
    return jsonify(ok=True, page=dict(row), history=[dict(h) for h in hist])


@app.route("/api/admin/hosts")
@admin
def hosts():
    q = request.args.get("q", "").strip().lower()
    page = _int("page", 1, 1)
    w, args = ("WHERE host LIKE ?", [f"%{q}%"]) if q else ("", [])
    rows = index.conn().execute(
        f"SELECT host, COUNT(*) AS pages, MAX(fetched_at) AS last FROM pages {w} GROUP BY host ORDER BY pages DESC LIMIT 50 OFFSET ?",
        args + [(page - 1) * 50]).fetchall()
    return jsonify(ok=True, items=[dict(r) for r in rows])


@app.route("/api/admin/pages/delete", methods=["POST"])
@admin
def pages_delete():
    ids = [int(i) for i in body().get("ids", []) if str(i).isdigit()]
    return jsonify(ok=True, removed=index.delete_pages(ids, "removed from the dashboard"))


@app.route("/api/admin/pages/delete_host", methods=["POST"])
@admin
def pages_delete_host():
    host = str(body().get("host", "")).strip().lower().removeprefix("www.")
    if not host:
        return jsonify(ok=False, error="host required"), 400
    removed = index.delete_host(host, "host removed from the dashboard")
    rule = None
    if body().get("block"):
        rule, _ = filters.validate_rule({"type": "host", "value": host, "action": "block", "note": "blocked from the index browser"})
        data = filters.load()
        data["rules"].append(rule)
        filters.save(data)
        crawler.reload()
        index.log("filter_added", "", f"block host={host}")
    return jsonify(ok=True, removed=removed, rule=rule)


@app.route("/api/admin/pages/recrawl", methods=["POST"])
@admin
def pages_recrawl():
    ids = [int(i) for i in body().get("ids", []) if str(i).isdigit()]
    if not ids:
        return jsonify(ok=True, requeued=0)
    marks = ",".join("?" * len(ids))
    urls = [r["url"] for r in index.conn().execute(f"SELECT url FROM pages WHERE id IN ({marks})", ids)]
    n = index.requeue(urls)
    return jsonify(ok=True, requeued=n)


# ── index log ─────────────────────────────────────────────
@app.route("/api/admin/log")
@admin
def log():
    event = request.args.get("event", "").strip()
    page = _int("page", 1, 1)
    w, args = ("WHERE event=?", [event]) if event else ("", [])
    rows = index.conn().execute(
        f"SELECT ts, event, url, detail FROM index_log {w} ORDER BY id DESC LIMIT 100 OFFSET ?",
        args + [(page - 1) * 100]).fetchall()
    day = index.conn().execute(
        "SELECT event, COUNT(*) AS n FROM index_log WHERE ts > ? GROUP BY event", (time.time() - 86400,)).fetchall()
    return jsonify(ok=True, items=[dict(r) for r in rows], last_24h={r["event"]: r["n"] for r in day})


@app.route("/health")
def health():
    return jsonify(ok=True, version=VERSION)


def main():
    index.conn()
    crawler.start()
    threading.Thread(target=_status_writer, daemon=True, name="status").start()
    threading.Thread(target=_housekeeping, daemon=True, name="housekeeping").start()
    host = os.environ.get("IFSE_INDEXER_HOST", "0.0.0.0")
    port = int(os.environ.get("IFSE_INDEXER_PORT", "5101"))
    from waitress import serve
    print(f"[IFSE Open] indexer {VERSION} on http://{host}:{port}", flush=True)
    serve(app, host=host, port=port, threads=8)


if __name__ == "__main__":
    main()
