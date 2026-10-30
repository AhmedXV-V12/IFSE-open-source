"""
textnorm.py - IFSE Open
One normalization for the indexer and the search service, so a page and a
query always meet on the same spelling.

- NFKC folds Arabic presentation forms and full-width Latin
- ؤ and ئ become ء, so مسؤول and مسئول are one word
- NFKD + dropping combining marks strips tashkeel and Latin accents and turns
  أ إ آ into ا
- ٱ -> ا, ى -> ي, ة -> ه, tatweel removed, Arabic-Indic digits -> 0-9
"""

import re
import unicodedata

_AR_LETTERS = "ء-غف-يٮ-ٯٱ-ۓەۮ-ۯۺ-ۼۿ"
_TOKEN_RE = re.compile(f"[{_AR_LETTERS}]+|[a-z0-9]+")
_AR_CHARS = re.compile(r"[؀-ۿ]")
_EN_CHARS = re.compile(r"[a-zA-Z]")

_HAMZA_SEATS = str.maketrans({"ؤ": "ء", "ئ": "ء"})
_CHAR_MAP = str.maketrans({
    "ٱ": "ا",
    "ى": "ي",
    "ة": "ه",
    "ـ": None,
    **{chr(0x0660 + i): str(i) for i in range(10)},
    **{chr(0x06F0 + i): str(i) for i in range(10)},
})

MAX_TOKEN_LEN = 64


def normalize(text: str) -> str:
    """Lower-cased, accent-free, Arabic-unified text. Separators are kept."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text).casefold().translate(_HAMZA_SEATS)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text.translate(_CHAR_MAP)


def tokens(text: str) -> list:
    return [t for t in _TOKEN_RE.findall(normalize(text)) if len(t) <= MAX_TOKEN_LEN]


# light Arabic stemming: attached prefixes and the commonest plural endings,
# never cutting a word below 3 letters (للمبتدئين -> مبتدء, والكتب -> كتب)
_AR_PREFIXES = ("وال", "بال", "كال", "فال", "لل", "ال", "و")
_AR_SUFFIXES = ("ات", "ون", "ين", "ان")
_AR_WORD = re.compile(f"^[{_AR_LETTERS}]+$")


def light_stem(tok: str) -> str:
    if not _AR_WORD.match(tok):
        return tok
    for p in _AR_PREFIXES:
        if tok.startswith(p) and len(tok) - len(p) >= 3:
            tok = tok[len(p):]
            break
    for s in _AR_SUFFIXES:
        if tok.endswith(s) and len(tok) - len(s) >= 3:
            tok = tok[:-len(s)]
            break
    return tok


def index_text(text: str) -> str:
    """What goes into the full-text index: every normalized token, followed by
    its light stem when that differs, so either spelling of a query finds it."""
    out = []
    for t in tokens(text):
        out.append(t)
        s = light_stem(t)
        if s != t:
            out.append(s)
    return " ".join(out)


def host_text(host: str) -> str:
    """example.co.uk -> 'example' plus the full host, without www."""
    host = (host or "").lower()
    if host.startswith("www."):
        host = host[4:]
    parts = host.split(".")
    return " ".join(tokens(" ".join(parts[:-1]) if len(parts) > 1 else host))


def detect_lang(text: str) -> str:
    if not text:
        return "mixed"
    ar = len(_AR_CHARS.findall(text))
    en = len(_EN_CHARS.findall(text))
    total = ar + en
    if total == 0:
        return "mixed"
    ratio = ar / total
    if ratio > 0.6:
        return "ar"
    if ratio < 0.3:
        return "en"
    return "mixed"
