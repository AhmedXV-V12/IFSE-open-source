"""
filters.py - IFSE Open
Indexing filters the owner writes by hand in the dashboard. IFSE Open ships
with none: no blocklist, no AI judge. What enters the index is the owner's
call, made with these rules.

A rule:
  {"id": "f_ab12", "type": "...", "value": "...", "action": "block"|"allow",
   "enabled": true, "note": "", "created": 1730000000}

Types
  host          the host and every subdomain (example.com blocks a.example.com)
  url_contains  a piece of text anywhere in the URL
  url_regex     a regular expression over the URL
  path_prefix   URLs whose path starts with this (/tag/, /search)
  keyword       a whole word in the title, description, headings or text
  title_word    a whole word in the title only
  lang          the page language: ar, en or mixed

Order of decisions
  1. a matching "allow" rule always wins over "block" rules
  2. a matching "block" rule keeps the page out
  3. allowlist_only: when on, a page passes only if an allow rule matches
  4. limits: min_words, max_page_kb, allowed_langs

URL rules run before a page is fetched (nothing is downloaded for a blocked
URL); content rules run after, before the page is written.
"""

import re
import secrets
import time
from urllib.parse import urlsplit

import store
import textnorm

TYPES = ("host", "url_contains", "url_regex", "path_prefix", "keyword", "title_word", "lang")
URL_TYPES = ("host", "url_contains", "url_regex", "path_prefix")

DEFAULTS = {
    "rules": [],
    "allowlist_only": False,
    "min_words": 0,
    "max_page_kb": 2048,
    "allowed_langs": [],          # empty = every language
}


def load() -> dict:
    data = store.read_json(store.FILTERS_PATH, {})
    out = dict(DEFAULTS)
    out.update({k: v for k, v in data.items() if k in DEFAULTS})
    return out


def save(data: dict) -> None:
    store.write_json(store.FILTERS_PATH, data)


def validate_rule(rule: dict) -> tuple[dict | None, str]:
    rtype = str(rule.get("type", "")).strip()
    value = str(rule.get("value", "")).strip()
    action = str(rule.get("action", "block")).strip()
    if rtype not in TYPES:
        return None, "unknown type"
    if action not in ("block", "allow"):
        return None, "action must be block or allow"
    if not value or len(value) > 500:
        return None, "value is empty or too long"
    if rtype == "url_regex":
        try:
            re.compile(value)
        except re.error as e:
            return None, f"bad regex: {e}"
    if rtype == "host":
        value = value.lower().removeprefix("http://").removeprefix("https://").split("/")[0].removeprefix("www.")
    if rtype == "lang" and value not in ("ar", "en", "mixed"):
        return None, "lang must be ar, en or mixed"
    if rtype in ("keyword", "title_word"):
        value = textnorm.normalize(value)
    return {
        "id": rule.get("id") or "f_" + secrets.token_hex(4),
        "type": rtype,
        "value": value,
        "action": action,
        "enabled": bool(rule.get("enabled", True)),
        "note": str(rule.get("note", ""))[:200],
        "created": rule.get("created") or int(time.time()),
    }, ""


class Compiled:
    """Rules prepared once; check_url / check_page run on every page."""

    def __init__(self, data: dict | None = None):
        data = data or load()
        self.data = data
        self.allowlist_only = bool(data.get("allowlist_only"))
        self.min_words = int(data.get("min_words") or 0)
        self.max_page_kb = int(data.get("max_page_kb") or 0)
        self.allowed_langs = set(data.get("allowed_langs") or [])
        self.rules = []
        for r in data.get("rules", []):
            if not r.get("enabled", True):
                continue
            r = dict(r)
            if r["type"] == "url_regex":
                r["_re"] = re.compile(r["value"], re.I)
            elif r["type"] in ("keyword", "title_word"):
                words = textnorm.tokens(r["value"])
                r["_words"] = words
            self.rules.append(r)
        self.has_allow = any(r["action"] == "allow" for r in self.rules)

    # ── single rule ─────────────────────────────────────────
    @staticmethod
    def _match_url(r: dict, url: str, host: str, path: str) -> bool:
        t, v = r["type"], r["value"]
        if t == "host":
            return host == v or host.endswith("." + v)
        if t == "url_contains":
            return v.lower() in url.lower()
        if t == "url_regex":
            return bool(r["_re"].search(url))
        if t == "path_prefix":
            return path.startswith(v if v.startswith("/") else "/" + v)
        return False

    @staticmethod
    def _match_page(r: dict, page: dict, tok_all: set, tok_title: set) -> bool:
        t = r["type"]
        if t == "lang":
            return page.get("lang") == r["value"]
        words = r.get("_words") or []
        if not words:
            return False
        pool = tok_title if t == "title_word" else tok_all
        return all(w in pool for w in words)

    # ── decisions ───────────────────────────────────────────
    def _decide(self, matches: list, final: bool) -> tuple[bool, str]:
        allow = [r for r in matches if r["action"] == "allow"]
        if allow:
            return True, ""
        block = [r for r in matches if r["action"] == "block"]
        if block:
            r = block[0]
            return False, f"{r['id']} {r['type']}={r['value']}"
        if final and self.allowlist_only and self.has_allow:
            return False, "allowlist_only"
        return True, ""

    def check_url(self, url: str) -> tuple[bool, str]:
        """Before fetching. Content rules cannot be judged yet, so an
        allowlist decision waits for check_page unless only URL allow rules exist."""
        parts = urlsplit(url)
        host = (parts.hostname or "").lower().removeprefix("www.")
        path = parts.path or "/"
        matches = [r for r in self.rules if r["type"] in URL_TYPES and self._match_url(r, url, host, path)]
        only_url_allows = all(r["type"] in URL_TYPES for r in self.rules if r["action"] == "allow")
        return self._decide(matches, final=only_url_allows)

    def check_page(self, page: dict) -> tuple[bool, str]:
        """After fetching: every rule plus the limits."""
        url = page["url"]
        parts = urlsplit(url)
        host = (parts.hostname or "").lower().removeprefix("www.")
        path = parts.path or "/"
        tok_title = set(textnorm.tokens(page.get("title", "")))
        tok_all = tok_title | set(textnorm.tokens(" ".join(
            (page.get("description", ""), page.get("headings", ""), page.get("body", "")))))
        matches = []
        for r in self.rules:
            if r["type"] in URL_TYPES:
                if self._match_url(r, url, host, path):
                    matches.append(r)
            elif self._match_page(r, page, tok_all, tok_title):
                matches.append(r)
        ok, why = self._decide(matches, final=True)
        if not ok:
            return ok, why
        if any(r["action"] == "allow" for r in matches):
            return True, ""
        if self.allowed_langs and page.get("lang") not in self.allowed_langs:
            return False, f"lang {page.get('lang')} not allowed"
        if self.min_words and int(page.get("words") or 0) < self.min_words:
            return False, f"fewer than {self.min_words} words"
        if self.max_page_kb and int(page.get("size_kb") or 0) > self.max_page_kb:
            return False, f"larger than {self.max_page_kb} KB"
        return True, ""
