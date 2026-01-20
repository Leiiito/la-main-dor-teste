import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, GENERIC_CALENDLY_URL } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  year: document.getElementById("year"),
  navToggle: document.querySelector(".nav__toggle"),
  navMenu: document.getElementById("navMenu"),
  servicesGrid: document.getElementById("servicesGrid"),
  servicesStatus: document.getElementById("servicesStatus"),
  serviceSearch: document.getElementById("serviceSearch"),
  clearSearch: document.getElementById("clearSearch"),
  tabs: Array.from(document.querySelectorAll(".tab[data-category]")),
  galleryGrid: document.getElementById("galleryGrid"),
  galleryStatus: document.getElementById("galleryStatus"),
  lightbox: document.getElementById("lightbox"),
  lightboxImg: document.getElementById("lightboxImg"),
  lightboxCaption: document.getElementById("lightboxCaption"),
};

let state = {
  services: [],
  gallery: [],
  activeCategory: "all",
  query: "",
};

function setStatus(el, type, message) {
  if (!el) return;
  if (!message) {
    el.classList.remove("is-show", "is-ok", "is-err");
    el.textContent = "";
    return;
  }
  el.classList.add("is-show");
  el.classList.toggle("is-ok", type === "ok");
  el.classList.toggle("is-err", type === "err");
  el.textContent = message;
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return `${Math.round(v)}€`;
}

function minutes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return `${Math.round(v)} min`;
}

function safeUrl(url) {
  try {
    if (!url) return "";
    const u = new URL(url);
    return u.toString();
  } catch {
    return "";
  }
}

function bookUrl(service) {
  const u = safeUrl(service?.calendly_url);
  return u || GENERIC_CALENDLY_URL;
}

function parsePriceDurationFromTitle(service) {
  // RÈGLE: si "deux nombres" dans title ou description ex "40 90 min"
  // 1er = prix, 2e = durée
  // On ne modifie pas la DB; on affiche seulement si price/duration manquent.
  const text = `${service?.title || ""} ${service?.description || ""}`;
  const nums = Array.from(text.matchAll(/(\d{1,4})/g)).map(m => Number(m[1]));
  if (nums.length >= 2) {
    const price = Number.isFinite(service.price) ? service.price : nums[0];
    const duration = Number.isFinite(service.duration) ? service.duration : nums[1];
    return { price, duration };
  }
  return { price: service.price, duration: service.duration };
}

function renderServices() {
  const grid = els.servicesGrid;
  if (!grid) return;

  const q = normalize(state.query);
  const cat = state.activeCategory;

  const filtered = state.services
    .filter(s => cat === "all" ? true : s.category === cat)
    .filter(s => {
      if (!q) return true;
      const hay = normalize(`${s.title} ${s.description} ${s.category}`);
      return hay.includes(q);
    });

  if (!filtered.length) {
    grid.innerHTML = `<div class="note"><p>Aucune prestation trouvée. Essayez un autre mot-clé.</p></div>`;
    return;
  }

  const html = filtered.map(s => {
    const { price, duration } = parsePriceDurationFromTitle(s);
    const featured = !!s.featured;

    return `
      <article class="card service-card">
        <div class="service-meta">
          <span class="badge">${escapeHtml(s.category || "")}</span>
          ${featured ? `<span class="badge badge--hot">Populaire</span>` : ""}
          ${Number.isFinite(price) ? `<span class="badge">${money(price)}</span>` : ""}
          ${Number.isFinite(duration) ? `<span class="badge">${minutes(duration)}</span>` : ""}
        </div>

        <h3>${escapeHtml(s.title || "Prestation")}</h3>
        ${s.description ? `<p class="muted">${escapeHtml(s.description)}</p>` : `<p class="muted">—</p>`}

        <div class="service-actions">
          <a class="btn btn--primary btn--sm" target="_blank" rel="noopener" href="${escapeAttr(bookUrl(s))}">Réserver</a>
          <a class="btn btn--ghost btn--sm" href="#contact">Question rapide</a>
        </div>
      </article>
    `;
  }).join("");

  grid.innerHTML = html;
}

function renderGallery() {
  const grid = els.galleryGrid;
  if (!grid) return;

  if (!state.gallery.length) {
    grid.innerHTML = `<div class="note"><p>La galerie est vide pour le moment. Ajoutez des images depuis <code>/admin</code>.</p></div>`;
    return;
  }

  const html = state.gallery.map((it, idx) => {
    // dimensions: use CSS aspect-ratio to reduce CLS; still add width/height attrs.
    const alt = it.alt || "Réalisation La Main d’Or";
    return `
      <button class="gallery-item" type="button"
        data-idx="${idx}"
        aria-label="Agrandir l'image : ${escapeAttr(alt)}">
        <img loading="lazy" decoding="async"
          src="${escapeAttr(it.public_url)}"
          alt="${escapeAttr(alt)}"
          width="800" height="800" />
      </button>
    `;
  }).join("");

  grid.innerHTML = html;
}

function openLightbox(item) {
  if (!item) return;
  els.lightboxImg.src = item.public_url;
  els.lightboxImg.alt = item.alt || "Réalisation";
  els.lightboxCaption.textContent = item.alt || "";
  els.lightbox.classList.add("is-open");
  els.lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // focus close
  const closeBtn = els.lightbox.querySelector("[data-close]");
  closeBtn?.focus?.();
}

function closeLightbox() {
  els.lightbox.classList.remove("is-open");
  els.lightbox.setAttribute("aria-hidden", "true");
  els.lightboxImg.src = "";
  els.lightboxCaption.textContent = "";
  document.body.style.overflow = "";
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str){ return escapeHtml(str).replaceAll("`","&#096;"); }

function setupNav() {
  if (!els.navToggle || !els.navMenu) return;

  els.navToggle.addEventListener("click", () => {
    const isOpen = els.navMenu.classList.toggle("is-open");
    els.navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close on link click (mobile)
  els.navMenu.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    els.navMenu.classList.remove("is-open");
    els.navToggle.setAttribute("aria-expanded", "false");
  });
}

function setupTabsAndSearch() {
  els.tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      els.tabs.forEach(b => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      state.activeCategory = btn.dataset.category || "all";
      renderServices();
    });
  });

  els.serviceSearch?.addEventListener("input", (e) => {
    state.query = e.target.value || "";
    renderServices();
  });

  els.clearSearch?.addEventListener("click", () => {
    state.query = "";
    if (els.serviceSearch) els.serviceSearch.value = "";
    renderServices();
    els.serviceSearch?.focus?.();
  });
}

function setupGenericCTA() {
  // All elements with data-cta="book-generic" should point to GENERIC_CALENDLY_URL
  document.querySelectorAll('[data-cta="book-generic"]').forEach(el => {
    if (el.tagName.toLowerCase() === "a") el.setAttribute("href", GENERIC_CALENDLY_URL);
  });
}

function setupGalleryLightbox() {
  els.galleryGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".gallery-item");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const item = state.gallery[idx];
    openLightbox(item);
  });

  els.lightbox?.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.lightbox?.classList.contains("is-open")) closeLightbox();
  });
}

async function loadServices() {
  setStatus(els.servicesStatus, "ok", "Chargement des prestations…");
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    setStatus(els.servicesStatus, "err", "Impossible de charger les prestations (vérifiez la config Supabase).");
    state.services = [];
    renderServices();
    return;
  }

  state.services = (data || []).map(s => ({
    id: s.id,
    category: s.category,
    title: s.title,
    price: Number.isFinite(s.price) ? s.price : (s.price ?? null),
    duration: Number.isFinite(s.duration) ? s.duration : (s.duration ?? null),
    description: s.description,
    calendly_url: s.calendly_url,
    featured: !!s.featured,
    order_index: s.order_index ?? 0,
  }));

  setStatus(els.servicesStatus, "ok", `✅ ${state.services.length} prestation(s) chargée(s).`);
  renderServices();
}

async function loadGallery() {
  setStatus(els.galleryStatus, "ok", "Chargement de la galerie…");
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    setStatus(els.galleryStatus, "err", "Impossible de charger la galerie (vérifiez la config Supabase).");
    state.gallery = [];
    renderGallery();
    return;
  }

  state.gallery = (data || []).filter(it => !!it.public_url).map(it => ({
    id: it.id,
    public_url: it.public_url,
    storage_path: it.storage_path,
    alt: it.alt || "",
    category: it.category || "",
    order_index: it.order_index ?? 0,
  }));

  setStatus(els.galleryStatus, "ok", `✅ ${state.gallery.length} image(s) chargée(s).`);
  renderGallery();
}

function setYear() {
  if (els.year) els.year.textContent = String(new Date().getFullYear());
}

async function init() {
  setYear();
  setupNav();
  setupTabsAndSearch();
  setupGenericCTA();
  setupGalleryLightbox();

  await Promise.all([loadServices(), loadGallery()]);
}

init();
