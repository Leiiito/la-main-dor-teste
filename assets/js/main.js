// /assets/js/main.js
import { GENERIC_CALENDLY_URL } from "./supabase-config.js";

const LS = {
  SERVICES: "lmd_services",
  GALLERY: "lmd_gallery",
};

const $ = (sel) => document.querySelector(sel);

const servicesGrid = $("#servicesGrid");
const servicesStatus = $("#servicesStatus");
const galleryGrid = $("#galleryGrid");
const galleryStatus = $("#galleryStatus");

const tabs = Array.from(document.querySelectorAll(".tab[data-category]"));
const searchInput = $("#serviceSearch");
const clearSearchBtn = $("#clearSearch");

const yearEl = $("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* =========================
   Helpers
========================= */
function safeJSONParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}
function setStatus(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
}
function loadServices() {
  const arr = safeJSONParse(localStorage.getItem(LS.SERVICES), []);
  return Array.isArray(arr) ? arr : [];
}
function loadGallery() {
  const arr = safeJSONParse(localStorage.getItem(LS.GALLERY), []);
  return Array.isArray(arr) ? arr : [];
}
function normalizeDuration(d) {
  if (d === "" || d == null) return null;
  const n = +d;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function formatPriceDuration(price, duration) {
  const p = Number.isFinite(+price) ? Math.round(+price) : 0;
  const d = normalizeDuration(duration);
  return d ? `${p}€ • ${d} min` : `${p}€`;
}
function getBookUrl(service) {
  const u = (service.link_url || "").trim();
  return u || GENERIC_CALENDLY_URL || "#";
}

/* =========================
   Services rendering
========================= */
let services = [];
let activeCategory = "all";
let q = "";

function getFilteredServices() {
  const normalized = services
    .slice()
    .sort((a, b) => (+a.order_index || 0) - (+b.order_index || 0));

  return normalized.filter(s => {
    const catOk = activeCategory === "all" ? true : (s.category === activeCategory);
    if (!catOk) return false;

    if (!q) return true;
    const hay = `${s.title || ""} ${s.category || ""} ${s.description || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderServices() {
  if (!servicesGrid) return;
  servicesGrid.innerHTML = "";

  const list = getFilteredServices();

  if (services.length === 0) {
    setStatus(servicesStatus, "Aucune prestation pour l’instant. Ajoutez-les via /admin.");
    servicesGrid.innerHTML = `
      <div class="note">
        <p><strong>Admin :</strong> allez sur <code>admin/</code> pour ajouter prestations & galerie.</p>
      </div>
    `;
    return;
  }

  setStatus(servicesStatus, `${list.length} prestation(s) affichée(s).`);

  list.forEach(s => {
    const card = document.createElement("article");
    card.className = "service-card";
    const bookUrl = getBookUrl(s);

    card.innerHTML = `
      <div class="service-card__top">
        <h3 class="service-card__title">${escapeHTML(s.title || "")}</h3>
        ${s.featured ? `<span class="badge">Populaire</span>` : ""}
      </div>
      <p class="service-card__meta">${escapeHTML(s.category || "")} • ${escapeHTML(formatPriceDuration(s.price, s.duration))}</p>
      ${s.description ? `<p class="service-card__desc">${escapeHTML(s.description)}</p>` : ""}
      <div class="service-card__actions">
        <a class="btn btn--primary btn--sm" href="${escapeHTML(bookUrl)}" target="_blank" rel="noopener">Réserver</a>
      </div>
    `;
    servicesGrid.appendChild(card);
  });
}

/* =========================
   Tabs + Search
========================= */
function setActiveTab(category) {
  activeCategory = category;
  tabs.forEach(t => {
    const isActive = t.dataset.category === category;
    t.classList.toggle("is-active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  renderServices();
}

tabs.forEach(btn => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.category));
});

searchInput?.addEventListener("input", () => {
  q = (searchInput.value || "").trim().toLowerCase();
  renderServices();
});

clearSearchBtn?.addEventListener("click", () => {
  searchInput.value = "";
  q = "";
  renderServices();
});

/* =========================
   Gallery rendering + lightbox
========================= */
const lightbox = $("#lightbox");
const lightboxImg = $("#lightboxImg");
const lightboxCaption = $("#lightboxCaption");

function openLightbox(src, alt) {
  if (!lightbox) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightboxCaption.textContent = alt || "";
  lightbox.setAttribute("aria-hidden", "false");
  lightbox.classList.add("is-open");
  document.body.classList.add("no-scroll");
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  lightboxImg.src = "";
}

function renderGallery() {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = "";

  const items = loadGallery()
    .slice()
    .sort((a, b) => (+a.order_index || 0) - (+b.order_index || 0));

  if (items.length === 0) {
    setStatus(galleryStatus, "Galerie vide. Ajoutez des images via /admin.");
    return;
  }

  setStatus(galleryStatus, `${items.length} image(s).`);

  items.forEach((g, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-item";
    const alt = g.alt || `Réalisation ${idx + 1}`;

    // Dimensions fixes pour limiter CLS (ratio via CSS)
    btn.innerHTML = `
      <img src="${g.dataUrl}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async" />
    `;

    btn.addEventListener("click", () => openLightbox(g.dataUrl, alt));
    galleryGrid.appendChild(btn);
  });
}

lightbox?.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]") || e.target.closest("[data-close]")) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});
lightbox?.querySelectorAll("[data-close]")?.forEach(el => el.addEventListener("click", closeLightbox));

/* =========================
   Generic CTA "Réserver"
========================= */
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-cta='book-generic']");
  if (!a) return;
  e.preventDefault();
  const url = GENERIC_CALENDLY_URL || "#";
  if (url === "#") return;
  window.open(url, "_blank", "noopener");
});

/* =========================
   Boot
========================= */
function boot() {
  services = loadServices();
  setActiveTab("all");
  renderGallery();
}

document.addEventListener("DOMContentLoaded", boot);
