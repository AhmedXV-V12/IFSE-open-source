"""
app.py - IFSE Open search service
The public site on port 5000: home page, results, history, the site design
(design.py) and the JSON API the pages use. It only reads the index; the
indexer service writes it.
"""

import os
import re
import sys
import threading
import time

from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "common"))

import design  # noqa: E402
import store  # noqa: E402
import textnorm  # noqa: E402

VERSION = "1.1"
STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
MAX_RESULTS = 50

app = Flask(__name__, static_folder=None)
app.json.ensure_ascii = False
app.register_blueprint(design.bp)

_local = threading.local()


def db():
    """One read-only connection per thread, opened once the index exists."""
    c = getattr(_local, "conn", None)
    if c is None:
        c = store.connect_ro()
        _local.conn = c
    return c


# ── rate limit ────────────────────────────────────────────
_hits: dict = {}
_hits_lock = threading.Lock()
RATE_PER_MIN = int(os.environ.get("IFSE_RATE_PER_MIN", "120"))


@app.before_request
def rate_limit():
    if not request.path.startswith("/api/"):
        return None
    ip = request.remote_addr or "?"
    t = time.time()
    with _hits_lock:
        bucket = [x for x in _hits.get(ip, []) if x > t - 60]
        bucket.append(t)
        _hits[ip] = bucket
        if len(_hits) > 10000:
            _hits.clear()
    if len(bucket) > RATE_PER_MIN:
        return jsonify(error="too many requests"), 429
    return None


@app.after_request
def headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp


# ── search ────────────────────────────────────────────────
def _match_expr(query: str) -> tuple[str, str, list]:
    """FTS5 expressions: every word (AND), and any word (OR) as a fallback.
    The last word also matches as a prefix while it is still being typed."""
    toks = textnorm.tokens(query)[:12]
    if not toks:
        return "", "", []
    groups = []
    for i, t in enumerate(toks):
        star = "*" if i == len(toks) - 1 and len(t) >= 3 else ""
        forms = {f'"{t}"{star}', f'"{textnorm.light_stem(t)}"{star}'}
        groups.append("(" + " OR ".join(sorted(forms)) + ")")
    return " ".join(groups), " OR ".join(groups), toks


_SQL = """
SELECT p.url, p.title, p.description, p.host, p.lang, p.depth,
       bm25(fts, 6.0, 10.0, 4.0, 3.0, 1.0) AS rank
FROM fts JOIN pages p ON p.id = fts.rowid
WHERE fts MATCH ?
ORDER BY rank + p.depth * 0.5
LIMIT ? OFFSET ?
"""


def run_search(query: str, page: int = 1) -> dict:
    conn = db()
    if conn is None:
        return {"results": [], "count": 0}
    all_words, any_word, toks = _match_expr(query)
    if not toks:
        return {"results": [], "count": 0}
    offset = (page - 1) * MAX_RESULTS
    rows = conn.execute(_SQL, (all_words, MAX_RESULTS, offset)).fetchall()
    mode = "all"
    if not rows and len(toks) > 1:
        rows = conn.execute(_SQL, (any_word, MAX_RESULTS, offset)).fetchall()
        mode = "any"
    count = conn.execute("SELECT COUNT(*) FROM fts WHERE fts MATCH ?",
                         (all_words if mode == "all" else any_word,)).fetchone()[0]
    results, per_host = [], {}
    for r in rows:
        # at most 3 results of one host per page, so one site cannot fill it
        n = per_host.get(r["host"], 0)
        if n >= 3:
            continue
        per_host[r["host"]] = n + 1
        results.append({
            "url": r["url"],
            "title": r["title"] or r["url"],
            "description": (r["description"] or "")[:300],
            "lang": r["lang"],
        })
    return {"results": results, "count": count, "match": mode}


def stats() -> dict:
    s = store.read_json(store.STATUS_PATH, {})
    fresh = s.get("updated", 0) > time.time() - 30
    workers = s.get("workers", 0) if fresh and not s.get("paused") else 0
    return {
        "documents": s.get("documents", 0),
        "index_terms": s.get("index_terms", 0),
        "hosts": s.get("hosts", 0),
        "running": bool(workers),
        "crawlers": [{"alive": True, "status": "running"}] * workers,
        "total_crawlers": workers,
        "version": VERSION,
    }


@app.route("/api/search")
def api_search():
    q = (request.args.get("q") or "").strip()[:200]
    try:
        page = max(1, min(20, int(request.args.get("page", 1))))
    except ValueError:
        page = 1
    t0 = time.time()
    out = run_search(q, page) if q else {"results": [], "count": 0}
    out.update(query=q, page=page, took_ms=round((time.time() - t0) * 1000, 1), stats=stats(), suggestion=None)
    return jsonify(out)


@app.route("/api/autocomplete")
def api_autocomplete():
    """Completes the last word from the index vocabulary."""
    q = (request.args.get("q") or "")[:100]
    try:
        limit = max(1, min(10, int(request.args.get("limit", 8))))
    except ValueError:
        limit = 8
    conn = db()
    toks = textnorm.tokens(q)
    if conn is None or not toks or len(toks[-1]) < 2 or q.endswith(" "):
        return jsonify(suggestions=[])
    head, last = toks[:-1], toks[-1]
    rows = conn.execute(
        "SELECT term FROM fts_vocab WHERE term >= ? AND term < ? AND length(term) > ? ORDER BY doc DESC LIMIT ?",
        (last, last + "￿", len(last), limit)).fetchall()
    prefix = " ".join(head)
    return jsonify(suggestions=[{"text": (prefix + " " + r["term"]).strip()} for r in rows])


@app.route("/api/stats")
def api_stats():
    return jsonify(stats())


@app.route("/api/visit", methods=["GET", "POST"])
def api_visit():
    # visits stay in the visitor's browser (history page); nothing is stored here
    return ("", 204)


@app.route("/api/rate", methods=["POST"])
def api_rate():
    return jsonify(ok=False, error="ratings are not part of IFSE Open")


# ── pages ─────────────────────────────────────────────────
_PAGES = {
    "/": "index.html",
    "/search": "search.html",
    "/history": "history.html",
    "/offline": "offline.html",
    "/owner": "owner.html",
}


@app.route("/")
@app.route("/search")
@app.route("/history")
@app.route("/offline")
@app.route("/owner")
def page():
    return design.render_page(STATIC, _PAGES[request.path])


@app.route("/<path:name>")
def static_file(name):
    if not re.fullmatch(r"[\w\-.]+", name):
        return ("", 404)
    if name.endswith(".html") and os.path.isfile(os.path.join(STATIC, name)):
        return design.render_page(STATIC, name)
    return send_from_directory(STATIC, name)


@app.route("/robots.txt")
def robots():
    return ("User-agent: *\nDisallow: /api/\n", 200, {"Content-Type": "text/plain"})


def main():
    host = os.environ.get("IFSE_SEARCH_HOST", "0.0.0.0")
    port = int(os.environ.get("IFSE_SEARCH_PORT", "5000"))
    from waitress import serve
    print(f"[IFSE Open] search {VERSION} on http://{host}:{port}", flush=True)
    serve(app, host=host, port=port, threads=8)


if __name__ == "__main__":
    main()
