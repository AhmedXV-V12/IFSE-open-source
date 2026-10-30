/* ═══════════════════════════════════════════════════════════
   IFSE Open v1.1 — Customize my engine
   One site design, saved on the server (search/design.py) and shown to
   every visitor. The page arrives with it in window.IFX_BOOT, so it applies
   before the first paint. Only the owner (signed in at /owner) sees the gear:
   it opens a design editor with
     - the search box in one of nine spots, or dragged anywhere
     - colours, presets, page background (colour, gradient, image)
     - corner softness for the whole site
     - any element: click it to change its background, text and border
       colours, its corner softness and opacity, or to delete it
     - shortcuts and pictures placed on the home page
   Changes are a preview until "Save for everyone".
   This file is loaded in <head>: the theme applies at once, the rest when
   the page is parsed.
   ══════════════════════════════════════════════════════════ */
(function () {
"use strict";

const BOOT = window.IFX_BOOT || {};
const OWNER = !!BOOT.owner;

const DEFAULTS = {
    layout:  { mode: "grid", v: "middle", h: "center", x: 50, y: 42, width: 720 },
    colors:  { accent: "#155AB6", bg: "#090909", surface: "#1C1C1C", text: "#FFFFFF" },
    bg:      { type: "default", color: "#090909", c1: "#0b1a33", c2: "#090909", angle: 160, image: "", dim: 35, blur: 0 },
    radius:  100,
    font:    100,
    title:   "",
    subtitle: "",
    shortcuts: [],
    images:  [],
    parts:   {},
};

const PRESETS = {
    ifelx:   { accent: "#155AB6", bg: "#090909", surface: "#1C1C1C", text: "#FFFFFF" },
    emerald: { accent: "#12946B", bg: "#07110D", surface: "#13201A", text: "#F2FFF9" },
    sunset:  { accent: "#E0663A", bg: "#140B08", surface: "#24150F", text: "#FFF6F2" },
    violet:  { accent: "#7C4DDB", bg: "#0C0913", surface: "#1B1626", text: "#F7F3FF" },
    light:   { accent: "#155AB6", bg: "#F4F6F9", surface: "#FFFFFF", text: "#111418" },
};

/* Every element the owner can style or delete. The server stores styles by
   these keys only, so nothing typed in the editor becomes CSS. */
const PARTS = {
    "home-bar":     { sel: ".ifx-home-bar", ar: "شريط الصفحة الرئيسية", en: "Home top bar" },
    "topbar":       { sel: ".ifx-topbar", ar: "الشريط العلوي", en: "Top bar" },
    "brand":        { sel: ".ifx-brand", ar: "شعار الشريط العلوي", en: "Top bar logo" },
    "chips":        { sel: ".ifx-chip", ar: "أزرار الشريط", en: "Bar buttons" },
    "logo":         { sel: ".ifx-lockup-logo", ar: "الشعار", en: "Logo" },
    "title":        { sel: ".ifx-hero-name", ar: "اسم المحرك", en: "Engine name" },
    "subtitle":     { sel: ".ifx-hero-sub", ar: "السطر تحت الاسم", en: "Line under the name" },
    "searchbox":    { sel: ".ifx-search-box", ar: "مربع البحث", en: "Search box" },
    "searchbtn":    { sel: ".ifx-search-btn", ar: "زر البحث", en: "Search button" },
    "suggest":      { sel: ".ifx-ac", ar: "قائمة الاقتراحات", en: "Suggestions" },
    "stats":        { sel: ".ifx-stats", ar: "إحصاءات الفهرس", en: "Index stats" },
    "shortcuts":    { sel: ".ifxc-shortcuts", ar: "صف الاختصارات", en: "Shortcut row" },
    "tile":         { sel: ".ifxc-tile", ar: "الاختصار", en: "Shortcut" },
    "tile-icon":    { sel: ".ifxc-tile-icon", ar: "أيقونة الاختصار", en: "Shortcut icon" },
    "meta":         { sel: ".ifx-meta", ar: "سطر عدد النتائج", en: "Result count line" },
    "notice":       { sel: ".ifx-notice", ar: "التنبيه", en: "Notice" },
    "result":       { sel: ".ifx-result", ar: "النتيجة", en: "Result" },
    "result-src":   { sel: ".ifx-result-src", ar: "مصدر النتيجة", en: "Result source" },
    "result-title": { sel: ".ifx-result-title", ar: "عنوان النتيجة", en: "Result title" },
    "result-desc":  { sel: ".ifx-result-desc", ar: "وصف النتيجة", en: "Result text" },
    "aside":        { sel: ".ifx-panel", ar: "اللوحة الجانبية", en: "Side panel" },
    "state":        { sel: ".ifx-state", ar: "رسالة الصفحة", en: "Page message" },
    "footer":       { sel: ".ifx-footer", ar: "التذييل", en: "Footer" },
    "version":      { sel: ".ifx-version", ar: "رقم الإصدار", en: "Version badge" },
};
const PART_SELS = Object.entries(PARTS);

const TXT = {
    ar: {
        open: "خصّص محركك", title: "Customize my engine", close: "إغلاق",
        tLayout: "المكان", tColors: "الألوان", tBg: "الخلفية", tEl: "العناصر", tShort: "الاختصارات", tImg: "الصور", tFile: "ملف",
        place: "مكان مربع البحث", free: "سحب حر", freeHint: "اسحب علامة الأسهم فوق مربع البحث لأي مكان في الصفحة.",
        width: "عرض مربع البحث", presets: "ألوان جاهزة", accent: "اللون الأساسي", bgc: "لون الصفحة", surface: "لون الصناديق", text: "لون النص",
        radius: "نعومة الحواف في الموقع كله", font: "حجم الخط",
        bgType: "خلفية الصفحة", bgDefault: "IFelx", bgSolid: "لون", bgGrad: "تدرّج", bgImage: "صورة",
        color1: "اللون الأول", color2: "اللون الثاني", angle: "الزاوية", upload: "ارفع صورة", orUrl: "أو رابط صورة", dim: "تعتيم", blur: "تمويه",
        pickHint: "اضغط على أي عنصر في الصفحة لتغيير ألوانه ونعومة حوافه أو حذفه.",
        elBg: "الخلفية", elText: "النص", elBorder: "الإطار", elRadius: "نعومة الحواف", elOpacity: "الشفافية", unset: "الأصلي",
        elDelete: "حذف العنصر", elReset: "رجّع العنصر لأصله", deleted: "عناصر محذوفة", restore: "إرجاع", none: "مفيش",
        customTitle: "اسم مخصص للمحرك", customSub: "سطر مخصص تحت الاسم",
        name: "الاسم", url: "الرابط", add: "إضافة", noShort: "مفيش اختصارات لسه.", up: "لفوق", down: "لتحت", remove: "حذف",
        addImg: "ضيف صورة على الصفحة", imgHint: "الصور بتظهر في الصفحة الرئيسية؛ اسحبها من مكانها وغيّر حجمها من الركن.", noImg: "مفيش صور لسه.",
        size: "الحجم", rotate: "الدوران",
        export: "تصدير التصميم", import: "استيراد تصميم", reset: "رجوع لتصميم IFelx", resetAsk: "ترجع للتصميم الأصلي؟ (مش هيتحفظ غير لما تضغط حفظ)",
        save: "حفظ للجميع", discard: "تجاهل التغييرات", saved: "اتحفظ — كل الزوار هيشوفوا التصميم ده", saving: "بيتحفظ…",
        unsaved: "فيه تغييرات لسه ما اتحفظتش", allSaved: "التصميم المحفوظ هو اللي ظاهر للزوار",
        signout: "خروج", uploadFail: "الصورة ما اترفعتش", badFile: "الملف ده مش تصميم IFSE", saveFail: "الحفظ فشل",
    },
    en: {
        open: "Customize my engine", title: "Customize my engine", close: "Close",
        tLayout: "Layout", tColors: "Colours", tBg: "Background", tEl: "Elements", tShort: "Shortcuts", tImg: "Images", tFile: "File",
        place: "Search box position", free: "Free drag", freeHint: "Drag the arrows handle above the search box anywhere on the page.",
        width: "Search box width", presets: "Presets", accent: "Accent", bgc: "Page", surface: "Surfaces", text: "Text",
        radius: "Corner softness, whole site", font: "Text size",
        bgType: "Page background", bgDefault: "IFelx", bgSolid: "Colour", bgGrad: "Gradient", bgImage: "Image",
        color1: "First colour", color2: "Second colour", angle: "Angle", upload: "Upload an image", orUrl: "or an image URL", dim: "Dim", blur: "Blur",
        pickHint: "Click any element on the page to change its colours and corners, or to delete it.",
        elBg: "Background", elText: "Text", elBorder: "Border", elRadius: "Corner softness", elOpacity: "Opacity", unset: "Original",
        elDelete: "Delete element", elReset: "Reset element", deleted: "Deleted elements", restore: "Restore", none: "None",
        customTitle: "Custom engine name", customSub: "Custom line under the name",
        name: "Name", url: "URL", add: "Add", noShort: "No shortcuts yet.", up: "Up", down: "Down", remove: "Remove",
        addImg: "Add an image to the page", imgHint: "Images show on the home page; drag one to move it and use its corner to resize.", noImg: "No images yet.",
        size: "Size", rotate: "Rotation",
        export: "Export design", import: "Import design", reset: "Back to the IFelx design", resetAsk: "Go back to the original design? (Nothing is saved until you press Save)",
        save: "Save for everyone", discard: "Discard changes", saved: "Saved — every visitor now sees this design", saving: "Saving…",
        unsaved: "You have unsaved changes", allSaved: "Visitors see the saved design",
        signout: "Sign out", uploadFail: "The image was not uploaded", badFile: "That file is not an IFSE design", saveFail: "Saving failed",
    },
};
const L = () => (document.documentElement.lang === "en" ? TXT.en : TXT.ar);
const isEn = () => document.documentElement.lang === "en";

/* ── state ─────────────────────────────────────────────── */
function merge(base, over) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    if (!over || typeof over !== "object") return out;
    for (const k of Object.keys(base)) {
        if (!(k in over)) continue;
        const b = base[k], o = over[k];
        if (Array.isArray(b)) out[k] = Array.isArray(o) ? o : b;
        else if (k === "parts") out[k] = (o && typeof o === "object") ? o : {};
        else if (b && typeof b === "object") out[k] = merge(b, o);
        else if (typeof o === typeof b) out[k] = o;
    }
    return out;
}
const clone = o => JSON.parse(JSON.stringify(o));

let published = merge(DEFAULTS, BOOT.design || {});
let S = clone(published);
const dirty = () => JSON.stringify(S) !== JSON.stringify(published);

function toast(msg, icon) {
    if (window.IFX && IFX.toast) IFX.toast(msg, icon || "check");
}

/* ── colour helpers ────────────────────────────────────── */
function rgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return [21, 90, 182];
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
const rgba = (hex, a) => `rgba(${rgb(hex).join(",")},${a})`;
function mix(hex, other, t) {
    const a = rgb(hex), b = rgb(other);
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function luminance(hex) {
    const c = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const HEX = /^#[0-9a-f]{6}$/i;

/* ── theme (runs in <head>) ────────────────────────────── */
function styleTag(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("style");
        el.id = id;
        (document.head || document.documentElement).appendChild(el);
    }
    return el;
}

function applyTheme() {
    const c = S.colors, root = document.documentElement.style;
    const light = luminance(c.bg) > 0.5;
    const set = (k, v) => root.setProperty(k, v);
    set("--accent", c.accent);
    set("--accent-hi", mix(c.accent, "#ffffff", 0.12));
    set("--accent-text", light ? mix(c.accent, "#000000", 0.15) : mix(c.accent, "#ffffff", 0.45));
    set("--accent-soft", rgba(c.accent, 0.16));
    set("--accent-line", rgba(c.accent, 0.40));
    set("--accent-glow", rgba(c.accent, 0.28));
    set("--bg", c.bg);
    set("--surface", c.surface);
    set("--surface-2", mix(c.surface, c.bg, 0.5));
    set("--surface-3", mix(c.surface, c.text, 0.06));
    set("--text", c.text);
    set("--text-2", rgba(c.text, 0.78));
    set("--text-3", rgba(c.text, light ? 0.68 : 0.60));
    set("--text-4", rgba(c.text, light ? 0.58 : 0.48));
    set("--line", rgba(c.text, 0.07));
    set("--line-2", rgba(c.text, 0.12));
    set("--line-3", rgba(c.text, 0.24));
    set("color-scheme", light ? "light" : "dark");
    set("--ifxc-radius", S.radius / 100);
    root.fontSize = S.font === 100 ? "" : S.font + "%";
    document.documentElement.classList.toggle("ifxc-radius", S.radius !== 100);
    document.documentElement.classList.toggle("ifxc-custom-bg", S.bg.type !== "default");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = c.bg;
    applyParts();
    applyBackground();
}

function applyParts() {
    const rules = [];
    for (const [key, st] of Object.entries(S.parts || {})) {
        const p = PARTS[key];
        if (!p) continue;
        const sel = p.sel;
        if (st.hidden) { rules.push(`${sel}{display:none!important}`); continue; }
        const d = [];
        if (HEX.test(st.bg || "")) d.push(`background:${st.bg}!important`);
        if (HEX.test(st.border || "")) d.push(`border:1px solid ${st.border}!important`);
        if (typeof st.radius === "number") d.push(`border-radius:${st.radius}px!important`, "overflow:hidden");
        if (typeof st.opacity === "number") d.push(`opacity:${st.opacity / 100}!important`);
        if (d.length) rules.push(`${sel}{${d.join(";")}}`);
        if (HEX.test(st.text || "")) rules.push(`${sel},${sel} *{color:${st.text}!important}`);
    }
    styleTag("ifxc-parts").textContent = rules.join("\n");
}

let bgLayer = null;

function applyBackground() {
    const b = S.bg, c = S.colors;
    if (b.type === "default") { if (bgLayer) bgLayer.hidden = true; return; }
    if (!document.body) return;     // again on DOMContentLoaded
    if (!bgLayer) {
        bgLayer = document.createElement("div");
        bgLayer.className = "ifxc-bg";
        bgLayer.setAttribute("aria-hidden", "true");
        bgLayer.innerHTML = `<div class="ifxc-bg-img"></div><div class="ifxc-bg-dim"></div>`;
        document.body.prepend(bgLayer);
    }
    bgLayer.hidden = false;
    const img = bgLayer.firstElementChild, dim = bgLayer.lastElementChild;
    img.style.filter = b.blur ? `blur(${b.blur}px)` : "";
    img.style.inset = b.blur ? `-${b.blur * 2}px` : "0";
    dim.style.background = "transparent";
    if (b.type === "solid") img.style.background = b.color;
    else if (b.type === "gradient") img.style.background = `linear-gradient(${b.angle}deg, ${b.c1}, ${b.c2})`;
    else if (b.type === "image") {
        img.style.background = b.image ? `center / cover no-repeat url("${b.image.replace(/["\\()]/g, "")}")` : c.bg;
        dim.style.background = `rgba(0,0,0,${b.dim / 100})`;
    }
}

applyTheme();

/* ── home page: layout, name, shortcuts, pictures ──────── */
let HOME = false;

function safeUrl(u) {
    try {
        const url = new URL(/^[a-z]+:\/\//i.test(u) ? u : "https://" + u);
        return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch { return ""; }
}

function applyHome() {
    if (!HOME) return;
    const main = document.querySelector(".ifx-home-main");
    const hero = document.querySelector(".ifx-home-hero");
    if (!main || !hero) return;
    const lay = S.layout;
    const V = { top: "flex-start", middle: "center", bottom: "flex-end" };
    const H = { start: "flex-start", center: "center", end: "flex-end" };
    document.body.classList.add("ifxc-home");
    document.body.classList.toggle("ifxc-free", lay.mode === "free");
    main.style.setProperty("--ifxc-v", V[lay.v] || "center");
    main.style.setProperty("--ifxc-h", H[lay.h] || "center");
    hero.style.setProperty("--ifxc-w", lay.width + "px");
    hero.style.setProperty("--ifxc-x", lay.x + "%");
    hero.style.setProperty("--ifxc-y", lay.y + "%");

    const name = document.querySelector(".ifx-hero-name");
    if (name) {
        if (!name.dataset.orig) name.dataset.orig = name.textContent;
        name.textContent = S.title.trim() || name.dataset.orig;
    }
    const sub = document.querySelector(".ifx-hero-sub");
    if (sub) {
        if (S.subtitle.trim()) { sub.textContent = S.subtitle.trim(); sub.removeAttribute("data-i18n"); sub.dataset.ifxcSub = "1"; }
        else if (sub.dataset.ifxcSub) { sub.setAttribute("data-i18n", "brandSub"); delete sub.dataset.ifxcSub; if (window.IFX) IFX.applyLang(); }
    }
    renderShortcuts(hero);
    renderImages();
}

function renderShortcuts(hero) {
    let box = document.querySelector(".ifxc-shortcuts");
    if (!S.shortcuts.length) { if (box) box.remove(); return; }
    if (!box) {
        box = document.createElement("nav");
        box.className = "ifxc-shortcuts";
        box.setAttribute("aria-label", "Shortcuts");
        hero.insertBefore(box, hero.querySelector("#statsRow"));
    }
    box.innerHTML = "";
    for (const s of S.shortcuts) {
        const url = safeUrl(s.url);
        if (!url) continue;
        const host = new URL(url).hostname;
        const a = document.createElement("a");
        a.className = "ifxc-tile";
        a.href = url;
        a.rel = "noopener noreferrer";
        const icon = document.createElement("span");
        icon.className = "ifxc-tile-icon";
        icon.textContent = (s.name || host).trim().charAt(0).toUpperCase();
        const img = new Image();
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.onload = () => { icon.textContent = ""; icon.appendChild(img); };
        img.src = new URL(url).origin + "/favicon.ico";
        const label = document.createElement("span");
        label.className = "ifxc-tile-name";
        label.dir = "auto";
        label.textContent = s.name || host;
        a.append(icon, label);
        box.appendChild(a);
    }
}

let imgLayer = null;

function renderImages() {
    if (!imgLayer) {
        imgLayer = document.createElement("div");
        imgLayer.className = "ifxc-images";
        document.body.appendChild(imgLayer);
    }
    imgLayer.innerHTML = "";
    for (const im of S.images) {
        const el = document.createElement("div");
        el.className = "ifxc-sticker";
        el.style.left = im.x + "%";
        el.style.top = im.y + "%";
        el.style.width = im.w + "px";
        el.style.transform = `translate(-50%,-50%) rotate(${im.rot || 0}deg)`;
        const img = document.createElement("img");
        img.src = im.src;
        img.alt = "";
        img.draggable = false;
        img.referrerPolicy = "no-referrer";
        img.style.borderRadius = (im.radius ?? 6) + "px";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "ifxc-sticker-del";
        del.setAttribute("aria-label", L().remove);
        del.textContent = "×";
        del.addEventListener("click", e => {
            e.stopPropagation();
            S.images = S.images.filter(x => x !== im);
            changed();
        });
        const grip = document.createElement("span");
        grip.className = "ifxc-sticker-grip";
        el.append(img, del, grip);
        imgLayer.appendChild(el);
        if (OWNER) dragSticker(el, im, grip);
    }
}

/* ── editing (owner only) ──────────────────────────────── */
const editing = () => document.body.classList.contains("ifxc-editing");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function dragSticker(el, im, grip) {
    el.addEventListener("pointerdown", e => {
        if (!editing() || e.target.closest(".ifxc-sticker-del")) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const resizing = e.target === grip;
        const start = { x: e.clientX, y: e.clientY, w: im.w, px: im.x, py: im.y };
        const move = ev => {
            if (resizing) {
                im.w = Math.round(clamp(start.w + (ev.clientX - start.x) * (document.dir === "rtl" ? -1 : 1) * 2, 30, 1200));
                el.style.width = im.w + "px";
            } else {
                im.x = +clamp(start.px + (ev.clientX - start.x) / innerWidth * 100, 0, 100).toFixed(2);
                im.y = +clamp(start.py + (ev.clientY - start.y) / innerHeight * 100, 0, 100).toFixed(2);
                el.style.left = im.x + "%";
                el.style.top = im.y + "%";
            }
        };
        const up = () => { el.removeEventListener("pointermove", move); changed(false); };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up, { once: true });
        el.addEventListener("pointercancel", up, { once: true });
    });
}

function dragHero() {
    const hero = document.querySelector(".ifx-home-hero");
    const main = document.querySelector(".ifx-home-main");
    if (!hero || !main) return;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "ifxc-handle";
    handle.setAttribute("aria-label", L().free);
    handle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>`;
    hero.appendChild(handle);
    handle.addEventListener("pointerdown", e => {
        if (!editing()) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        const r = main.getBoundingClientRect();
        if (S.layout.mode !== "free") {
            const hr = hero.getBoundingClientRect();
            S.layout.x = +((hr.left + hr.width / 2 - r.left) / r.width * 100).toFixed(2);
            S.layout.y = +((hr.top + hr.height / 2 - r.top) / r.height * 100).toFixed(2);
            S.layout.mode = "free";
            applyHome();
        }
        const start = { x: e.clientX, y: e.clientY, px: S.layout.x, py: S.layout.y };
        const move = ev => {
            S.layout.x = +clamp(start.px + (ev.clientX - start.x) / r.width * 100, 5, 95).toFixed(2);
            S.layout.y = +clamp(start.py + (ev.clientY - start.y) / r.height * 100, 5, 95).toFixed(2);
            hero.style.setProperty("--ifxc-x", S.layout.x + "%");
            hero.style.setProperty("--ifxc-y", S.layout.y + "%");
        };
        const up = () => { handle.removeEventListener("pointermove", move); changed(); };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up, { once: true });
        handle.addEventListener("pointercancel", up, { once: true });
    });
}

/* picking an element on the page */
let picked = null;          // part key
let hoverEl = null;

function partOf(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (n.closest && n.closest(".ifxc-panel, .ifxc-gear, .ifxc-handle, .ifxc-sticker")) return null;
        for (const [key, p] of PART_SELS) if (n.matches && n.matches(p.sel)) return { key, el: n };
    }
    return null;
}

function markHover(el) {
    if (hoverEl) hoverEl.classList.remove("ifxc-hover");
    hoverEl = el;
    if (el) el.classList.add("ifxc-hover");
}

function markPicked() {
    document.querySelectorAll(".ifxc-picked").forEach(n => n.classList.remove("ifxc-picked"));
    if (picked && PARTS[picked]) document.querySelectorAll(PARTS[picked].sel).forEach(n => n.classList.add("ifxc-picked"));
}

function bindPicking() {
    document.addEventListener("pointerover", e => {
        if (!editing()) return;
        const p = partOf(e.target);
        markHover(p ? p.el : null);
    });
    document.addEventListener("click", e => {
        if (!editing()) return;
        const p = partOf(e.target);
        if (!p) return;
        e.preventDefault();
        e.stopPropagation();
        picked = p.key;
        tab = "el";
        markPicked();
        renderPanel();
    }, true);
    document.addEventListener("submit", e => { if (editing() && !e.target.closest(".ifxc-panel")) e.preventDefault(); }, true);
}

/* ── images from files go to the server ────────────────── */
function readImage(file, maxSide) {
    return new Promise((resolve, reject) => {
        if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { reject(new Error("type")); return; }
        const fr = new FileReader();
        fr.onerror = () => reject(fr.error);
        fr.onload = () => {
            if (file.type === "image/gif") { resolve(fr.result); return; }
            const img = new Image();
            img.onerror = () => reject(new Error("bad image"));
            img.onload = () => {
                const k = Math.min(1, maxSide / Math.max(img.width, img.height));
                const cv = document.createElement("canvas");
                cv.width = Math.round(img.width * k);
                cv.height = Math.round(img.height * k);
                cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
                let out = cv.toDataURL("image/webp", 0.85);
                if (!out.startsWith("data:image/webp")) out = cv.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
                resolve(out);
            };
            img.src = fr.result;
        };
        fr.readAsDataURL(file);
    });
}

async function post(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({ ok: false }));
    if (r.status === 401) { toast(d.error || "sign in again", "alert"); }
    return d;
}

async function upload(file, maxSide) {
    const data = await readImage(file, maxSide);
    const d = await post("/api/design/media", { data });
    if (!d.ok) throw new Error(d.error || "upload");
    return d.url;
}

/* ── the panel ─────────────────────────────────────────── */
let panel = null, gear = null, tab = "layout", lastFocus = null;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function range(id, label, val, min, max, step = 1, unit = "") {
    return `<label class="ifxc-field"><span>${label} <output>${val}${unit}</output></span>
        <input type="range" data-k="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
}
function color(id, label, val) {
    return `<label class="ifxc-color"><input type="color" data-k="${id}" value="${val}"><span>${label}</span></label>`;
}

function partColor(k, label, st) {
    const on = HEX.test(st[k] || "");
    return `<div class="ifxc-pcolor"><label class="ifxc-color"><input type="color" data-part="${k}" value="${on ? st[k] : "#888888"}"><span>${label}</span></label>
        ${on ? `<button type="button" class="ifxc-mini" data-unset="${k}">${L().unset}</button>` : `<span class="ifxc-unset">${L().unset}</span>`}</div>`;
}

function tabBody() {
    const t = L();
    if (tab === "layout") {
        const cells = [];
        for (const v of ["top", "middle", "bottom"]) for (const h of ["start", "center", "end"]) {
            const on = S.layout.mode === "grid" && S.layout.v === v && S.layout.h === h;
            cells.push(`<button type="button" class="ifxc-cell${on ? " is-on" : ""}" data-place="${v}:${h}" aria-pressed="${on}" aria-label="${v} ${h}"><i></i></button>`);
        }
        return `${HOME ? `<div class="ifxc-label">${t.place}</div>
            <div class="ifxc-grid">${cells.join("")}</div>
            <button type="button" class="ifxc-btn${S.layout.mode === "free" ? " is-on" : ""}" data-act="free">${t.free}</button>
            <p class="ifxc-hint">${t.freeHint}</p>
            ${range("layout.width", t.width, S.layout.width, 320, 1100, 10, "px")}` : ""}
            ${range("radius", t.radius, S.radius, 0, 300, 5, "%")}
            ${range("font", t.font, S.font, 85, 130, 5, "%")}
            ${HOME ? `<label class="ifxc-field"><span>${t.customTitle}</span><input class="ifxc-input" data-text="title" maxlength="60" dir="auto" value="${esc(S.title)}"></label>
            <label class="ifxc-field"><span>${t.customSub}</span><input class="ifxc-input" data-text="subtitle" maxlength="100" dir="auto" value="${esc(S.subtitle)}"></label>` : ""}`;
    }
    if (tab === "colors") {
        return `<div class="ifxc-label">${t.presets}</div>
            <div class="ifxc-presets">${Object.entries(PRESETS).map(([k, p]) =>
                `<button type="button" class="ifxc-preset" data-preset="${k}" title="${k}" aria-label="${k}" style="background:${p.bg};border-color:${p.surface}"><i style="background:${p.accent}"></i></button>`).join("")}</div>
            <div class="ifxc-colors">
                ${color("colors.accent", t.accent, S.colors.accent)}
                ${color("colors.bg", t.bgc, S.colors.bg)}
                ${color("colors.surface", t.surface, S.colors.surface)}
                ${color("colors.text", t.text, S.colors.text)}
            </div>
            <p class="ifxc-hint">${t.pickHint}</p>`;
    }
    if (tab === "bg") {
        const b = S.bg;
        const types = [["default", t.bgDefault], ["solid", t.bgSolid], ["gradient", t.bgGrad], ["image", t.bgImage]];
        let extra = "";
        if (b.type === "solid") extra = `<div class="ifxc-colors">${color("bg.color", t.bgSolid, b.color)}</div>`;
        if (b.type === "gradient") extra = `<div class="ifxc-colors">${color("bg.c1", t.color1, b.c1)}${color("bg.c2", t.color2, b.c2)}</div>${range("bg.angle", t.angle, b.angle, 0, 360, 5, "°")}`;
        if (b.type === "image") extra = `
            <label class="ifxc-btn ifxc-file">${t.upload}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-act="bgfile" hidden></label>
            <label class="ifxc-field"><span>${t.orUrl}</span><input type="url" class="ifxc-input" data-act="bgurl" dir="ltr" placeholder="https://…" value="${b.image.startsWith("/media/") ? "" : esc(b.image)}"></label>
            ${range("bg.dim", t.dim, b.dim, 0, 85, 5, "%")}
            ${range("bg.blur", t.blur, b.blur, 0, 20, 1, "px")}`;
        return `<div class="ifxc-label">${t.bgType}</div>
            <div class="ifxc-seg">${types.map(([k, n]) => `<button type="button" data-bgtype="${k}" class="${b.type === k ? "is-on" : ""}" aria-pressed="${b.type === k}">${n}</button>`).join("")}</div>
            ${extra}`;
    }
    if (tab === "el") {
        const hidden = Object.entries(S.parts).filter(([k, st]) => st.hidden && PARTS[k]);
        const hiddenList = hidden.length
            ? `<ul class="ifxc-list">${hidden.map(([k]) => `<li><span>${esc(isEn() ? PARTS[k].en : PARTS[k].ar)}</span><button type="button" class="ifxc-mini" data-restore="${k}">${t.restore}</button></li>`).join("")}</ul>`
            : `<p class="ifxc-hint">${t.none}</p>`;
        let editor = `<p class="ifxc-hint">${t.pickHint}</p>`;
        if (picked && PARTS[picked]) {
            const st = S.parts[picked] || {};
            const p = PARTS[picked];
            editor = `<div class="ifxc-picked-name">${esc(isEn() ? p.en : p.ar)}</div>
                <div class="ifxc-pcolors">${partColor("bg", t.elBg, st)}${partColor("text", t.elText, st)}${partColor("border", t.elBorder, st)}</div>
                <label class="ifxc-field"><span>${t.elRadius} <output>${typeof st.radius === "number" ? st.radius + "px" : t.unset}</output></span>
                    <input type="range" data-pnum="radius" min="0" max="80" step="1" value="${st.radius ?? 0}"></label>
                <label class="ifxc-field"><span>${t.elOpacity} <output>${st.opacity ?? 100}%</output></span>
                    <input type="range" data-pnum="opacity" min="10" max="100" step="5" value="${st.opacity ?? 100}"></label>
                <div class="ifxc-row">
                    <button type="button" class="ifxc-btn ifxc-danger" data-act="pdelete">${t.elDelete}</button>
                    <button type="button" class="ifxc-btn" data-act="preset-el">${t.elReset}</button>
                </div>`;
        }
        return `${editor}<div class="ifxc-label">${t.deleted}</div>${hiddenList}`;
    }
    if (tab === "short") {
        const list = S.shortcuts.map((s, i) => `<li><span dir="auto">${esc(s.name || s.url)}</span>
            <button type="button" data-sc="up:${i}" aria-label="${t.up}">↑</button>
            <button type="button" data-sc="down:${i}" aria-label="${t.down}">↓</button>
            <button type="button" data-sc="del:${i}" aria-label="${t.remove}">×</button></li>`).join("");
        return `<form class="ifxc-form" data-act="addshort">
                <input class="ifxc-input" name="name" placeholder="${t.name}" maxlength="40" dir="auto">
                <input class="ifxc-input" name="url" placeholder="${t.url}" required dir="ltr" inputmode="url">
                <button class="ifxc-btn is-on" type="submit">${t.add}</button>
            </form>
            ${list ? `<ul class="ifxc-list">${list}</ul>` : `<p class="ifxc-hint">${t.noShort}</p>`}`;
    }
    if (tab === "img") {
        const list = S.images.map((im, i) => `<li class="ifxc-imgrow"><img src="${esc(im.src)}" alt="" referrerpolicy="no-referrer">
            <div class="ifxc-imgctl">
                <label>${t.size}<input type="range" min="30" max="900" step="10" value="${im.w}" data-img="${i}:w"></label>
                <label>${t.rotate}<input type="range" min="-180" max="180" step="5" value="${im.rot || 0}" data-img="${i}:rot"></label>
                <label>${t.elRadius}<input type="range" min="0" max="300" step="2" value="${im.radius ?? 6}" data-img="${i}:radius"></label>
            </div>
            <button type="button" data-imgdel="${i}" aria-label="${t.remove}">×</button></li>`).join("");
        return `<label class="ifxc-btn ifxc-file is-on">${t.addImg}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-act="imgfile" hidden></label>
            <form class="ifxc-form" data-act="imgurl"><input class="ifxc-input" name="url" placeholder="${t.orUrl}" dir="ltr" inputmode="url" required><button class="ifxc-btn" type="submit">${t.add}</button></form>
            <p class="ifxc-hint">${t.imgHint}</p>
            ${list ? `<ul class="ifxc-list">${list}</ul>` : `<p class="ifxc-hint">${t.noImg}</p>`}`;
    }
    return `<button type="button" class="ifxc-btn" data-act="export">${t.export}</button>
        <label class="ifxc-btn ifxc-file">${t.import}<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        <button type="button" class="ifxc-btn ifxc-danger" data-act="reset">${t.reset}</button>
        <button type="button" class="ifxc-btn" data-act="signout">${t.signout}</button>`;
}

function renderPanel() {
    if (!panel) return;
    const t = L();
    const tabs = [["layout", t.tLayout], ["colors", t.tColors], ["bg", t.tBg], ["el", t.tEl]]
        .concat(HOME ? [["short", t.tShort], ["img", t.tImg]] : []).concat([["file", t.tFile]]);
    if (!tabs.some(([k]) => k === tab)) tab = "layout";
    const scroll = panel.querySelector(".ifxc-body")?.scrollTop || 0;
    panel.innerHTML = `
        <div class="ifxc-head">
            <h2 id="ifxcTitle" class="ifx-ltr">${t.title}</h2>
            <button type="button" class="ifxc-x" data-act="close" aria-label="${t.close}">×</button>
        </div>
        <div class="ifxc-tabs" role="tablist">${tabs.map(([k, n]) =>
            `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}" class="${tab === k ? "is-on" : ""}">${n}</button>`).join("")}</div>
        <div class="ifxc-body" role="tabpanel">${tabBody()}</div>
        <div class="ifxc-foot">
            <div class="ifxc-status${dirty() ? " is-dirty" : ""}">${dirty() ? t.unsaved : t.allSaved}</div>
            <div class="ifxc-row">
                <button type="button" class="ifxc-btn is-on" data-act="save" ${dirty() ? "" : "disabled"}>${t.save}</button>
                <button type="button" class="ifxc-btn" data-act="discard" ${dirty() ? "" : "disabled"}>${t.discard}</button>
            </div>
        </div>`;
    const body = panel.querySelector(".ifxc-body");
    if (body) body.scrollTop = scroll;
}

function refreshStatus() {
    if (!panel) return;
    const st = panel.querySelector(".ifxc-status");
    if (!st) return;
    st.classList.toggle("is-dirty", dirty());
    st.textContent = dirty() ? L().unsaved : L().allSaved;
    panel.querySelectorAll('[data-act="save"], [data-act="discard"]').forEach(b => b.disabled = !dirty());
}

/* something in S changed: repaint the page, and the panel when asked */
function changed(rerender = true) {
    applyTheme();
    applyHome();
    markPicked();
    if (rerender) renderPanel(); else refreshStatus();
}

function setPath(path, value) {
    const keys = path.split(".");
    let o = S;
    while (keys.length > 1) o = o[keys.shift()];
    o[keys[0]] = value;
}
const getPath = path => path.split(".").reduce((o, k) => o[k], S);

function partStyle(create) {
    if (!picked) return null;
    if (!S.parts[picked] && create) S.parts[picked] = {};
    return S.parts[picked] || null;
}
function tidyPart() {
    if (picked && S.parts[picked] && !Object.keys(S.parts[picked]).length) delete S.parts[picked];
}

async function save() {
    const btn = panel.querySelector('[data-act="save"]');
    if (btn) { btn.disabled = true; btn.textContent = L().saving; }
    const d = await post("/api/design", { design: S });
    if (d.ok) {
        published = merge(DEFAULTS, d.design);
        S = clone(published);
        toast(L().saved);
        changed();
    } else {
        toast(d.error || L().saveFail, "alert");
        renderPanel();
    }
}

function bindPanel() {
    panel.addEventListener("click", async e => {
        const b = e.target.closest("button");
        if (!b) return;
        const act = b.dataset.act;
        if (b.dataset.tab) { tab = b.dataset.tab; renderPanel(); return; }
        if (b.dataset.place) {
            const [v, h] = b.dataset.place.split(":");
            Object.assign(S.layout, { mode: "grid", v, h });
        } else if (b.dataset.preset) {
            S.colors = Object.assign({}, PRESETS[b.dataset.preset]);
            if (S.bg.type === "solid") S.bg.color = S.colors.bg;
        } else if (b.dataset.bgtype) {
            S.bg.type = b.dataset.bgtype;
        } else if (b.dataset.sc) {
            const [op, i] = b.dataset.sc.split(":"), n = +i, a = S.shortcuts;
            if (op === "del") a.splice(n, 1);
            if (op === "up" && n > 0) [a[n - 1], a[n]] = [a[n], a[n - 1]];
            if (op === "down" && n < a.length - 1) [a[n + 1], a[n]] = [a[n], a[n + 1]];
        } else if (b.dataset.imgdel) {
            S.images.splice(+b.dataset.imgdel, 1);
        } else if (b.dataset.unset) {
            const st = partStyle(false);
            if (st) delete st[b.dataset.unset];
            tidyPart();
        } else if (b.dataset.restore) {
            const st = S.parts[b.dataset.restore];
            if (st) delete st.hidden;
            if (st && !Object.keys(st).length) delete S.parts[b.dataset.restore];
        } else if (act === "pdelete") {
            partStyle(true).hidden = true;
            picked = null;
        } else if (act === "preset-el") {
            delete S.parts[picked];
        } else if (act === "free") {
            S.layout.mode = "free";
        } else if (act === "save") {
            await save(); return;
        } else if (act === "discard") {
            S = clone(published);
        } else if (act === "close") {
            closePanel(); return;
        } else if (act === "signout") {
            if (dirty() && !confirm(L().unsaved)) return;
            await post("/api/owner/logout", {});
            location.href = "/";
            return;
        } else if (act === "export") {
            const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "ifse-design.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            return;
        } else if (act === "reset") {
            if (!confirm(L().resetAsk)) return;
            S = merge(DEFAULTS, {});
            document.documentElement.removeAttribute("style");
        } else return;
        changed();
    });

    panel.addEventListener("input", e => {
        const el = e.target;
        const out = el.closest(".ifxc-field")?.querySelector("output");
        if (el.dataset.k) {
            const cur = getPath(el.dataset.k);
            setPath(el.dataset.k, typeof cur === "number" ? +el.value : el.value);
            if (out) out.textContent = el.value + out.textContent.replace(/^[-\d.]+/, "");
        } else if (el.dataset.text) {
            S[el.dataset.text] = el.value;
        } else if (el.dataset.part) {
            partStyle(true)[el.dataset.part] = el.value;
        } else if (el.dataset.pnum) {
            partStyle(true)[el.dataset.pnum] = +el.value;
            if (out) out.textContent = el.value + (el.dataset.pnum === "radius" ? "px" : "%");
        } else if (el.dataset.img) {
            const [i, k] = el.dataset.img.split(":");
            S.images[+i][k] = +el.value;
        } else return;
        changed(false);
    });

    panel.addEventListener("change", async e => {
        const el = e.target, act = el.dataset.act;
        if (el.dataset.part) { renderPanel(); return; }       // shows the "Original" button
        if (act === "bgurl") {
            S.bg.image = safeUrl(el.value.trim());
            changed(); return;
        }
        const file = el.files && el.files[0];
        if (!file) return;
        try {
            if (act === "bgfile") {
                S.bg.image = await upload(file, 1920);
            } else if (act === "imgfile") {
                S.images.push({ id: "i" + Date.now().toString(36), src: await upload(file, 900), x: 50, y: 25, w: 160, rot: 0, radius: 6 });
            } else if (act === "import") {
                const data = JSON.parse(await file.text());
                if (!data || typeof data !== "object" || !data.colors) throw new Error("bad");
                S = merge(DEFAULTS, data);
            }
        } catch (err) {
            toast(act === "import" ? L().badFile : (err.message && err.message !== "upload" ? err.message : L().uploadFail), "alert");
            return;
        } finally { el.value = ""; }
        changed();
    });

    panel.addEventListener("submit", e => {
        e.preventDefault();
        const f = e.target, act = f.dataset.act;
        const url = safeUrl((f.elements.url.value || "").trim());
        if (!url) return;
        if (act === "addshort") S.shortcuts.push({ name: f.elements.name.value.trim(), url });
        if (act === "imgurl") S.images.push({ id: "i" + Date.now().toString(36), src: url, x: 50, y: 25, w: 160, rot: 0, radius: 6 });
        changed();
    });
}

function openPanel() {
    if (!panel) {
        panel = document.createElement("aside");
        panel.className = "ifxc-panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-labelledby", "ifxcTitle");
        document.body.appendChild(panel);
        bindPanel();
    }
    lastFocus = document.activeElement;
    renderPanel();
    panel.classList.add("is-open");
    document.body.classList.add("ifxc-editing");
    gear.setAttribute("aria-expanded", "true");
    panel.querySelector(".ifxc-x").focus();
}

function closePanel() {
    if (!panel) return;
    panel.classList.remove("is-open");
    document.body.classList.remove("ifxc-editing");
    markHover(null);
    picked = null;
    markPicked();
    gear.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ── start ─────────────────────────────────────────────── */
function start() {
    HOME = document.body.classList.contains("ifx-home");
    applyBackground();
    applyHome();
    if (!OWNER || document.body.classList.contains("ifx-owner-page")) return;

    if (HOME) dragHero();
    bindPicking();
    gear = document.createElement("button");
    gear.type = "button";
    gear.className = "ifxc-gear";
    gear.setAttribute("aria-haspopup", "dialog");
    gear.setAttribute("aria-expanded", "false");
    gear.setAttribute("aria-label", L().open);
    gear.title = L().open;
    gear.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    gear.addEventListener("click", () => (panel && panel.classList.contains("is-open") ? closePanel() : openPanel()));
    document.body.appendChild(gear);

    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && panel && panel.classList.contains("is-open")) closePanel();
    });
    window.addEventListener("beforeunload", e => { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });
    if (window.IFX && IFX.onLang) IFX.onLang(() => {
        gear.setAttribute("aria-label", L().open); gear.title = L().open;
        applyHome();
        if (panel && panel.classList.contains("is-open")) renderPanel();
    });
    if (new URLSearchParams(location.search).get("customize") === "1") {
        history.replaceState(null, "", location.pathname);
        openPanel();
    }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();

window.IFXC = { get: () => clone(S), owner: OWNER, parts: Object.keys(PARTS) };
})();
