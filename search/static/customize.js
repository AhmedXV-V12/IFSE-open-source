/* ═══════════════════════════════════════════════════════════
   IFSE Open v1.0 — Customize my engine
   The gear in the corner of the home page opens a small design editor:
   move the search box (9 spots or free drag), colours, background (colour,
   gradient, image), shortcuts, images placed on the page, and which parts
   of the page show. Everything is saved in this browser only
   (localStorage "ifse_custom_v1") and can be exported / imported as JSON.
   Colours and background apply to every page; layout, shortcuts and
   images belong to the home page.
   ══════════════════════════════════════════════════════════ */
(function () {
"use strict";

const KEY = "ifse_custom_v1";
const HOME = document.body.classList.contains("ifx-home");

const DEFAULTS = {
    layout:  { mode: "grid", v: "middle", h: "center", x: 50, y: 42, width: 720 },
    colors:  { accent: "#155AB6", bg: "#090909", surface: "#1C1C1C", text: "#FFFFFF" },
    bg:      { type: "default", color: "#090909", c1: "#0b1a33", c2: "#090909", angle: 160, image: "", dim: 35, blur: 0 },
    radius:  100,
    font:    100,
    show:    { logo: true, title: true, subtitle: true, stats: true, nav: true, footer: true },
    title:   "",
    subtitle: "",
    shortcuts: [],
    images:  [],
};

const PRESETS = {
    ifelx:   { accent: "#155AB6", bg: "#090909", surface: "#1C1C1C", text: "#FFFFFF" },
    emerald: { accent: "#12946B", bg: "#07110D", surface: "#13201A", text: "#F2FFF9" },
    sunset:  { accent: "#E0663A", bg: "#140B08", surface: "#24150F", text: "#FFF6F2" },
    violet:  { accent: "#7C4DDB", bg: "#0C0913", surface: "#1B1626", text: "#F7F3FF" },
    light:   { accent: "#155AB6", bg: "#F4F6F9", surface: "#FFFFFF", text: "#111418" },
};

const TXT = {
    ar: {
        open: "خصّص محركك", title: "Customize my engine", close: "إغلاق",
        tLayout: "المكان", tColors: "الألوان", tBg: "الخلفية", tShort: "الاختصارات", tImg: "الصور", tShow: "العناصر", tFile: "حفظ",
        place: "مكان مربع البحث", free: "سحب حر", freeHint: "اسحب مربع البحث بنفسك لأي مكان في الصفحة (وضع التحرير شغال طول ما اللوحة مفتوحة).",
        width: "عرض مربع البحث", presets: "ألوان جاهزة", accent: "اللون الأساسي", bgc: "لون الصفحة", surface: "لون الصناديق", text: "لون النص",
        radius: "استدارة الحواف", font: "حجم الخط",
        bgType: "نوع الخلفية", bgDefault: "IFelx", bgSolid: "لون", bgGrad: "تدرّج", bgImage: "صورة",
        color1: "اللون الأول", color2: "اللون الثاني", angle: "الزاوية", upload: "ارفع صورة", orUrl: "أو رابط صورة", dim: "تعتيم", blur: "تمويه",
        name: "الاسم", url: "الرابط", add: "إضافة", noShort: "مفيش اختصارات لسه.", up: "لفوق", down: "لتحت", remove: "حذف",
        addImg: "ضيف صورة على الصفحة", imgHint: "الصورة بتظهر في الصفحة الرئيسية؛ اسحبها من مكانها، وغيّر حجمها من الركن.", noImg: "مفيش صور لسه.", size: "الحجم", rotate: "الدوران",
        sLogo: "الشعار", sTitle: "اسم المحرك", sSub: "السطر تحت الاسم", sStats: "إحصاءات الفهرس", sNav: "أزرار أعلى الصفحة", sFooter: "تذييل الصفحة",
        customTitle: "اسم مخصص", customSub: "سطر مخصص",
        export: "تصدير التصميم", import: "استيراد تصميم", reset: "رجوع لتصميم IFelx", resetAsk: "ترجع للتصميم الأصلي وتمسح تخصيصك؟",
        saved: "اتحفظ", tooBig: "المساحة مش كفاية — جرّب صورة أصغر", badFile: "الملف ده مش تصميم IFSE",
        localNote: "التصميم بيتحفظ في المتصفح ده بس.",
    },
    en: {
        open: "Customize my engine", title: "Customize my engine", close: "Close",
        tLayout: "Layout", tColors: "Colours", tBg: "Background", tShort: "Shortcuts", tImg: "Images", tShow: "Elements", tFile: "Save",
        place: "Search box position", free: "Free drag", freeHint: "Drag the search box anywhere on the page (edit mode is on while this panel is open).",
        width: "Search box width", presets: "Presets", accent: "Accent", bgc: "Page", surface: "Surfaces", text: "Text",
        radius: "Corner roundness", font: "Text size",
        bgType: "Background type", bgDefault: "IFelx", bgSolid: "Colour", bgGrad: "Gradient", bgImage: "Image",
        color1: "First colour", color2: "Second colour", angle: "Angle", upload: "Upload an image", orUrl: "or an image URL", dim: "Dim", blur: "Blur",
        name: "Name", url: "URL", add: "Add", noShort: "No shortcuts yet.", up: "Up", down: "Down", remove: "Remove",
        addImg: "Add an image to the page", imgHint: "Images show on the home page; drag one to move it and use its corner to resize.", noImg: "No images yet.", size: "Size", rotate: "Rotation",
        sLogo: "Logo", sTitle: "Engine name", sSub: "Line under the name", sStats: "Index stats", sNav: "Top buttons", sFooter: "Footer",
        customTitle: "Custom name", customSub: "Custom line",
        export: "Export design", import: "Import design", reset: "Back to the IFelx design", resetAsk: "Go back to the original design and clear your changes?",
        saved: "Saved", tooBig: "Not enough room — try a smaller image", badFile: "That file is not an IFSE design",
        localNote: "Your design is saved in this browser only.",
    },
};
const L = () => (document.documentElement.lang === "en" ? TXT.en : TXT.ar);

/* ── state ─────────────────────────────────────────────── */
function merge(base, over) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    if (!over || typeof over !== "object") return out;
    for (const k of Object.keys(base)) {
        if (!(k in over)) continue;
        const b = base[k], o = over[k];
        if (Array.isArray(b)) out[k] = Array.isArray(o) ? o : b;
        else if (b && typeof b === "object") out[k] = merge(b, o);
        else if (typeof o === typeof b) out[k] = o;
    }
    return out;
}

function load() {
    try { return merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch { return merge(DEFAULTS, {}); }
}

let S = load();

function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch { toast(L().tooBig, "alert"); return false; }
}

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

/* ── applying the design ───────────────────────────────── */
let bgLayer = null;

function applyTheme() {
    const c = S.colors, root = document.documentElement.style;
    const light = luminance(c.bg) > 0.5;
    root.setProperty("--accent", c.accent);
    root.setProperty("--accent-hi", mix(c.accent, "#ffffff", 0.12));
    root.setProperty("--accent-text", light ? mix(c.accent, "#000000", 0.15) : mix(c.accent, "#ffffff", 0.45));
    root.setProperty("--accent-soft", rgba(c.accent, 0.16));
    root.setProperty("--accent-line", rgba(c.accent, 0.40));
    root.setProperty("--accent-glow", rgba(c.accent, 0.28));
    root.setProperty("--bg", c.bg);
    root.setProperty("--surface", c.surface);
    root.setProperty("--surface-2", mix(c.surface, c.bg, 0.5));
    root.setProperty("--surface-3", mix(c.surface, c.text, 0.06));
    root.setProperty("--text", c.text);
    root.setProperty("--text-2", rgba(c.text, 0.78));
    root.setProperty("--text-3", rgba(c.text, light ? 0.68 : 0.60));
    root.setProperty("--text-4", rgba(c.text, light ? 0.58 : 0.48));
    root.setProperty("--line", rgba(c.text, 0.07));
    root.setProperty("--line-2", rgba(c.text, 0.12));
    root.setProperty("--line-3", rgba(c.text, 0.24));
    root.setProperty("color-scheme", light ? "light" : "dark");
    root.setProperty("--ifxc-radius", S.radius / 100);
    root.fontSize = S.font === 100 ? "" : S.font + "%";
    document.documentElement.classList.toggle("ifxc-radius", S.radius !== 100);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = c.bg;

    const b = S.bg;
    document.documentElement.classList.toggle("ifxc-custom-bg", b.type !== "default");
    if (b.type === "default") { if (bgLayer) bgLayer.hidden = true; return; }
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
        img.style.background = b.image ? `center / cover no-repeat url("${b.image.replace(/"/g, "%22")}")` : c.bg;
        dim.style.background = `rgba(0,0,0,${b.dim / 100})`;
    }
}

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

    const sh = S.show;
    const toggle = (sel, on) => document.querySelectorAll(sel).forEach(el => el.classList.toggle("ifxc-hidden", !on));
    toggle(".ifx-lockup-logo", sh.logo);
    toggle(".ifx-hero-name", sh.title);
    toggle(".ifx-hero-sub", sh.subtitle);
    toggle("#statsRow", sh.stats);
    toggle(".ifx-home-nav > :not(.ifxc-gear)", sh.nav);
    toggle(".ifx-footer", sh.footer);
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
        const stats = hero.querySelector("#statsRow");
        hero.insertBefore(box, stats || null);
    }
    box.innerHTML = "";
    for (const s of S.shortcuts) {
        const url = safeUrl(s.url);
        if (!url) continue;
        const a = document.createElement("a");
        a.className = "ifxc-tile";
        a.href = url;
        a.rel = "noopener noreferrer";
        const icon = document.createElement("span");
        icon.className = "ifxc-tile-icon";
        const letter = (s.name || new URL(url).hostname).trim().charAt(0).toUpperCase();
        icon.textContent = letter;
        const img = new Image();
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.onload = () => { icon.textContent = ""; icon.appendChild(img); };
        img.src = new URL(url).origin + "/favicon.ico";
        const label = document.createElement("span");
        label.className = "ifxc-tile-name";
        label.dir = "auto";
        label.textContent = s.name || new URL(url).hostname;
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
        el.dataset.id = im.id;
        el.style.left = im.x + "%";
        el.style.top = im.y + "%";
        el.style.width = im.w + "px";
        el.style.transform = `translate(-50%,-50%) rotate(${im.rot || 0}deg)`;
        const img = document.createElement("img");
        img.src = im.src;
        img.alt = "";
        img.draggable = false;
        img.referrerPolicy = "no-referrer";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "ifxc-sticker-del";
        del.setAttribute("aria-label", L().remove);
        del.textContent = "×";
        del.addEventListener("click", e => {
            e.stopPropagation();
            S.images = S.images.filter(x => x.id !== im.id);
            save(); renderImages(); if (panel) renderPanel();
        });
        const grip = document.createElement("span");
        grip.className = "ifxc-sticker-grip";
        el.append(img, del, grip);
        imgLayer.appendChild(el);
        dragSticker(el, im, grip);
    }
}

/* ── dragging (edit mode only) ─────────────────────────── */
function editing() { return document.body.classList.contains("ifxc-editing"); }

function dragSticker(el, im, grip) {
    el.addEventListener("pointerdown", e => {
        if (!editing() || e.target.closest(".ifxc-sticker-del")) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const resizing = e.target === grip;
        const start = { x: e.clientX, y: e.clientY, w: im.w, px: im.x, py: im.y };
        const move = ev => {
            if (resizing) {
                im.w = Math.max(40, Math.min(900, start.w + (ev.clientX - start.x) * (document.dir === "rtl" ? -1 : 1) * 2));
                el.style.width = im.w + "px";
            } else {
                im.x = clamp(start.px + (ev.clientX - start.x) / innerWidth * 100, 0, 100);
                im.y = clamp(start.py + (ev.clientY - start.y) / innerHeight * 100, 0, 100);
                el.style.left = im.x + "%";
                el.style.top = im.y + "%";
            }
        };
        const up = () => { el.removeEventListener("pointermove", move); save(); if (panel) renderPanel(); };
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
            S.layout.x = (hr.left + hr.width / 2 - r.left) / r.width * 100;
            S.layout.y = (hr.top + hr.height / 2 - r.top) / r.height * 100;
            S.layout.mode = "free";
            applyHome();
        }
        const start = { x: e.clientX, y: e.clientY, px: S.layout.x, py: S.layout.y };
        const move = ev => {
            S.layout.x = clamp(start.px + (ev.clientX - start.x) / r.width * 100, 5, 95);
            S.layout.y = clamp(start.py + (ev.clientY - start.y) / r.height * 100, 5, 95);
            hero.style.setProperty("--ifxc-x", S.layout.x + "%");
            hero.style.setProperty("--ifxc-y", S.layout.y + "%");
        };
        const up = () => { handle.removeEventListener("pointermove", move); save(); if (panel) renderPanel(); };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up, { once: true });
        handle.addEventListener("pointercancel", up, { once: true });
    });
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ── images from files ─────────────────────────────────── */
function readImage(file, maxSide) {
    return new Promise((resolve, reject) => {
        if (!file || !/^image\//.test(file.type)) { reject(new Error("not an image")); return; }
        const fr = new FileReader();
        fr.onerror = () => reject(fr.error);
        fr.onload = () => {
            if (file.type === "image/gif" || file.type === "image/svg+xml") {
                if (fr.result.length > 1.5e6) reject(new Error("too big")); else resolve(fr.result);
                return;
            }
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

/* ── the panel ─────────────────────────────────────────── */
let panel = null, tab = "layout";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function range(id, label, val, min, max, step = 1, unit = "") {
    return `<label class="ifxc-field"><span>${label} <output>${val}${unit}</output></span>
        <input type="range" data-k="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
}
function color(id, label, val) {
    return `<label class="ifxc-color"><input type="color" data-k="${id}" value="${val}"><span>${label}</span></label>`;
}
function check(id, label, on) {
    return `<label class="ifxc-check"><input type="checkbox" data-k="${id}" ${on ? "checked" : ""}><span>${label}</span></label>`;
}

function tabBody() {
    const t = L();
    if (tab === "layout") {
        const cells = [];
        for (const v of ["top", "middle", "bottom"]) for (const h of ["start", "center", "end"]) {
            const on = S.layout.mode === "grid" && S.layout.v === v && S.layout.h === h;
            cells.push(`<button type="button" class="ifxc-cell${on ? " is-on" : ""}" data-place="${v}:${h}" aria-pressed="${on}" aria-label="${v} ${h}"><i></i></button>`);
        }
        return `<div class="ifxc-label">${t.place}</div>
            <div class="ifxc-grid">${cells.join("")}</div>
            <button type="button" class="ifxc-btn${S.layout.mode === "free" ? " is-on" : ""}" data-act="free">${t.free}</button>
            <p class="ifxc-hint">${t.freeHint}</p>
            ${range("layout.width", t.width, S.layout.width, 320, 1100, 10, "px")}
            ${range("radius", t.radius, S.radius, 0, 150, 5, "%")}
            ${range("font", t.font, S.font, 85, 130, 5, "%")}`;
    }
    if (tab === "colors") {
        return `<div class="ifxc-label">${t.presets}</div>
            <div class="ifxc-presets">${Object.entries(PRESETS).map(([k, p]) =>
                `<button type="button" class="ifxc-preset" data-preset="${k}" title="${k}" style="background:${p.bg};border-color:${p.surface}"><i style="background:${p.accent}"></i></button>`).join("")}</div>
            <div class="ifxc-colors">
                ${color("colors.accent", t.accent, S.colors.accent)}
                ${color("colors.bg", t.bgc, S.colors.bg)}
                ${color("colors.surface", t.surface, S.colors.surface)}
                ${color("colors.text", t.text, S.colors.text)}
            </div>`;
    }
    if (tab === "bg") {
        const b = S.bg;
        const types = [["default", t.bgDefault], ["solid", t.bgSolid], ["gradient", t.bgGrad], ["image", t.bgImage]];
        let extra = "";
        if (b.type === "solid") extra = `<div class="ifxc-colors">${color("bg.color", t.bgSolid, b.color)}</div>`;
        if (b.type === "gradient") extra = `<div class="ifxc-colors">${color("bg.c1", t.color1, b.c1)}${color("bg.c2", t.color2, b.c2)}</div>${range("bg.angle", t.angle, b.angle, 0, 360, 5, "°")}`;
        if (b.type === "image") extra = `
            <label class="ifxc-btn ifxc-file">${t.upload}<input type="file" accept="image/*" data-act="bgfile" hidden></label>
            <label class="ifxc-field"><span>${t.orUrl}</span><input type="url" class="ifxc-input" data-act="bgurl" dir="ltr" placeholder="https://…" value="${b.image.startsWith("data:") ? "" : esc(b.image)}"></label>
            ${range("bg.dim", t.dim, b.dim, 0, 85, 5, "%")}
            ${range("bg.blur", t.blur, b.blur, 0, 20, 1, "px")}`;
        return `<div class="ifxc-label">${t.bgType}</div>
            <div class="ifxc-seg">${types.map(([k, n]) => `<button type="button" data-bgtype="${k}" class="${b.type === k ? "is-on" : ""}" aria-pressed="${b.type === k}">${n}</button>`).join("")}</div>
            ${extra}`;
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
        const list = S.images.map((im, i) => `<li><img src="${esc(im.src)}" alt="" referrerpolicy="no-referrer">
            <input type="range" min="40" max="900" step="10" value="${im.w}" data-imgw="${i}" aria-label="${t.size}">
            <input type="range" min="-180" max="180" step="5" value="${im.rot || 0}" data-imgr="${i}" aria-label="${t.rotate}">
            <button type="button" data-imgdel="${i}" aria-label="${t.remove}">×</button></li>`).join("");
        return `<label class="ifxc-btn ifxc-file is-on">${t.addImg}<input type="file" accept="image/*" data-act="imgfile" hidden></label>
            <form class="ifxc-form" data-act="imgurl"><input class="ifxc-input" name="url" placeholder="${t.orUrl}" dir="ltr" inputmode="url" required><button class="ifxc-btn" type="submit">${t.add}</button></form>
            <p class="ifxc-hint">${t.imgHint}</p>
            ${list ? `<ul class="ifxc-list ifxc-imglist">${list}</ul>` : `<p class="ifxc-hint">${t.noImg}</p>`}`;
    }
    if (tab === "show") {
        const sh = S.show;
        return `${check("show.logo", t.sLogo, sh.logo)}${check("show.title", t.sTitle, sh.title)}${check("show.subtitle", t.sSub, sh.subtitle)}
            ${check("show.stats", t.sStats, sh.stats)}${check("show.nav", t.sNav, sh.nav)}${check("show.footer", t.sFooter, sh.footer)}
            <label class="ifxc-field"><span>${t.customTitle}</span><input class="ifxc-input" data-text="title" maxlength="60" dir="auto" value="${esc(S.title)}"></label>
            <label class="ifxc-field"><span>${t.customSub}</span><input class="ifxc-input" data-text="subtitle" maxlength="100" dir="auto" value="${esc(S.subtitle)}"></label>`;
    }
    return `<button type="button" class="ifxc-btn is-on" data-act="export">${t.export}</button>
        <label class="ifxc-btn ifxc-file">${t.import}<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        <button type="button" class="ifxc-btn ifxc-danger" data-act="reset">${t.reset}</button>
        <p class="ifxc-hint">${t.localNote}</p>`;
}

function renderPanel() {
    const t = L();
    const tabs = [["layout", t.tLayout], ["colors", t.tColors], ["bg", t.tBg], ["short", t.tShort], ["img", t.tImg], ["show", t.tShow], ["file", t.tFile]];
    panel.innerHTML = `
        <div class="ifxc-head">
            <h2 id="ifxcTitle" class="ifx-ltr">${t.title}</h2>
            <button type="button" class="ifxc-x" data-act="close" aria-label="${t.close}">×</button>
        </div>
        <div class="ifxc-tabs" role="tablist">${tabs.map(([k, n]) =>
            `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}" class="${tab === k ? "is-on" : ""}">${n}</button>`).join("")}</div>
        <div class="ifxc-body" role="tabpanel">${tabBody()}</div>`;
}

function setPath(path, value) {
    const keys = path.split(".");
    let o = S;
    while (keys.length > 1) o = o[keys.shift()];
    o[keys[0]] = value;
}

function getPath(path) {
    return path.split(".").reduce((o, k) => o[k], S);
}

function refresh() { applyTheme(); applyHome(); }

function bindPanel() {
    panel.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.tab) { tab = b.dataset.tab; renderPanel(); return; }
        if (b.dataset.place) {
            const [v, h] = b.dataset.place.split(":");
            Object.assign(S.layout, { mode: "grid", v, h });
        } else if (b.dataset.preset) {
            S.colors = Object.assign({}, PRESETS[b.dataset.preset]);
            if (S.bg.type === "default" || S.bg.type === "solid") S.bg.color = S.colors.bg;
        } else if (b.dataset.bgtype) {
            S.bg.type = b.dataset.bgtype;
        } else if (b.dataset.sc) {
            const [op, i] = b.dataset.sc.split(":"), n = +i, a = S.shortcuts;
            if (op === "del") a.splice(n, 1);
            if (op === "up" && n > 0) [a[n - 1], a[n]] = [a[n], a[n - 1]];
            if (op === "down" && n < a.length - 1) [a[n + 1], a[n]] = [a[n], a[n + 1]];
        } else if (b.dataset.imgdel) {
            S.images.splice(+b.dataset.imgdel, 1);
        } else if (b.dataset.act === "free") {
            S.layout.mode = "free";
        } else if (b.dataset.act === "close") {
            closePanel(); return;
        } else if (b.dataset.act === "export") {
            const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "ifse-design.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            return;
        } else if (b.dataset.act === "reset") {
            if (!confirm(L().resetAsk)) return;
            S = merge(DEFAULTS, {});
            try { localStorage.removeItem(KEY); } catch {}
            document.documentElement.removeAttribute("style");
            refresh(); renderPanel(); return;
        } else return;
        save(); refresh(); renderPanel();
    });

    panel.addEventListener("input", e => {
        const el = e.target;
        if (el.dataset.k) {
            const cur = getPath(el.dataset.k);
            const val = el.type === "checkbox" ? el.checked : typeof cur === "number" ? +el.value : el.value;
            setPath(el.dataset.k, val);
            const out = el.closest(".ifxc-field")?.querySelector("output");
            if (out) out.textContent = el.value + (out.textContent.replace(/^[-\d.]+/, ""));
        } else if (el.dataset.text) {
            S[el.dataset.text] = el.value;
        } else if (el.dataset.imgw) {
            S.images[+el.dataset.imgw].w = +el.value;
        } else if (el.dataset.imgr) {
            S.images[+el.dataset.imgr].rot = +el.value;
        } else return;
        refresh();
    });

    panel.addEventListener("change", async e => {
        const el = e.target, act = el.dataset.act;
        if (el.dataset.k || el.dataset.text || el.dataset.imgw || el.dataset.imgr) { save(); return; }
        if (act === "bgurl") {
            S.bg.image = safeUrl(el.value.trim());
            save(); refresh(); return;
        }
        const file = el.files && el.files[0];
        if (!file) return;
        try {
            if (act === "bgfile") {
                S.bg.image = await readImage(file, 1920);
            } else if (act === "imgfile") {
                S.images.push({ id: "i" + Date.now().toString(36), src: await readImage(file, 640), x: 50, y: 25, w: 160, rot: 0 });
            } else if (act === "import") {
                const data = JSON.parse(await file.text());
                if (!data || typeof data !== "object" || !data.colors) throw new Error("bad");
                S = merge(DEFAULTS, data);
                S.images = S.images.filter(im => typeof im.src === "string" && /^(data:image\/|https?:)/.test(im.src));
            }
        } catch {
            toast(act === "import" ? L().badFile : L().tooBig, "alert");
            return;
        } finally { el.value = ""; }
        if (save()) toast(L().saved);
        refresh(); renderPanel();
    });

    panel.addEventListener("submit", e => {
        e.preventDefault();
        const f = e.target, act = f.dataset.act;
        const url = safeUrl((f.elements.url.value || "").trim());
        if (!url) return;
        if (act === "addshort") S.shortcuts.push({ name: f.elements.name.value.trim(), url });
        if (act === "imgurl") S.images.push({ id: "i" + Date.now().toString(36), src: url, x: 50, y: 25, w: 160, rot: 0 });
        save(); refresh(); renderPanel();
    });
}

let lastFocus = null;

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
    gear.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
}

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && panel && panel.classList.contains("is-open")) closePanel();
});

/* ── start ─────────────────────────────────────────────── */
let gear = null;

applyTheme();
if (HOME) {
    applyHome();
    dragHero();
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
    if (window.IFX && IFX.onLang) IFX.onLang(() => {
        gear.setAttribute("aria-label", L().open); gear.title = L().open;
        applyHome();
        if (panel && panel.classList.contains("is-open")) renderPanel();
    });
}

window.IFXC = { get: () => JSON.parse(JSON.stringify(S)), open: () => HOME && openPanel() };
})();
