// Vitrine — La Main d’Or (site statique)
// Lit prestations + galerie depuis localStorage (remplies via /admin)

import { GENERIC_CALENDLY_URL } from "./supabase-config.js";

const LS = {
  SERVICES: "lmd_services",
  GALLERY: "lmd_gallery",
};

const $ = (s) => document.querySelector(s);

const servicesGrid = $("#servicesGrid");
const servicesStatus = $("#servicesStatus");
const galleryGrid = $("#galleryGrid");
const galleryStatus = $("#galleryStatus");

const tabs = Array.from(document.querySelectorAll(".tab[data-category]"));
const searchInput = $("#serviceSearch");
const clearSearchBtn = $("#clearSearch");

const yearEl = $("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

function safeParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function setStatus(el, msg) { if (el) el.textContent = msg || ""; }

function loadServices() {
  const arr = safeParse(localStorage.getItem(LS.SERVICES), []);
  return Array.isArray(arr) ? arr : [];
}
function loadGallery() {
  const arr = safeParse(localStorage.getItem(LS.GALLERY), []);
  return Array.isArray(arr) ? arr : [];
}

function formatPriceDuration(price, duration) {
  const p = Number.isFinite(+price) ? Math.round(+price) : 0;
  const d = (duration == null || duration === "" || +duration <= 0) ? null : Math.round(+duration);
  return d ? `${p}€ • ${d} min` : `${p}€`;
}

function getBookUrl(service) {
  const u = (service.link_url || "").trim();
  return u || GENERIC_CALENDLY_URL || "#";
}

// ----------------- Prestations
let services = [];
let activeCategory = "all";
let q = "";

function filteredServices() {
  return services
    .slice()
    .sort((a,b)=>(+a.order_index||0)-(+b.order_index||0))
    .filter(s => {
      const catOk = activeCategory === "all" ? true : s.category === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      const hay = `${s.title||""} ${s.category||""} ${s.description||""}`.toLowerCase();
      return hay.includes(q);
    });
}

function renderServices() {
  if (!servicesGrid) return;
  servicesGrid.innerHTML = "";

  if (!services.length) {
    setStatus(servicesStatus, "Aucune prestation pour l’instant. Ajoutez-les via /admin.");
    servicesGrid.innerHTML = `
      <div class="note">
        <p><strong>Admin :</strong> allez sur <code>admin/</code> pour ajouter prestations & galerie.</p>
      </div>`;
    return;
  }

  const list = filteredServices();
  setStatus(servicesStatus, `${list.length} prestation(s) affichée(s).`);

  list.forEach(s => {
    const card = document.createElement("article");
    card.className = "service-card";
    const bookUrl = getBookUrl(s);

    card.innerHTML = `
      <div class="service-card__top">
        <h3 class="service-card__title">${esc(s.title || "")}</h3>
        ${s.featured ? `<span class="badge">Populaire</span>` : ""}
      </div>
      <p class="service-card__meta">${esc(s.category || "")} • ${esc(formatPriceDuration(s.price, s.duration))}</p>
      ${s.description ? `<p class="service-card__desc">${esc(s.description)}</p>` : ""}
      <div class="service-card__actions">
        <a class="btn btn--primary btn--sm" href="${esc(bookUrl)}" target="_blank" rel="noopener">Réserver</a>
      </div>
    `;
    servicesGrid.appendChild(card);
  });
}

function setActiveTab(cat) {
  activeCategory = cat;
  tabs.forEach(t => {
    const on = t.dataset.category === cat;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });
  renderServices();
}

tabs.forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.category)));

searchInput?.addEventListener("input", () => {
  q = (searchInput.value || "").trim().toLowerCase();
  renderServices();
});
clearSearchBtn?.addEventListener("click", () => {
  searchInput.value = "";
  q = "";
  renderServices();
});

// ----------------- Galerie + lightbox
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

  const items = loadGallery().slice().sort((a,b)=>(+a.order_index||0)-(+b.order_index||0));

  if (!items.length) {
    setStatus(galleryStatus, "Galerie vide. Ajoutez des images via /admin.");
    return;
  }

  setStatus(galleryStatus, `${items.length} image(s).`);

  items.forEach((g, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-item";
    const alt = g.alt || `Réalisation ${idx + 1}`;
    btn.innerHTML = `<img src="${g.dataUrl}" alt="${esc(alt)}" loading="lazy" decoding="async" />`;
    btn.addEventListener("click", () => openLightbox(g.dataUrl, alt));
    galleryGrid.appendChild(btn);
  });
}

lightbox?.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]") || e.target.closest("[data-close]")) closeLightbox();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

// ----------------- CTA générique
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-cta='book-generic']");
  if (!a) return;
  e.preventDefault();
  const url = GENERIC_CALENDLY_URL || "#";
  if (url === "#") return;
  window.open(url, "_blank", "noopener");
});

// ----------------- Mobile nav toggle (si présent)
const toggle = document.querySelector(".nav__toggle");
const menu = document.querySelector("#navMenu");
toggle?.addEventListener("click", () => {
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
  menu?.classList.toggle("is-open", !expanded);
});

// ----------------- Boot
document.addEventListener("DOMContentLoaded", () => {
  services = loadServices();
  setActiveTab("all");
  renderGallery();
});
