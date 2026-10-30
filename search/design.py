"""
design.py - IFSE Open search service
The site design made with "Customize my engine". There is one design and
every visitor sees it; only the owner (the admin token) can change it.

site data (IFSE_SITE_DATA, /site in Docker; the search service's own volume,
since the index volume is read-only here):
  design.json   the published design
  media/        images the owner uploaded (backgrounds, pictures on the page)

Every value is checked here before it is saved: colours must be #rrggbb,
numbers stay in range, links are http(s) or /media/, and element styles are
keyed by part names that customize.js maps to selectors. Nothing the owner
types becomes raw CSS or HTML.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import time

from flask import Blueprint, jsonify, make_response, request, send_from_directory

import store

SITE_DIR = os.environ.get("IFSE_SITE_DATA", os.path.join(store.DATA_DIR, "site"))
DESIGN_PATH = os.path.join(SITE_DIR, "design.json")
MEDIA_DIR = os.path.join(SITE_DIR, "media")
MAX_MEDIA_BYTES = 4 * 1024 * 1024

bp = Blueprint("design", __name__)

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
_PART = re.compile(r"^[a-z0-9-]{1,40}$")
_MEDIA_NAME = re.compile(r"^[0-9a-f]{16}\.(webp|png|jpg|gif)$")
_MAGIC = {b"RIFF": "webp", b"\x89PNG": "png", b"\xff\xd8\xff": "jpg", b"GIF8": "gif"}


# ── owner sign-in ─────────────────────────────────────────
def _admin_token() -> str:
    tok = os.environ.get("IFSE_ADMIN_TOKEN", "").strip()
    if tok:
        return tok
    try:   # written by the indexer on its first start
        with open(os.path.join(store.DATA_DIR, "admin_token"), encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return ""


def _cookie_value(token: str) -> str:
    # the cookie proves the token without carrying it
    return hmac.new(token.encode(), b"ifse-open-owner", hashlib.sha256).hexdigest()


def is_owner() -> bool:
    tok = _admin_token()
    got = request.cookies.get("ifse_owner", "")
    return bool(tok and got) and hmac.compare_digest(got, _cookie_value(tok))


_fails: dict = {}


@bp.route("/api/owner/login", methods=["POST"])
def owner_login():
    ip = request.remote_addr or "?"
    recent = [t for t in _fails.get(ip, []) if t > time.time() - 600]
    if len(recent) >= 8:
        return jsonify(ok=False, error="too many attempts, wait 10 minutes"), 429
    tok = _admin_token()
    given = str((request.get_json(silent=True) or {}).get("token", "")).strip()
    if not tok or not given or not hmac.compare_digest(given, tok):
        _fails[ip] = recent + [time.time()]
        return jsonify(ok=False, error="wrong token"), 403
    resp = make_response(jsonify(ok=True))
    resp.set_cookie("ifse_owner", _cookie_value(tok), httponly=True, samesite="Strict",
                    max_age=30 * 86400, secure=request.is_secure)
    return resp


@bp.route("/api/owner/logout", methods=["POST"])
def owner_logout():
    resp = make_response(jsonify(ok=True))
    resp.delete_cookie("ifse_owner")
    return resp


def _owner_only():
    if not is_owner():
        return jsonify(ok=False, error="owner sign-in required"), 401
    if not request.is_json:
        return jsonify(ok=False, error="JSON body required"), 415
    return None


# ── validation ────────────────────────────────────────────
def _num(v, lo, hi, default):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return default
    v = max(lo, min(hi, v))
    return int(v) if float(v).is_integer() else round(v, 2)


def _color(v, default=None):
    return v if isinstance(v, str) and _HEX.match(v) else default


def _text(v, n):
    return str(v or "").replace("<", "").replace(">", "")[:n]


def _url(v, allow_media=True) -> str:
    v = str(v or "").strip()
    if allow_media and v.startswith("/media/") and _MEDIA_NAME.match(v[7:]):
        return v
    if re.match(r"^https?://[^\s\"'()<>\\]+$", v) and len(v) <= 1000:
        return v
    return ""


def _one(v, choices, default):
    return v if v in choices else default


DEFAULTS = {
    "layout": {"mode": "grid", "v": "middle", "h": "center", "x": 50, "y": 42, "width": 720},
    "colors": {"accent": "#155AB6", "bg": "#090909", "surface": "#1C1C1C", "text": "#FFFFFF"},
    "bg": {"type": "default", "color": "#090909", "c1": "#0b1a33", "c2": "#090909", "angle": 160,
           "image": "", "dim": 35, "blur": 0},
    "radius": 100,
    "font": 100,
    "title": "",
    "subtitle": "",
    "shortcuts": [],
    "images": [],
    "parts": {},
}


def clean(d: dict) -> dict:
    d = d if isinstance(d, dict) else {}
    D = DEFAULTS
    lay, col, bg = d.get("layout") or {}, d.get("colors") or {}, d.get("bg") or {}
    out = {
        "layout": {
            "mode": _one(lay.get("mode"), ("grid", "free"), "grid"),
            "v": _one(lay.get("v"), ("top", "middle", "bottom"), "middle"),
            "h": _one(lay.get("h"), ("start", "center", "end"), "center"),
            "x": _num(lay.get("x"), 0, 100, 50),
            "y": _num(lay.get("y"), 0, 100, 42),
            "width": _num(lay.get("width"), 280, 1400, 720),
        },
        "colors": {k: _color(col.get(k), D["colors"][k]) for k in D["colors"]},
        "bg": {
            "type": _one(bg.get("type"), ("default", "solid", "gradient", "image"), "default"),
            "color": _color(bg.get("color"), D["bg"]["color"]),
            "c1": _color(bg.get("c1"), D["bg"]["c1"]),
            "c2": _color(bg.get("c2"), D["bg"]["c2"]),
            "angle": _num(bg.get("angle"), 0, 360, 160),
            "image": _url(bg.get("image")),
            "dim": _num(bg.get("dim"), 0, 90, 35),
            "blur": _num(bg.get("blur"), 0, 30, 0),
        },
        "radius": _num(d.get("radius"), 0, 300, 100),
        "font": _num(d.get("font"), 80, 140, 100),
        "title": _text(d.get("title"), 60),
        "subtitle": _text(d.get("subtitle"), 100),
        "shortcuts": [],
        "images": [],
        "parts": {},
    }
    for s in (d.get("shortcuts") or [])[:24]:
        u = _url((s or {}).get("url"), allow_media=False)
        if u:
            out["shortcuts"].append({"name": _text(s.get("name"), 40), "url": u})
    for im in (d.get("images") or [])[:20]:
        src = _url((im or {}).get("src"))
        if src:
            out["images"].append({
                "id": re.sub(r"[^a-z0-9]", "", str(im.get("id", "")))[:16] or "i" + str(len(out["images"])),
                "src": src,
                "x": _num(im.get("x"), 0, 100, 50), "y": _num(im.get("y"), 0, 100, 25),
                "w": _num(im.get("w"), 30, 1200, 160), "rot": _num(im.get("rot"), -180, 180, 0),
                "radius": _num(im.get("radius"), 0, 600, 6),
            })
    for key, st in list((d.get("parts") or {}).items())[:80]:
        if not _PART.match(str(key)) or not isinstance(st, dict):
            continue
        p = {}
        for k in ("bg", "text", "border"):
            c = _color(st.get(k))
            if c:
                p[k] = c
        if st.get("radius") is not None:
            p["radius"] = _num(st.get("radius"), 0, 200, 0)
        if st.get("opacity") is not None:
            p["opacity"] = _num(st.get("opacity"), 10, 100, 100)
        if st.get("hidden"):
            p["hidden"] = True
        if p:
            out["parts"][key] = p
    return out


def load() -> dict:
    return clean(store.read_json(DESIGN_PATH, {}))


# ── routes ────────────────────────────────────────────────
@bp.route("/api/design", methods=["GET"])
def design_get():
    return jsonify(ok=True, design=load(), owner=is_owner())


@bp.route("/api/design", methods=["POST"])
def design_save():
    bad = _owner_only()
    if bad:
        return bad
    d = clean((request.get_json(silent=True) or {}).get("design"))
    store.write_json(DESIGN_PATH, d)
    _prune_media(d)
    return jsonify(ok=True, design=d)


@bp.route("/api/design/media", methods=["POST"])
def design_media():
    """An image the editor already resized, as a data: URL. Stored by its hash."""
    bad = _owner_only()
    if bad:
        return bad
    data = str((request.get_json(silent=True) or {}).get("data", ""))
    m = re.match(r"^data:image/[a-z+]+;base64,(.+)$", data, re.S)
    if not m:
        return jsonify(ok=False, error="not an image"), 400
    try:
        raw = base64.b64decode(m.group(1), validate=True)
    except ValueError:
        return jsonify(ok=False, error="bad image data"), 400
    if len(raw) > MAX_MEDIA_BYTES:
        return jsonify(ok=False, error="image larger than 4 MB"), 413
    ext = next((e for magic, e in _MAGIC.items() if raw.startswith(magic)), None)
    if not ext or (ext == "webp" and raw[8:12] != b"WEBP"):
        return jsonify(ok=False, error="only PNG, JPEG, WebP or GIF"), 400
    name = hashlib.sha256(raw).hexdigest()[:16] + "." + ext
    os.makedirs(MEDIA_DIR, exist_ok=True)
    path = os.path.join(MEDIA_DIR, name)
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(raw)
    return jsonify(ok=True, url="/media/" + name)


@bp.route("/media/<name>")
def media(name):
    if not _MEDIA_NAME.match(name):
        return ("", 404)
    resp = send_from_directory(MEDIA_DIR, name, max_age=30 * 86400)
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    return resp


def _prune_media(d: dict) -> None:
    """Uploads that the published design no longer uses go after a day."""
    used = {d["bg"]["image"]} | {im["src"] for im in d["images"]}
    try:
        names = os.listdir(MEDIA_DIR)
    except OSError:
        return
    for n in names:
        p = os.path.join(MEDIA_DIR, n)
        if "/media/" + n not in used and os.path.getmtime(p) < time.time() - 86400:
            try:
                os.remove(p)
            except OSError:
                pass


# ── pages carry the design, so it applies before the first paint ──
_html_cache: dict = {}


def render_page(static_dir: str, name: str):
    path = os.path.join(static_dir, name)
    mtime = os.path.getmtime(path)
    hit = _html_cache.get(name)
    if not hit or hit[0] != mtime:
        with open(path, encoding="utf-8") as f:
            hit = (mtime, f.read())
        _html_cache[name] = hit
    boot = json.dumps({"design": load(), "owner": is_owner()}, ensure_ascii=False).replace("<", "\\u003c")
    html = hit[1].replace("<head>", f"<head>\n<script>window.IFX_BOOT={boot};</script>", 1)
    resp = make_response(html)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    resp.headers["Cache-Control"] = "no-cache, private"
    return resp
