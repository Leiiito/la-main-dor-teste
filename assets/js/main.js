// Vitrine — La Main d’Or (site statique)
// Lit prestations + galerie depuis localStorage (remplies via /admin)

import { GENERIC_CALENDLY_URL } from "./supabase-config.js";

const LS = {
  SERVICES: "lmd_services",
  GALLERY: "lmd_gallery",
  SETTINGS: "lmd_settings",
  REVIEWS: "lmd_reviews",
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

function loadSettings() {
  const obj = safeParse(localStorage.getItem(LS.SETTINGS), null);
  return obj && typeof obj === "object" ? obj : null;
}

function loadReviews() {
  const arr = safeParse(localStorage.getItem(LS.REVIEWS), []);
  return Array.isArray(arr) ? arr : [];
}

function defaultSettings() {
  return {
    hero: {
      h1: "Ongles & Cils à Gravelines — résultats nets, tenue durable.",
      subtitle: "Prestations premium, hygiène irréprochable, produits professionnels. Réservation en quelques secondes.",
      promise: "Finitions propres, tenue optimisée.",
      location_badge: "Gravelines",
      cta_primary_text: "Réserver sur Calendly",
      cta_primary_url: "",
      cta_secondary_text: "Voir les prestations",
      cta_secondary_url: "#prestations",
    },
    contact: {
      phone: "07 50 12 60 32",
      email: "",
      city: "Gravelines",
      address: "",
      hours: "Sur rendez-vous\nMe contacter pour les disponibilités",
      links: {
        whatsapp: "https://wa.me/33750126032",
        instagram: "https://instagram.com/manon__behra",
        google: "https://g.page/r/CTha_eAXpwwcEAE/review",
        calendly: "",
      },
    },
  };
}

function mergeSettings(saved) {
  const d = defaultSettings();
  const s = saved && typeof saved === "object" ? saved : {};
  return {
    hero: { ...d.hero, ...(s.hero || {}) },
    contact: {
      ...d.contact,
      ...(s.contact || {}),
      links: { ...d.contact.links, ...((s.contact || {}).links || {}) },
    },
  };
}

function formatPriceDuration(price, duration) {
  const p = Number.isFinite(+price) ? Math.round(+price) : 0;
  const d = (duration == null || duration === "" || +duration <= 0) ? null : Math.round(+duration);
  return d ? `${p}€ • ${d} min` : `${p}€`;
}

function getBookUrl(service) {
  const u = (service.link_url || "").trim();
  // Si pas de lien spécifique sur la prestation, on retombe sur le lien générique.
  return u || getGenericBookUrl() || "#";
}

// ----------------- Vitrine (Hero + Contact + Avis)
let settings = mergeSettings(loadSettings());

function getGenericBookUrl() {
  const fromAdmin = (settings?.contact?.links?.calendly || "").trim();
  return fromAdmin || GENERIC_CALENDLY_URL || "#";
}

function setAnchor(a, { text, href, forceBlank = true } = {}) {
  if (!a) return;
  if (typeof text === "string" && text.trim()) a.textContent = text;
  if (typeof href === "string") {
    a.setAttribute("href", href || "#");
    if (forceBlank && /^https?:\/\//i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  }
}

function applyHero() {
  const hero = settings.hero || {};
  const root = document.querySelector(".hero");
  if (!root) return;

  const pill = root.querySelector(".pill");
  const loc = (hero.location_badge || "").trim();
  if (pill) pill.textContent = loc ? `Sur rendez-vous • ${loc}` : "Sur rendez-vous";

  const h1 = root.querySelector("h1");
  if (h1 && hero.h1) h1.textContent = hero.h1;

  const lead = root.querySelector(".lead");
  if (lead && hero.subtitle) lead.textContent = hero.subtitle;

  // Promesse (petit texte additionnel)
  const promiseText = (hero.promise || "").trim();
  let promiseEl = root.querySelector("[data-hero-promise]");
  if (promiseText) {
    if (!promiseEl) {
      promiseEl = document.createElement("p");
      promiseEl.className = "muted hero__promise";
      promiseEl.dataset.heroPromise = "1";
      lead?.insertAdjacentElement("afterend", promiseEl);
    }
    promiseEl.textContent = promiseText;
  } else {
    promiseEl?.remove();
  }

  const ctaWrap = root.querySelector(".hero__cta");
  const primary = ctaWrap?.querySelector("a.btn.btn--primary");
  const secondary = ctaWrap?.querySelector("a.btn.btn--ghost");

  const primaryUrl = (hero.cta_primary_url || "").trim();
  setAnchor(primary, { text: hero.cta_primary_text, href: primaryUrl || "#" });
  // Si URL vide, on garde le comportement "CTA générique"
  if (primary) {
    if (primaryUrl) primary.removeAttribute("data-cta");
    else primary.setAttribute("data-cta", "book-generic");
  }

  const secText = (hero.cta_secondary_text || "").trim();
  const secUrl = (hero.cta_secondary_url || "").trim();
  if (secondary) {
    if (!secText && !secUrl) {
      secondary.hidden = true;
    } else {
      secondary.hidden = false;
      secondary.textContent = secText || "En savoir plus";
      secondary.setAttribute("href", secUrl || "#prestations");
      secondary.removeAttribute("target");
      secondary.removeAttribute("rel");
    }
  }

  // CTA du menu
  const navPrimary = document.querySelector("#navMenu a.btn.btn--primary");
  if (navPrimary) {
    navPrimary.textContent = hero.cta_primary_text || "Réserver";
    if (primaryUrl) {
      navPrimary.removeAttribute("data-cta");
      navPrimary.setAttribute("href", primaryUrl);
      if (/^https?:\/\//i.test(primaryUrl)) {
        navPrimary.setAttribute("target", "_blank");
        navPrimary.setAttribute("rel", "noopener");
      }
    } else {
      navPrimary.setAttribute("data-cta", "book-generic");
      navPrimary.setAttribute("href", "#reserver");
      navPrimary.removeAttribute("target");
      navPrimary.removeAttribute("rel");
    }
  }
}

function applyContact() {
  const c = settings.contact || {};
  const links = c.links || {};

  // Carte WhatsApp
  const waCard = Array.from(document.querySelectorAll(".contact__card")).find(x => x.querySelector("h3")?.textContent?.toLowerCase().includes("whatsapp"));
  const waBtn = waCard?.querySelector("a.btn");
  if (waBtn) setAnchor(waBtn, { text: "Écrire sur WhatsApp", href: links.whatsapp || "#" });

  // Carte Instagram
  const igCard = Array.from(document.querySelectorAll(".contact__card")).find(x => x.querySelector("h3")?.textContent?.toLowerCase().includes("instagram"));
  const igBtn = igCard?.querySelector("a.btn");
  if (igBtn) {
    const handle = (links.instagram || "").includes("instagram.com/") ? "Instagram" : "Instagram";
    setAnchor(igBtn, { text: handle, href: links.instagram || "#" });
  }

  // Bouton "Voir plus sur Instagram" (section Galerie)
  const galleryIg = Array.from(document.querySelectorAll("a")).find(a => a.textContent?.toLowerCase().includes("voir plus sur instagram"));
  if (galleryIg) setAnchor(galleryIg, { href: links.instagram || galleryIg.getAttribute("href") });

  // Bouton Avis Google (section Avis)
  const googleBtn = document.querySelector("#avis a.btn.btn--primary");
  if (googleBtn) setAnchor(googleBtn, { href: links.google || googleBtn.getAttribute("href") });

  // CTA générique = Calendly admin (si fourni)
  document.querySelectorAll("[data-cta='book-generic']").forEach(a => a.setAttribute("href", "#"));

  // Ajout / mise à jour d'une carte "Coordonnées"
  const contactGrid = document.querySelector("#contact .contact");
  if (!contactGrid) return;

  let info = contactGrid.querySelector(".contact__card--infos");
  if (!info) {
    info = document.createElement("div");
    info.className = "contact__card contact__card--infos";
    contactGrid.appendChild(info);
  }

  const hoursHtml = (c.hours || "").trim().split("\n").map(l => `<div>${esc(l)}</div>`).join("");
  const addressLine = [c.address, c.city].filter(Boolean).join(" • ");

  info.innerHTML = `
    <h3>Coordonnées</h3>
    <div class="contact-infos">
      ${c.phone ? `<div><strong>Tél :</strong> <a href="tel:${esc(c.phone.replace(/\s+/g, ""))}">${esc(c.phone)}</a></div>` : ""}
      ${c.email ? `<div><strong>Email :</strong> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>` : ""}
      ${addressLine ? `<div><strong>Zone :</strong> ${esc(addressLine)}</div>` : ""}
      ${hoursHtml ? `<div class="mt-sm"><strong>Horaires :</strong><div class="contact-hours">${hoursHtml}</div></div>` : ""}
    </div>
  `;
}

function renderReviews() {
  const wrap = document.querySelector("#avis .reviews");
  if (!wrap) return;

  const list = loadReviews()
    .slice()
    .sort((a,b)=>(+a.order_index||0)-(+b.order_index||0));

  if (!list.length) return; // si vide, on laisse les exemples présents dans le HTML

  wrap.innerHTML = "";

  list.forEach(r => {
    const rating = Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5));
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const metaParts = [`— ${r.name || "Cliente"}`, `${rating}/5`];
    if (r.date) metaParts.push(r.date);

    const item = document.createElement("article");
    item.className = "review";
    item.innerHTML = `
      <p class="review__quote">“${esc(r.text || "")}”</p>
      <p class="review__meta"><span class="review__stars" aria-label="${rating} sur 5">${stars}</span> ${esc(metaParts.join(" • "))}</p>
    `;
    wrap.appendChild(item);
  });
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
  const url = getGenericBookUrl() || "#";
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
  settings = mergeSettings(loadSettings());
  applyHero();
  applyContact();
  renderReviews();
  services = loadServices();
  setActiveTab("all");
  renderGallery();
});
