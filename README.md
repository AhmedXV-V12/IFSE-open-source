<p align="center"><img src="search/static/logow-352.webp" width="96" alt="IFelx logo"></p>

<h1 align="center">IFSE Open</h1>

<p align="center">
The open-source edition of <b>IFelx Search Engine</b> — a search engine and its indexer that you run yourself.<br>
النسخة مفتوحة المصدر من محرك بحث IFelx — محرك بحث ومفهرس تشغّلهم بنفسك.
</p>

<p align="center">
<a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-155AB6"></a>
<img alt="Docker" src="https://img.shields.io/badge/run%20with-Docker-155AB6">
</p>

---

## What it is

Two services in one repository, sharing one index:

| Service | Port | What it does |
|---|---|---|
| **search** | `5000` (public) | The IFelx search site: home page, results, changelog, browsing history (kept in the visitor's browser), and the JSON API. Reads the index only. |
| **indexer** | `5101` (private) | Crawler + indexer + the owner's dashboard: add sites, write indexing filters, browse the index, read the index log. The only writer of the index. |

The index is a single SQLite database with full-text search (FTS5), with Arabic
normalisation (أ/إ/آ → ا, ة → ه, ى → ي, tashkeel removed) and light Arabic stemming
(للمبتدئين finds مبتدئ), applied the same way to pages and to queries.

### What IFSE Open adds

- **Indexing filters you write yourself** — block or allow by host, URL text, URL regex,
  path prefix, word in the page, word in the title, or language; minimum words, maximum
  page size, allowed languages, and an allowlist-only mode. Test any URL against them,
  preview which indexed pages they would remove, then remove them.
- **Index browser** — every indexed page: search, filter by host and language, sort, see a
  page's text and history, remove or re-crawl it, or remove a whole site and block it.
- **Index log** — every page added, updated, filtered out or removed, and every change to
  filters and settings, with its time and reason (kept 90 days).
- **Changelog page** — `/about` lists every release; add a new entry on top for each one.
- **Customize my engine** — the gear in the corner of the home page opens a design editor:
  put the search box in one of nine places or drag it anywhere, change colours (or pick a
  preset), set a background colour, gradient or image, add shortcut tiles and images on the
  page, show or hide parts of the page, and export / import the design as a JSON file.
  The design is saved in the visitor's browser.

### What it leaves out

IFSE Open ships with **no AI judge and no ready-made blocklists**. It starts with an empty
index and empty filters: what goes in is decided by whoever runs it.

## Run it

```bash
git clone https://github.com/ahmedxv-v12/ifse-open.git
cd ifse-open
cp .env.example .env        # set IFSE_ADMIN_TOKEN to a long random string
docker compose up -d --build
```

- Search: <http://localhost:5000>
- Indexer dashboard: <http://127.0.0.1:5101> — sign in with `IFSE_ADMIN_TOKEN`.
  Left empty, a token is generated on first start; read it with
  `docker compose exec indexer cat /data/admin_token`.

Then open **Crawl → Add sites**, paste a few URLs, and watch them appear in
**Index browser** and in search a few seconds later.

The dashboard port is bound to `127.0.0.1` on purpose. Reach it over SSH, a VPN, or a
reverse proxy with its own authentication — never publish it as is.

### Without Docker

```bash
pip install -r requirements.txt
python indexer/app.py      # terminal 1
python search/app.py       # terminal 2
```

Data goes to `./data` (or `IFSE_DATA`).

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `IFSE_ADMIN_TOKEN` | generated | Dashboard password |
| `IFSE_DATA` | `./data` (`/data` in Docker) | Where the index, filters and settings live |
| `IFSE_RATE_PER_MIN` | `120` | API requests per minute per IP on the search service |
| `IFSE_ALLOW_PRIVATE` | off | `1` lets the crawler fetch private addresses (your LAN / intranet). Off, it only fetches public addresses. |
| `IFSE_INDEXER_PORT` / `IFSE_SEARCH_PORT` | `5101` / `5000` | Ports |

Crawler settings (workers, delay per host, depth, pages per host, following other sites,
user agent) are edited in the dashboard and saved to `data/settings.json`; filters are in
`data/filters.json`.

## How filtering decides

1. A matching **allow** rule always wins.
2. A matching **block** rule keeps the page out.
3. With **allowlist only** on, a page that no allow rule matches is kept out.
4. Then the limits: allowed languages, minimum words, maximum size.

URL rules (host, URL text, regex, path) run before a page is downloaded. Word and
language rules run after it is fetched, before it is written. New rules only stop new
pages — use **Apply filters to the index** to clean what is already there.

The crawler always respects `robots.txt`, `noindex` and `nofollow`, waits between pages
of one host, and follows redirects through the queue so every target meets the filters.

## API

| Route | Returns |
|---|---|
| `GET /api/search?q=…&page=1` | `{results:[{url,title,description,lang}], count, took_ms, stats}` |
| `GET /api/autocomplete?q=…` | `{suggestions:[{text}]}` |
| `GET /api/stats` | documents, terms, sites, crawler state |

## Project layout

```
common/    textnorm.py (normalisation, stemming)  store.py (database)  filters.py (rules)
indexer/   app.py (dashboard + admin API)  crawler.py  index.py (every write)  templates/
search/    app.py (site + API)  static/ (IFelx UI, customize.js, about.html changelog)
```

## Releasing

Bump `VERSION` in `indexer/app.py`, `search/app.py` and `search/static/app.js`, the
`?v=` on the pages, the cache name in `sw.js`, and add an entry on top of
`search/static/about.html`. Never edit a published entry.

## License

[GNU Affero General Public License v3.0](LICENSE). If you run a modified version as a
network service, you must offer its source to its users.

IFelx, the IFelx name and the iF logo identify the IFelx project.
