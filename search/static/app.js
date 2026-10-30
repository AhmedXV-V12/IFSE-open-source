/* ═══════════════════════════════════════════════════════════
   IFSE Open v1.0 — shared front-end runtime
   Loaded by every page. All requests stay relative to the
   backend origin; browsing history never leaves the device.
   ══════════════════════════════════════════════════════════ */
(function () {
"use strict";

const API     = "";
const VERSION = "open-1.0";

/* ── Icons ─────────────────────────────────────────────── */
const svg = (d, extra) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ""}>${d}</svg>`;

const ICON = {
    search:  svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    close:   svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    clock:   svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    info:    svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    home:    svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>'),
    more:    svg('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>', ' stroke-width="2.4"'),
    open:    svg('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    copy:    svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>'),
    trash:   svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>'),
    star:    svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    up:      svg('<path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7"/>'),
    down:    svg('<path d="M17 13V4h3v9zM17 13l-4 8a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.7 4H17"/>'),
    check:   svg('<path d="m5 12 5 5L20 7"/>'),
    alert:   svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>'),
    empty:   svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8.5 11h5"/>'),
    wifiOff: svg('<path d="M2 8.8a15 15 0 0 1 4.2-2.6M10 5.1A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 3.4-2M13.6 10.2A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>'),
    reload:  svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
};

/* ── Strings ───────────────────────────────────────────── */
const I18N = {
    ar: {
        dir: "rtl",
        brandSub: "محرك البحث العربي المستقل",
        placeholder: "ابحث في IFelx...",
        search: "بحث",
        clear: "مسح",
        searchBox: "مربع البحث",
        searching: "جاري البحث...",
        suggestions: "اقتراحات البحث",
        history: "السجل",
        historyTitle: "سجل التصفح",
        about: "حول IFelx",
        home: "الرئيسية",
        langTitle: "تغيير اللغة",
        rights: "مفتوح المصدر — AGPL-3.0",
        statsDocs: "وثيقة",
        statsTerms: "مصطلح",
        statsSources: "مصدر",
        crawlerActive: "الزحف نشط",
        crawlerStarting: "الزحف يبدأ",
        crawlerStopped: "الزحف متوقف",
        nodes: n => (n === 1 ? "عقدة" : "عقد"),
        results: (n, q) => `<b>${n}</b> نتيجة لـ «${q}»`,
        seconds: s => `(${s} ث)`,
        resultsHeading: "نتائج البحث",
        asideTitle: "فهرس IFelx",
        asideText: "النتائج من فهرس هذا المحرك. صاحب المحرك يحدد بنفسه ما يدخل الفهرس.",
        recent: "عمليات البحث الأخيرة",
        recentRemove: q => `إزالة «${q}» من عمليات البحث الأخيرة`,
        recentClear: "مسح الكل",
        timeoutTitle: "السيرفر لا يستجيب",
        timeoutHint: "استغرق البحث وقتاً أطول من المعتاد — حاول مرة أخرى",
        offlineHint: "لا يوجد اتصال بالإنترنت على هذا الجهاز",
        searchTitle: q => `${q} — بحث IFelx`,
        searchDesc: q => `نتائج البحث عن «${q}» في محرك IFelx العربي المستقل`,
        noResults: "لا توجد نتائج",
        noResultsHint: "جرّب كلمات بحث مختلفة أو أقصر",
        didYouMean: "هل تقصد",
        startTitle: "ابدأ بحثك",
        startHint: "اكتب كلمة في مربع البحث أعلاه",
        errorTitle: "خطأ في الاتصال",
        errorHint: "تعذّر الوصول إلى السيرفر",
        retry: "إعادة المحاولة",
        crawlingNotice: "الفهرسة جارية في الخلفية — قد تظهر نتائج أكثر قريباً",
        moreActions: "خيارات",
        openNewTab: "فتح في تبويب جديد",
        copyLink: "نسخ الرابط",
        rate: "تقييم",
        rateUp: "موقع جيد",
        rateDown: "موقع سيء",
        removeHistory: "مسح من السجل",
        removed: "تم الحذف من سجل التصفح",
        notInHistory: "هذا الموقع غير موجود في السجل",
        copied: "تم نسخ الرابط",
        rateThanks: "شكراً لتقييمك",
        rateGot: "تم استلام تقييمك",
        rateFail: "تعذّر إرسال التقييم",
        historySub: "محفوظ محلياً على جهازك فقط — لا يُرسل للسيرفر",
        historySearch: "ابحث في السجل...",
        clearAll: "مسح الكل",
        clearConfirm: "هل تريد مسح كامل سجل التصفح؟",
        historyEmpty: "سجل التصفح فارغ",
        historyEmptyHint: "المواقع التي تزورها من نتائج البحث ستظهر هنا",
        historyNoMatch: "لا توجد نتائج مطابقة",
        today: "اليوم",
        yesterday: "أمس",
        items: n => `${n} موقع`,
        deleteItem: "حذف",
        policy: "سياسات الفلترة والفهرسة",
        policyTitle: "سياسات الفلترة والفهرسة",
        policySub: "ما يدخل فهرس IFelx وما يُرفض، ولماذا",
        aboutTitle: "سجل التحديثات",
        aboutSub: "تاريخ تطور IFelx Search Engine — محرك البحث العربي المستقل",
        offlineTitle: "أنت غير متصل بالإنترنت",
    },
    en: {
        dir: "ltr",
        brandSub: "Independent Arabic Search Engine",
        placeholder: "Search IFelx...",
        search: "Search",
        clear: "Clear",
        searchBox: "Search box",
        searching: "Searching...",
        suggestions: "Search suggestions",
        history: "History",
        historyTitle: "Browsing history",
        about: "About IFelx",
        home: "Home",
        langTitle: "Change language",
        rights: "Open source — AGPL-3.0",
        statsDocs: "documents",
        statsTerms: "terms",
        statsSources: "sources",
        crawlerActive: "Crawler active",
        crawlerStarting: "Crawler starting",
        crawlerStopped: "Crawler stopped",
        nodes: n => (n === 1 ? "node" : "nodes"),
        results: (n, q) => `<b>${n}</b> results for “${q}”`,
        seconds: s => `(${s} s)`,
        resultsHeading: "Search results",
        asideTitle: "The IFelx index",
        asideText: "Results come from this engine's own index. Its owner decides what goes in.",
        recent: "Recent searches",
        recentRemove: q => `Remove “${q}” from recent searches`,
        recentClear: "Clear all",
        timeoutTitle: "The server is not responding",
        timeoutHint: "The search took longer than usual — try again",
        offlineHint: "This device has no internet connection",
        searchTitle: q => `${q} — IFelx Search`,
        searchDesc: q => `Search results for “${q}” on IFelx, the independent Arabic search engine`,
        noResults: "No results found",
        noResultsHint: "Try different or shorter keywords",
        didYouMean: "Did you mean",
        startTitle: "Start searching",
        startHint: "Type a word in the search box above",
        errorTitle: "Connection error",
        errorHint: "Could not reach the server",
        retry: "Try again",
        crawlingNotice: "Indexing is running in the background — more results may appear soon",
        moreActions: "Options",
        openNewTab: "Open in new tab",
        copyLink: "Copy link",
        rate: "Rate",
        rateUp: "Good site",
        rateDown: "Bad site",
        removeHistory: "Remove from history",
        removed: "Removed from browsing history",
        notInHistory: "This site is not in your history",
        copied: "Link copied",
        rateThanks: "Thanks for your rating",
        rateGot: "Your rating was received",
        rateFail: "Could not send your rating",
        historySub: "Stored on this device only — never sent to the server",
        historySearch: "Search history...",
        clearAll: "Clear all",
        clearConfirm: "Clear your entire browsing history?",
        historyEmpty: "Your history is empty",
        historyEmptyHint: "Sites you open from search results will show up here",
        historyNoMatch: "No matching entries",
        today: "Today",
        yesterday: "Yesterday",
        items: n => `${n} ${n === 1 ? "site" : "sites"}`,
        deleteItem: "Delete",
        policy: "Filtering & indexing policy",
        policyTitle: "Filtering & indexing policy",
        policySub: "What enters the IFelx index, what is rejected, and why",
        aboutTitle: "Changelog",
        aboutSub: "How IFelx Search Engine — the independent Arabic search engine — evolved",
        offlineTitle: "You are offline",
    },
};

/* ── Storage (every access guarded: private mode can throw) ── */
const store = {
    get(k, fallback) {
        try { const v = localStorage.getItem(k); return v === null ? fallback : v; }
        catch { return fallback; }
    },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Strict`;
}

/* ── Helpers ───────────────────────────────────────────── */
function esc(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

const fmt = n => Number(n || 0).toLocaleString("en-US");

function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function pathOf(url) {
    try {
        const u = new URL(url);
        const p = (u.pathname + u.search).replace(/\/$/, "");
        return p ? decodeURI(p).split("/").filter(Boolean).join(" › ") : "";
    } catch { return ""; }
}

/* ── Query highlighting ────────────────────────────────── */
/* Folds a character the way a reader would match it: case, Arabic diacritics
   and tatweel dropped, alef/yaa/taa-marbuta forms unified (the engine's own
   tokenizer treats them as the same word). "" = skip this character. */
const AR_FOLD = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ئ": "ي", "ة": "ه", "ؤ": "و" };
function foldChar(c) {
    if (/[ً-ٰٟـ]/.test(c)) return "";
    return AR_FOLD[c] || c.toLowerCase();
}

/* folded copy of `text` plus, for every folded char, its index in `text` */
function foldMap(text) {
    let s = "";
    const at = [];
    for (let i = 0; i < text.length; i++) {
        const f = foldChar(text[i]);
        for (const ch of f) { s += ch; at.push(i); }
    }
    return { s, at };
}

function queryTerms(query) {
    const seen = new Set();
    return String(query || "").split(/[\s,.;:!?؟،"'«»()\[\]{}|\/\\]+/)
        .map(w => foldMap(w).s)
        .filter(w => w.length >= 2 && !seen.has(w) && seen.add(w))
        .sort((a, b) => b.length - a.length);
}

/* escaped `text` with every query term wrapped in <mark> */
function highlight(text, terms) {
    text = String(text ?? "");
    if (!terms || !terms.length || !text) return esc(text);
    const { s, at } = foldMap(text);
    const hit = new Uint8Array(text.length);
    for (const term of terms) {
        for (let i = s.indexOf(term); i !== -1; i = s.indexOf(term, i + term.length)) {
            const from = at[i], to = at[i + term.length - 1];
            for (let k = from; k <= to; k++) hit[k] = 1;
        }
    }
    let out = "", open = false;
    for (let i = 0; i < text.length; i++) {
        if (hit[i] && !open) { out += "<mark>"; open = true; }
        if (!hit[i] && open) { out += "</mark>"; open = false; }
        out += esc(text[i]);
    }
    return open ? out + "</mark>" : out;
}

/* ── Network: every API call gives up after a timeout ──── */
async function fetchJSON(url, opts) {
    const o = Object.assign({ timeout: 15000 }, opts);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), o.timeout);
    if (o.signal) o.signal.addEventListener("abort", () => ctrl.abort(o.signal.reason), { once: true });
    try {
        const res = await fetch(url, Object.assign({}, o, { signal: ctrl.signal }));
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

/* favicon tile with a letter fallback when the icon fails to load */
function favicon(domain) {
    const d = String(domain || "").replace(/^www\./, "");
    const letter = esc((d.match(/[a-z0-9؀-ۿ]/i) || ["•"])[0]);
    if (!d) return `<span class="ifx-favicon" aria-hidden="true">${letter}</span>`;
    return `<span class="ifx-favicon" aria-hidden="true" data-letter="${letter}">` +
           `<img src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico" alt="" loading="lazy" decoding="async"></span>`;
}

/* inline onerror is avoided; broken favicons are swapped for their letter here */
document.addEventListener("error", e => {
    const img = e.target;
    if (img.tagName === "IMG" && img.parentElement && img.parentElement.classList.contains("ifx-favicon")) {
        img.parentElement.textContent = img.parentElement.dataset.letter || "•";
    }
}, true);

/* ── Language ──────────────────────────────────────────── */
function lang() { return store.get("ifse_lang", "ar") === "en" ? "en" : "ar"; }
function t(key, ...args) {
    const v = I18N[lang()][key];
    return typeof v === "function" ? v(...args) : (v ?? key);
}

const langListeners = [];

function applyLang() {
    const l = lang();
    const root = document.documentElement;
    root.lang = l;
    root.dir  = I18N[l].dir;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
        el.title = t(el.dataset.i18nTitle);
        el.setAttribute("aria-label", t(el.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-i18n-label]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
    // the accessible name starts with the visible "EN"/"AR" (WCAG 2.5.3, label in name)
    document.querySelectorAll("[data-lang-toggle]").forEach(el => {
        const label = l === "ar" ? "EN" : "AR";
        el.textContent = label;
        el.lang = l === "ar" ? "en" : "ar";
        el.setAttribute("aria-label", `${label} — ${t("langTitle")}`);
    });
    langListeners.forEach(fn => fn(l));
}

function onLang(fn) { langListeners.push(fn); }

document.addEventListener("click", e => {
    if (e.target.closest("[data-lang-toggle]")) {
        store.set("ifse_lang", lang() === "ar" ? "en" : "ar");
        applyLang();
    }
});

/* ── Recent searches (localStorage only, never sent anywhere) ──
   Up to 2.7 they lived in cookies (ifse_history + an ifse_uid id) that the
   browser sent with every request although the server never read them; they
   are moved here once and the cookies are deleted. */
const RECENT_KEY = "ifse_recent";
const RECENT_MAX = 20;

const recent = {
    all() {
        try { const v = JSON.parse(store.get(RECENT_KEY, "[]")); return Array.isArray(v) ? v.filter(q => typeof q === "string") : []; }
        catch { return []; }
    },
    save(list) { store.set(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); },
    add(query) { recent.save([query, ...recent.all().filter(q => q !== query)]); },
    remove(query) { recent.save(recent.all().filter(q => q !== query)); },
    clear() { recent.save([]); },
};

(function migrateCookies() {
    const old = getCookie("ifse_history");
    if (old !== null) {
        try {
            const list = JSON.parse(old);
            if (Array.isArray(list) && !recent.all().length) recent.save(list.filter(q => typeof q === "string"));
        } catch {}
    }
    for (const name of ["ifse_history", "ifse_uid"]) {
        if (getCookie(name) !== null) setCookie(name, "", -1);
    }
})();

/* ── Visit history (localStorage only, never sent anywhere) ── */
const HISTORY_KEY = "ifse_visit_history";
const HISTORY_MAX = 200;

const visits = {
    all() {
        try { return JSON.parse(store.get(HISTORY_KEY, "[]")) || []; } catch { return []; }
    },
    save(list) { store.set(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX))); },
    add(url, title, domain) {
        const h = visits.all().filter(e => e.url !== url);
        h.unshift({ url, title: title || "", domain: domain || "", visited_at: Date.now() });
        visits.save(h);
    },
    remove(url) {
        const before = visits.all();
        const after  = before.filter(e => e.url !== url);
        visits.save(after);
        return before.length !== after.length;
    },
    clear() { visits.save([]); },
};

function trackVisit(url, title, domain) {
    fetch(`${API}/api/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        keepalive: true,
    }).catch(() => {});
    visits.add(url, title, domain);
}

/* ── Toast ─────────────────────────────────────────────── */
function toast(msg, icon) {
    let el = document.getElementById("ifxToast");
    if (!el) {
        el = document.createElement("div");
        el.id = "ifxToast";
        el.className = "ifx-toast";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        document.body.appendChild(el);
    }
    el.innerHTML = (ICON[icon || "check"] || "") + `<span>${esc(msg)}</span>`;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ── Context menu (right-click, long-press or the ⋯ button) ── */
let menuTarget = null;
let menuOpener = null;

function buildMenu() {
    let menu = document.getElementById("ifxMenu");
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = "ifxMenu";
    menu.className = "ifx-menu";
    menu.setAttribute("role", "menu");
    document.body.appendChild(menu);

    menu.addEventListener("click", async e => {
        const btn = e.target.closest("[data-act]");
        if (!btn || !menuTarget) return;
        const tgt = menuTarget;
        const act = btn.dataset.act;
        closeMenu();
        if (act === "open") {
            trackVisit(tgt.url, tgt.title, tgt.domain);
            window.open(tgt.url, "_blank", "noopener,noreferrer");
        } else if (act === "copy") {
            try { await navigator.clipboard.writeText(tgt.url); toast(t("copied")); }
            catch { toast(tgt.url, "info"); }
        } else if (act === "up" || act === "down") {
            rate(tgt.url, act);
        } else if (act === "remove") {
            const ok = visits.remove(tgt.url);
            toast(ok ? t("removed") : t("notInHistory"), ok ? "check" : "info");
            if (ok && typeof tgt.onRemoved === "function") tgt.onRemoved();
        }
    });
    return menu;
}

function renderMenu(menu, tgt) {
    menu.innerHTML = `
        <div class="ifx-menu-head">${esc(tgt.domain || hostOf(tgt.url))}</div>
        <button type="button" class="ifx-menu-item" role="menuitem" data-act="open">${ICON.open}<span>${t("openNewTab")}</span></button>
        <button type="button" class="ifx-menu-item" role="menuitem" data-act="copy">${ICON.copy}<span>${t("copyLink")}</span></button>
        <div class="ifx-menu-sep"></div>
        <div class="ifx-menu-rate">
            <span>${ICON.star}${t("rate")}</span>
            <span class="ifx-menu-rate-btns">
                <button type="button" role="menuitem" data-act="up" title="${t("rateUp")}" aria-label="${t("rateUp")}">${ICON.up}</button>
                <button type="button" role="menuitem" data-act="down" title="${t("rateDown")}" aria-label="${t("rateDown")}">${ICON.down}</button>
            </span>
        </div>
        <div class="ifx-menu-sep"></div>
        <button type="button" class="ifx-menu-item ifx-menu-item--danger" role="menuitem" data-act="remove">${ICON.trash}<span>${t("removeHistory")}</span></button>`;
}

function openMenu(x, y, target, opener) {
    const menu = buildMenu();
    closeMenu();
    menuTarget = target;
    menuOpener = opener || null;
    renderMenu(menu, target);
    menu.classList.add("open");
    if (menuOpener) menuOpener.setAttribute("aria-expanded", "true");
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth  - r.width  - 8)) + "px";
    menu.style.top  = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + "px";
    const first = menu.querySelector("[data-act]");
    if (first && opener) first.focus({ preventScroll: true });
}

function closeMenu() {
    const menu = document.getElementById("ifxMenu");
    if (menu) menu.classList.remove("open");
    if (menuOpener) menuOpener.setAttribute("aria-expanded", "false");
    menuTarget = null;
    menuOpener = null;
}

/* attach menu behaviour to an element that represents a site */
function bindMenu(el, target, moreBtn) {
    el.addEventListener("contextmenu", e => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, target);
    });
    if (moreBtn) {
        moreBtn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            if (menuOpener === moreBtn) { closeMenu(); return; }
            const r = moreBtn.getBoundingClientRect();
            const rtl = document.documentElement.dir === "rtl";
            openMenu(rtl ? r.left : r.right - 220, r.bottom + 6, target, moreBtn);
        });
    }
}

document.addEventListener("click", e => {
    const menu = document.getElementById("ifxMenu");
    if (menu && menu.classList.contains("open") && !menu.contains(e.target)) closeMenu();
});
window.addEventListener("scroll", closeMenu, { passive: true, capture: true });
window.addEventListener("resize", closeMenu);
window.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

async function rate(url, rating) {
    try {
        const res = await fetch(`${API}/api/rate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, rating }),
        });
        const data = await res.json();
        toast(data.ok ? (rating === "up" ? t("rateThanks") : t("rateGot")) : t("rateFail"), data.ok ? "check" : "alert");
    } catch {
        toast(t("rateFail"), "alert");
    }
}

/* ── Search box: clear button, "/" shortcut, autocomplete ── */
function setupSearch(root, onSubmit, opts) {
    const o     = Object.assign({ autocomplete: true, remember: true }, opts);
    const input = root.querySelector(".ifx-search-input");
    const clear = root.querySelector(".ifx-search-clear");
    const btn   = root.querySelector(".ifx-search-btn");
    const drop  = root.querySelector(".ifx-ac");

    let timer = null, ctrl = null, idx = -1, items = [], typed = "";

    const sync = () => root.classList.toggle("has-value", input.value.length > 0);

    function close() {
        if (!drop) return;
        drop.classList.remove("open");
        drop.innerHTML = "";
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        idx = -1;
        items = [];
    }

    function setActive(i) {
        idx = i;
        drop.querySelectorAll(".ifx-ac-item").forEach((el, n) => {
            el.classList.toggle("active", n === idx);
            el.setAttribute("aria-selected", String(n === idx));
        });
        if (idx >= 0) {
            input.value = items[idx].text;
            input.setAttribute("aria-activedescendant", `${drop.id}-${idx}`);
        } else {
            input.value = typed;
            input.removeAttribute("aria-activedescendant");
        }
        sync();
    }

    function submit(q) {
        const query = (q ?? input.value).trim();
        if (!query) { input.focus(); return; }
        close();
        if (o.remember) recent.add(query);
        onSubmit(query);
    }

    async function fetchAC(prefix) {
        if (ctrl) ctrl.abort();
        ctrl = new AbortController();
        try {
            const data = await fetchJSON(`${API}/api/autocomplete?q=${encodeURIComponent(prefix)}&limit=8`, { signal: ctrl.signal, timeout: 8000 });
            return data.suggestions || [];
        } catch (e) {
            if (e.name !== "AbortError") console.warn("[IFelx AC]", e);
            return null;
        }
    }

    function show(html) {
        drop.innerHTML = html;
        drop.classList.add("open");
        input.setAttribute("aria-expanded", "true");
    }

    function render(list, prefix) {
        if (!list || !list.length || document.activeElement !== input) { close(); return; }
        items = list;
        idx = -1;
        const terms = queryTerms(prefix);
        show(list.map((s, i) =>
            `<div class="ifx-ac-item" role="option" aria-selected="false" id="${drop.id}-${i}" data-i="${i}">${ICON.search}<span dir="auto">${highlight(s.text, terms)}</span></div>`
        ).join(""));
    }

    /* empty box + focus: the searches made on this device */
    function renderRecent() {
        const list = o.remember ? recent.all().slice(0, 8) : [];
        if (!list.length || document.activeElement !== input) { close(); return; }
        items = list.map(text => ({ text }));
        idx = -1;
        show(
            `<div class="ifx-ac-head" aria-hidden="true"><span>${esc(t("recent"))}</span>` +
            `<button type="button" class="ifx-ac-clear" data-recent-clear tabindex="-1">${esc(t("recentClear"))}</button></div>` +
            list.map((q, i) =>
                `<div class="ifx-ac-item ifx-ac-item--recent" role="option" aria-selected="false" id="${drop.id}-${i}" data-i="${i}">${ICON.clock}<span dir="auto">${esc(q)}</span>` +
                `<button type="button" class="ifx-ac-remove" data-recent-remove="${i}" tabindex="-1" aria-label="${esc(t("recentRemove", q))}" title="${esc(t("recentRemove", q))}">${ICON.close}</button></div>`
            ).join(""));
    }

    input.addEventListener("input", () => {
        sync();
        typed = input.value;
        if (!o.autocomplete || !drop) return;
        const val = input.value.trim();
        clearTimeout(timer);
        if (!val) { renderRecent(); return; }
        if (val.length < 2) { close(); return; }
        timer = setTimeout(async () => {
            const list = await fetchAC(val);
            if (list !== null && input.value.trim() === val) render(list, val);
        }, 250);
    });

    /* recent searches open on a click or ArrowDown, not on the autofocus at page load */
    if (drop && o.autocomplete) {
        input.addEventListener("click", () => {
            if (!input.value.trim() && !drop.classList.contains("open")) renderRecent();
        });
    }

    input.addEventListener("keydown", e => {
        const open = drop && drop.classList.contains("open");
        if (e.key === "ArrowDown" && !open && drop && o.autocomplete && !input.value.trim()) {
            e.preventDefault();
            renderRecent();
        } else if (e.key === "ArrowDown" && open) {
            e.preventDefault();
            setActive(Math.min(idx + 1, items.length - 1));
        } else if (e.key === "ArrowUp" && open) {
            e.preventDefault();
            setActive(Math.max(idx - 1, -1));
        } else if (e.key === "Delete" && open && idx >= 0 && drop.querySelector(".ifx-ac-item--recent")) {
            // Delete removes the highlighted recent search
            e.preventDefault();
            recent.remove(items[idx].text);
            input.value = typed;
            renderRecent();
        } else if (e.key === "Enter") {
            e.preventDefault();
            submit();
        } else if (e.key === "Escape") {
            if (open) { e.stopPropagation(); setActive(-1); close(); }
            else input.blur();
        }
    });

    if (drop) {
        drop.addEventListener("mousedown", e => e.preventDefault());   // keep focus in the input
        drop.addEventListener("click", e => {
            const rm = e.target.closest("[data-recent-remove]");
            if (rm) { recent.remove(items[+rm.dataset.recentRemove].text); renderRecent(); return; }
            if (e.target.closest("[data-recent-clear]")) { recent.clear(); close(); return; }
            const it = e.target.closest(".ifx-ac-item");
            if (!it) return;
            const item = items[+it.dataset.i];
            if (item) { input.value = item.text; submit(item.text); }
        });
    }

    input.addEventListener("blur", () => setTimeout(close, 120));

    if (clear) clear.addEventListener("click", () => {
        input.value = "";
        typed = "";
        sync();
        close();
        input.focus();
        if (typeof o.onClear === "function") o.onClear();
    });

    if (btn) btn.addEventListener("click", () => submit());

    sync();
    return { input, submit, close, sync };
}

/* "/" focuses the first search box on the page */
document.addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement && document.activeElement.isContentEditable)) return;
    const input = document.querySelector(".ifx-search-input");
    if (input) { e.preventDefault(); input.focus(); input.select(); }
});

/* ── Top bar shadow once the page scrolls ──────────────── */
function watchTopbar() {
    const bar = document.querySelector(".ifx-topbar");
    if (!bar) return;
    const upd = () => bar.classList.toggle("is-scrolled", window.scrollY > 4);
    window.addEventListener("scroll", upd, { passive: true });
    upd();
}

/* ── Index stats ───────────────────────────────────────── */
function fetchStats() {
    return fetchJSON(`${API}/api/stats`, { timeout: 10000 });
}

/* What is really crawling. /api/stats counts a built-in crawler as active
   while it is alive, even when it is disabled; since 2.6 the crawling is done
   by secondary nodes (the phone), reported under "nodes". */
function crawlState(s) {
    // /api/search sends index counts only: no crawler fields means "unknown", not "stopped"
    if (!s || !("running" in s || "nodes" in s || "crawlers" in s)) return { kind: "unknown" };
    const own = Array.isArray(s.crawlers)
        ? s.crawlers.filter(c => c.alive && c.status !== "disabled").length
        : (s.active_crawlers || 0);
    const nodes = (s.nodes && s.nodes.online) || 0;
    if (own > 0) return { kind: "own", n: own, total: s.total_crawlers || own };
    if (nodes > 0) return { kind: "nodes", n: nodes };
    return { kind: s.running ? "starting" : "stopped" };
}

function statsHtml(s) {
    if (!s) return "";
    const c = crawlState(s);
    const crawler =
        c.kind === "own"   ? `<span class="ifx-dot is-live"></span>${t("crawlerActive")} <b class="ifx-ltr">${fmt(c.n)}/${fmt(c.total)}</b>` :
        c.kind === "nodes" ? `<span class="ifx-dot is-live"></span>${t("crawlerActive")} <b class="ifx-ltr">${fmt(c.n)}</b> ${t("nodes", c.n)}` :
        c.kind === "starting" ? `<span class="ifx-dot is-warm"></span>${t("crawlerStarting")}` :
        c.kind === "stopped"  ? `<span class="ifx-dot"></span>${t("crawlerStopped")}` : "";
    let html =
        `<span class="ifx-stat"><b>${fmt(s.documents)}</b>${t("statsDocs")}</span>` +
        `<span class="ifx-stat"><b>${fmt(s.index_terms)}</b>${t("statsTerms")}</span>`;
    if ((s.sources || 1) > 1) html += `<span class="ifx-stat"><b>${fmt(s.sources)}</b>${t("statsSources")}</span>`;
    return crawler ? html + `<span class="ifx-stat">${crawler}</span>` : html;
}

/* ── Service worker ────────────────────────────────────── */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

window.IFX = {
    API, VERSION, ICON, I18N,
    esc, fmt, hostOf, pathOf, favicon,
    queryTerms, highlight, fetchJSON,
    lang, t, applyLang, onLang,
    visits, recent, trackVisit, toast,
    openMenu, closeMenu, bindMenu,
    setupSearch, watchTopbar,
    fetchStats, statsHtml, crawlState,
};
})();
