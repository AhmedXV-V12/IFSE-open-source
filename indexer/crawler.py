"""
crawler.py - IFSE Open indexer
Fetches pages from the frontier, applies the owner's filters, and hands the
pages to index.py. One host is fetched by one worker at a time, with a delay
between its pages; robots.txt is always respected.
"""

import ipaddress
import os
import re
import socket
import threading
import time
import urllib.robotparser
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup

import filters
import index
import store
import textnorm

SETTINGS_DEFAULTS = {
    "workers": 4,
    "per_host_delay": 1.0,
    "max_depth": 2,
    "max_pages_per_host": 50,
    "follow_external": False,
    "request_timeout": 8,
    "body_chars": 6000,
    "user_agent": "IFSE-Open/1.0 (+https://github.com/ahmedxv-v12/ifse-open)",
    "paused": False,
}

_SKIP_EXT = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".pdf", ".zip", ".rar", ".7z",
             ".gz", ".tar", ".mp3", ".mp4", ".avi", ".mkv", ".mov", ".webm", ".exe", ".dmg", ".apk",
             ".iso", ".css", ".js", ".json", ".xml", ".woff", ".woff2", ".ttf")


def load_settings() -> dict:
    s = dict(SETTINGS_DEFAULTS)
    s.update({k: v for k, v in store.read_json(store.SETTINGS_PATH, {}).items() if k in SETTINGS_DEFAULTS})
    return s


def save_settings(new: dict) -> dict:
    s = load_settings()
    for k, default in SETTINGS_DEFAULTS.items():
        if k not in new:
            continue
        v = new[k]
        try:
            s[k] = type(default)(v) if not isinstance(default, bool) else bool(v)
        except (TypeError, ValueError):
            pass
    s["workers"] = max(1, min(32, s["workers"]))
    s["per_host_delay"] = max(0.5, s["per_host_delay"])
    s["max_depth"] = max(0, min(10, s["max_depth"]))
    s["max_pages_per_host"] = max(1, s["max_pages_per_host"])
    store.write_json(store.SETTINGS_PATH, s)
    return s


# ── URLs ──────────────────────────────────────────────────
def clean_url(url: str, base: str = "") -> str | None:
    try:
        url = urljoin(base, url.strip()) if base else url.strip()
        p = urlsplit(url)
    except ValueError:
        return None
    if p.scheme not in ("http", "https") or not p.hostname:
        return None
    if p.path.lower().endswith(_SKIP_EXT):
        return None
    host = p.hostname.lower()
    netloc = host if not p.port or p.port in (80, 443) else f"{host}:{p.port}"
    return urlunsplit((p.scheme, netloc, p.path or "/", p.query, ""))


# IFSE_ALLOW_PRIVATE=1 lets the crawler index your own LAN / intranet sites
ALLOW_PRIVATE = os.environ.get("IFSE_ALLOW_PRIVATE", "") == "1"


def _public_host(host: str) -> bool:
    """Never fetch the machine's own network (SSRF): every address must be public."""
    if ALLOW_PRIVATE:
        return True
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            return False
    return True


# ── robots.txt ────────────────────────────────────────────
_robots: dict = {}
_robots_lock = threading.Lock()
ROBOTS_TTL = 6 * 3600


def allowed_by_robots(url: str, agent: str, session: requests.Session) -> bool:
    p = urlsplit(url)
    key = f"{p.scheme}://{p.netloc}"
    with _robots_lock:
        hit = _robots.get(key)
    if not hit or hit[1] < time.time():
        rp = urllib.robotparser.RobotFileParser()
        try:
            r = session.get(key + "/robots.txt", timeout=8, headers={"User-Agent": agent})
            if r.status_code >= 500:
                rp.disallow_all = True
            elif r.status_code >= 400:
                rp.allow_all = True
            else:
                rp.parse(r.text.splitlines())
        except requests.RequestException:
            rp.allow_all = True
        hit = (rp, time.time() + ROBOTS_TTL)
        with _robots_lock:
            _robots[key] = hit
    return hit[0].can_fetch(agent, url)


# ── parsing ───────────────────────────────────────────────
_META_CHARSET = re.compile(rb"""<meta[^>]+charset=["']?([\w-]+)""", re.I)


def decode(raw: bytes, ctype: str) -> str:
    """Header charset, then <meta charset>, then UTF-8, then cp1256 (old Arabic
    sites). requests' ISO-8859-1 default for text/html would garble Arabic."""
    m = re.search(r"charset=([\w-]+)", ctype, re.I)
    candidates = [m.group(1)] if m else []
    m = _META_CHARSET.search(raw[:4096])
    if m:
        candidates.append(m.group(1).decode("ascii", "ignore"))
    for enc in candidates + ["utf-8"]:
        try:
            return raw.decode(enc)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("cp1256", errors="replace")



def parse(url: str, html: str, body_chars: int) -> tuple[dict, list]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "template", "svg", "iframe"]):
        tag.decompose()
    robots_meta = soup.find("meta", attrs={"name": lambda v: v and v.lower() == "robots"})
    rules = (robots_meta.get("content") or "").lower() if robots_meta else ""

    title = (soup.title.get_text(" ", strip=True) if soup.title else "")[:300]
    desc_tag = soup.find("meta", attrs={"name": lambda v: v and v.lower() == "description"}) \
        or soup.find("meta", attrs={"property": "og:description"})
    description = ((desc_tag.get("content") or "") if desc_tag else "").strip()[:500]
    headings = " · ".join(h.get_text(" ", strip=True) for h in soup.find_all(["h1", "h2", "h3"])[:20])[:1000]

    links = []
    if "nofollow" not in rules:
        for a in soup.find_all("a", href=True):
            if (a.get("rel") and "nofollow" in a.get("rel")):
                continue
            u = clean_url(a["href"], url)
            if u:
                links.append(u)

    body = " ".join(soup.get_text(" ", strip=True).split())
    page = {
        "url": url,
        "host": (urlsplit(url).hostname or "").lower(),
        "title": title,
        "description": description or body[:240],
        "headings": headings,
        "body": body[:body_chars],
        "words": len(body.split()),
        "lang": textnorm.detect_lang(title + " " + body[:2000]),
        "noindex": "noindex" in rules,
    }
    return page, links


# ── workers ───────────────────────────────────────────────
class Crawler:
    def __init__(self):
        self.stop_event = threading.Event()
        self.threads: list = []
        self.busy: set = set()
        self.ready_at: dict = {}
        self.lock = threading.Lock()
        self.fetched = 0
        self.errors = 0
        self.filtered = 0
        self.current: dict = {}
        self.filters = filters.Compiled()
        self.filters_mtime = 0.0
        self.settings = load_settings()

    def reload(self):
        self.settings = load_settings()
        self.filters = filters.Compiled()

    def running(self) -> int:
        return sum(1 for t in self.threads if t.is_alive())

    def start(self):
        self.stop_event.clear()
        self.threads = [t for t in self.threads if t.is_alive()]
        want = self.settings["workers"]
        while len(self.threads) < want:
            t = threading.Thread(target=self._worker, name=f"crawler-{len(self.threads) + 1}", daemon=True)
            t.start()
            self.threads.append(t)

    def stop(self):
        self.stop_event.set()

    def _next(self):
        with self.lock:
            job = index.claim(self.busy, self.ready_at)
            if job:
                self.busy.add(job["host"])
            return job

    def _release(self, host: str):
        with self.lock:
            self.busy.discard(host)
            self.ready_at[host] = time.time() + self.settings["per_host_delay"]

    def _worker(self):
        session = requests.Session()
        name = threading.current_thread().name
        while not self.stop_event.is_set():
            if self.settings.get("paused"):
                self.stop_event.wait(2)
                continue
            job = self._next()
            if not job:
                self.current.pop(name, None)
                self.stop_event.wait(1.5)
                continue
            self.current[name] = job["url"]
            try:
                self._crawl(session, job)
            except Exception as e:  # one bad page never kills a worker
                self.errors += 1
                index.set_state(job["url"], 3, f"error: {e}"[:200])
            finally:
                self._release(job["host"])
        self.current.pop(name, None)

    def _crawl(self, session: requests.Session, job: dict):
        s = self.settings
        url, depth = job["url"], job["depth"]
        ok, why = self.filters.check_url(url)
        if not ok:
            self.filtered += 1
            index.set_state(url, 4, why)
            index.log("filtered", url, why)
            return
        host = job["host"]
        if not _public_host(host):
            index.set_state(url, 3, "not a public address")
            return
        agent = s["user_agent"]
        if not allowed_by_robots(url, agent, session):
            index.set_state(url, 4, "robots.txt")
            return

        max_bytes = max(64, self.filters.max_page_kb or 2048) * 1024
        # redirects are not followed here: the target goes back through the
        # frontier, so it meets the filters, robots.txt and the address check
        try:
            r = session.get(url, timeout=s["request_timeout"], stream=True, allow_redirects=False,
                            headers={"User-Agent": agent, "Accept": "text/html,application/xhtml+xml",
                                     "Accept-Language": "ar,en;q=0.8"})
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError) as e:
            # a site typed without a scheme got https://; try plain http once
            if depth == 0 and url.startswith("https://"):
                index.set_state(url, 3, "no https, trying http")
                index.enqueue(["http://" + url[8:]], 0, "seed")
                return
            raise e
        try:
            if r.is_redirect:
                target = clean_url(r.headers.get("Location", ""), url)
                index.set_state(url, 2, f"redirect -> {target}"[:200])
                if target and target != url:
                    index.enqueue([target], depth)
                return
            ctype = r.headers.get("Content-Type", "")
            if r.status_code != 200 or "html" not in ctype:
                index.set_state(url, 3, f"HTTP {r.status_code} {ctype[:40]}")
                return
            final = url
            raw = b""
            for chunk in r.iter_content(65536):
                raw += chunk
                if len(raw) > max_bytes:
                    index.set_state(url, 4, f"larger than {max_bytes // 1024} KB")
                    self.filtered += 1
                    return
            html = decode(raw, ctype)
        finally:
            r.close()

        page, links = parse(final, html, s["body_chars"])
        page["depth"] = depth
        page["size_kb"] = max(1, len(raw) // 1024)
        self.fetched += 1
        if page.pop("noindex"):
            index.set_state(url, 4, "meta noindex")
        else:
            ok, why = self.filters.check_page(page)
            if ok:
                index.upsert_page(page)
                index.set_state(url, 2)
            else:
                self.filtered += 1
                index.set_state(url, 4, why)
                index.log("filtered", final, why)

        if depth < s["max_depth"]:
            self._follow(host, links, depth + 1)

    def _follow(self, host: str, links: list, depth: int):
        s = self.settings
        root = host.removeprefix("www.")
        keep, seen = [], set()
        for u in links:
            if u in seen:
                continue
            seen.add(u)
            h = (urlsplit(u).hostname or "").lower()
            same = h == host or h.removeprefix("www.") == root or h.endswith("." + root)
            if not same and not s["follow_external"]:
                continue
            keep.append(u)
            if len(keep) >= 60:
                break
        budget = s["max_pages_per_host"] - index.host_load(host)
        local = [u for u in keep if (urlsplit(u).hostname or "").lower() == host][:max(0, budget)]
        other = [u for u in keep if (urlsplit(u).hostname or "").lower() != host]
        index.enqueue(local, depth)
        for u in other:
            if index.host_load((urlsplit(u).hostname or "").lower()) < s["max_pages_per_host"]:
                index.enqueue([u], depth)

    def status(self) -> dict:
        return {
            "running": self.running() > 0 and not self.stop_event.is_set(),
            "paused": bool(self.settings.get("paused")),
            "workers": self.running(),
            "fetched": self.fetched,
            "errors": self.errors,
            "filtered": self.filtered,
            "current": sorted(self.current.values()),
        }
