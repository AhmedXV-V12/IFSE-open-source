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
| **search** | `5000` (public) | The IFelx search site: home page, results, browsing history (kept in the visitor's browser), the site design, and the JSON API. Reads the index only. |
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
- **Customize my engine** — one design for the whole site, shown to every visitor. The
  owner signs in at `/owner` (with the admin token) and a gear appears in the corner of the
  pages. It opens a design editor:
  - put the search box in one of nine places or drag it anywhere;
  - change the site colours (or pick a preset) and the page background: a colour, a
    gradient, or an uploaded image with dim and blur;
  - set how soft the corners are on the whole site;
  - click **any element** on the page — search box, button, logo, results, side panel,
    bars, footer… — to change its background, text and border colours, its own corner
    softness and opacity, or to delete it (deleted elements can be restored);
  - add shortcut tiles, and pictures placed freely on the page (size, rotation, corners);
  - export / import the design as a JSON file.

  Changes are a live preview until **Save for everyone**. Every value is validated on the
  server before it is stored, and uploaded images are re-checked and stored by hash.

### What it leaves out

IFSE Open ships with **no AI judge and no ready-made blocklists**. It starts with an empty
index and empty filters: what goes in is decided by whoever runs it.

## Run it

```bash
git clone https://github.com/AhmedXV-V12/IFSE-open-source.git
cd IFSE-open-source
./install.sh            # Windows: .\install.ps1
```

The installer asks:

| Question | Choices | Default |
|---|---|---|
| Who can open the search site? | `0.0.0.0` — everyone who can reach the machine (LAN, server, internet) · `127.0.0.1` — this machine only | `0.0.0.0` |
| Search site port | any free port | `5000` |
| Who can open the indexer dashboard? | `127.0.0.1` — this machine only · `0.0.0.0` — every network | `127.0.0.1` |
| Dashboard port | any free port | `5101` |
| Public address (domain) of the site | optional | none |

It writes `.env` with a random admin token, builds, starts, and prints the addresses
(including this machine's LAN addresses) and the token. `--defaults` (`-Defaults` on
Windows) takes every default without asking.

To set it up by hand instead: `cp .env.example .env`, edit it, `docker compose up -d --build`.

- Search: `http://<machine>:5000`
- Customize the site: `http://<machine>:5000/owner` — sign in with the admin token.
- Indexer dashboard: `http://localhost:5101` — sign in with the admin token.

Then open **Crawl → Add sites**, paste a few URLs, and watch them appear in
**Index browser** and in search a few seconds later.

The dashboard controls the index, so it listens on `127.0.0.1` unless you choose
otherwise. To reach it from elsewhere, prefer SSH, a VPN, or a reverse proxy with its own
authentication. If other devices cannot open the search site, allow its port in the
machine's firewall.

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
| `SEARCH_BIND` / `SEARCH_PORT` | `0.0.0.0` / `5000` | Where the search site listens on the machine (Docker) |
| `INDEXER_BIND` / `INDEXER_PORT` | `127.0.0.1` / `5101` | Where the dashboard listens on the machine (Docker) |
| `SEARCH_URL` | empty | The site's public address, for the dashboard's "Customize the site" link |
| `IFSE_ADMIN_TOKEN` | generated | Dashboard and `/owner` password |
| `IFSE_DATA` | `./data` (`/data` in Docker) | Where the index, filters and settings live |
| `IFSE_SITE_DATA` | `./data/site` (`/site` in Docker) | The site design and its uploaded images |
| `IFSE_RATE_PER_MIN` | `120` | API requests per minute per IP on the search service |
| `IFSE_ALLOW_PRIVATE` | off | `1` lets the crawler fetch private addresses (your LAN / intranet). Off, it only fetches public addresses. |
| `IFSE_INDEXER_HOST` / `IFSE_SEARCH_HOST` | `0.0.0.0` | Listen address without Docker |
| `IFSE_INDEXER_PORT` / `IFSE_SEARCH_PORT` | `5101` / `5000` | Ports without Docker |

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
| `GET /api/design` | the published site design |

## Project layout

```
common/    textnorm.py (normalisation, stemming)  store.py (database)  filters.py (rules)
indexer/   app.py (dashboard + admin API)  crawler.py  index.py (every write)  templates/
search/    app.py (site + API)  design.py (site design, owner sign-in, uploads)  static/ (IFelx UI, customize.js)
```

## Releasing

Bump `VERSION` in `indexer/app.py`, `search/app.py` and `search/static/app.js`, the
`?v=` on the pages and the cache name in `sw.js`.

## License

[GNU Affero General Public License v3.0](LICENSE). If you run a modified version as a
network service, you must offer its source to its users.

IFelx, the IFelx name and the iF logo identify the IFelx project.
