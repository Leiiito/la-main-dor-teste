import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTION_NAME, IMAGES_BUCKET } from "./supabase-config.js";
// Admin (site statique) — La Main d’Or
// - Mot de passe (protection simple front) + session localStorage
// - CRUD prestations (localStorage)
// - Galerie : drag&drop + Ctrl+V + thumbnails + delete + reorder
// - Export/Import JSON

import { compressImageFileToDataUrl, estimateDataUrlBytes } from "./image-utils.js";

const LS = {
  SESSION: "lmd_admin_authed",
  SERVICES: "lmd_services",
  GALLERY: "lmd_gallery",
  SETTINGS: "lmd_settings",
  REVIEWS: "lmd_reviews",
};

// ----------------- Supabase (admin sécurisé via Edge Function)
function getSupabaseClient() {
  if (!SUPABASE_URL || SUPABASE_URL === "SUPABASE_URL") return null;
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "SUPABASE_ANON_KEY") return null;
  if (!window.supabase?.createClient) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getAdminPasswordForServer() {
  // On garde le mot de passe uniquement en session (pas persistant).
  return sessionStorage.getItem("lmd_admin_password") || "";
}

async function callAdminApi(body) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, reason: "supabase_not_configured" };

  const password = getAdminPasswordForServer();
  if (!password) return { ok: false, reason: "missing_password" };

  const { data, error } = await sb.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { password, ...body },
  });

  if (error) return { ok: false, error };
  return { ok: true, data };
}

async function syncSettingsToSupabase() {
  // Regroupe TOUT dans settings.value pour que la vitrine soit à jour partout.
  const settings = loadSettings();
  const services = loadServices();
  const gallery = loadGallery();

  const payload = {
    ...settings,
    services,
    gallery,
  };

  return callAdminApi({ action: "save_settings", value: payload });
}

async function syncReviewsToSupabase(reviews) {
  return callAdminApi({ action: "replace_reviews", reviews });
}

async function uploadReservationImageToSupabase(dataUrl) {
  const res = await callAdminApi({
    action: "upload_image",
    bucket: IMAGES_BUCKET,
    folder: "reservation",
    data_url: dataUrl,
  });
  if (!res.ok) return null;
  return res.data?.publicUrl || null;
}


const ADMIN_PASS_HASH_SHA256_HEX =
  "293a5e11f0aad8d69be0ee35a564fea7828e192ddd70057eb88872f1878d96a1"; // sha256("18121995")

const $ = (s) => document.querySelector(s);

// Badge de synchro (Supabase)
const syncBadge = () => $("#syncBadge");

function setSyncBadge(state, text) {
  const el = syncBadge();
  if (!el) return;
  el.textContent = text;
  el.classList.remove("pill--ok", "pill--warn", "pill--err");
  if (state === "ok") el.classList.add("pill--ok");
  else if (state === "err") el.classList.add("pill--err");
  else el.classList.add("pill--warn");
}

function refreshSyncBadgeIdle() {
  const sb = getSupabaseClient();
  if (!sb) {
    setSyncBadge("warn", "Supabase : non configuré");
    return;
  }
  const pwd = getAdminPasswordForServer();
  if (!pwd) {
    setSyncBadge("warn", "Supabase : mot de passe requis");
    return;
  }
  setSyncBadge("ok", "Supabase : prêt");
}

async function runSync(label, fn) {
  const sb = getSupabaseClient();
  if (!sb) {
    setSyncBadge("warn", "Supabase : non configuré");
    return;
  }

  const pwd = getAdminPasswordForServer();
  if (!pwd) {
    setSyncBadge("warn", "Supabase : mot de passe requis");
    return;
  }

  setSyncBadge("warn", `Supabase : synchronisation…`);
  const res = await fn();
  if (res?.ok) {
    setSyncBadge("ok", `Supabase : synchronisé`);
    return;
  }

  if (res?.reason === "missing_password") {
    setSyncBadge("warn", "Supabase : reconnecte-toi");
    return;
  }
  if (res?.reason === "supabase_not_configured") {
    setSyncBadge("warn", "Supabase : non configuré");
    return;
  }

  setSyncBadge("err", `Supabase : erreur`);
  setStatus($("#adminStatus"), `${label} : erreur de synchronisation Supabase.`, "err");
}

function setStatus(el, msg, type = "") {
  if (!el) return;
  el.textContent = msg || "";
  el.classList.remove("is-ok", "is-err");
  if (type === "ok") el.classList.add("is-ok");
  if (type === "err") el.classList.add("is-err");
}

function safeParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function uuid() {
  return (crypto?.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isAuthed() {
  return localStorage.getItem(LS.SESSION) === "1";
}
function setAuthed(v) {
  if (v) localStorage.setItem(LS.SESSION, "1");
  else localStorage.removeItem(LS.SESSION);
}

function loadServices() {
  const arr = safeParse(localStorage.getItem(LS.SERVICES), []);
  return Array.isArray(arr) ? arr : [];
}
function saveServices(arr) {
  localStorage.setItem(LS.SERVICES, JSON.stringify(arr));
  runSync("Prestations", () => syncSettingsToSupabase()).catch(() => {});
}

function loadGallery() {
  const arr = safeParse(localStorage.getItem(LS.GALLERY), []);
  return Array.isArray(arr) ? arr : [];
}
function saveGallery(arr) {
  localStorage.setItem(LS.GALLERY, JSON.stringify(arr));
  runSync("Galerie", () => syncSettingsToSupabase()).catch(() => {});
}

function loadSettings() {
  const obj = safeParse(localStorage.getItem(LS.SETTINGS), null);
  return obj && typeof obj === "object" ? obj : null;
}
function saveSettings(obj) {
  localStorage.setItem(LS.SETTINGS, JSON.stringify(obj));
  // Sync Supabase (si configuré)
  runSync("Vitrine", () => syncSettingsToSupabase()).catch(() => {});
}

function loadReviews() {
  const arr = safeParse(localStorage.getItem(LS.REVIEWS), []);
  return Array.isArray(arr) ? arr : [];
}
function saveReviews(arr) {
  localStorage.setItem(LS.REVIEWS, JSON.stringify(arr));
  // Sync Supabase (si configuré)
  runSync("Avis", () => syncReviewsToSupabase(arr)).catch(() => {});
}

function reindex(arr) {
  arr.forEach((x, i) => x.order_index = i * 10);
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

// ----------------- Boot views
const loginView = $("#loginView");
const appView = $("#appView");
const logoutBtn = $("#logoutBtn");
const loginForm = $("#loginForm");
const loginStatus = $("#loginStatus");
const adminStatus = $("#adminStatus");

function showLogin() {
  loginView.hidden = false;
  appView.hidden = true;
  logoutBtn.hidden = true;
}
function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  logoutBtn.hidden = false;
  refreshSyncBadgeIdle();
}

// ----------------- Tabs
const tabBtns = Array.from(document.querySelectorAll("[data-admin-tab]"));
const settingsPanel = $("#settingsPanel");
const servicesPanel = $("#servicesPanel");
const galleryPanel = $("#galleryPanel");
const reviewsPanel = $("#reviewsPanel");
const backupPanel = $("#backupPanel");

function setTab(name) {
  const panels = {
    settings: settingsPanel,
    services: servicesPanel,
    gallery: galleryPanel,
    reviews: reviewsPanel,
    backup: backupPanel,
  };
  for (const [k, el] of Object.entries(panels)) el.hidden = k !== name;
  tabBtns.forEach(b => {
    const active = b.dataset.adminTab === name;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
}

// ----------------- Settings (Hero + Contact)
const heroForm = $("#heroForm");
const contactForm = $("#contactForm");

const hero_h1 = $("#hero_h1");
const hero_subtitle = $("#hero_subtitle");
const hero_promise = $("#hero_promise");
const hero_location = $("#hero_location");
const hero_cta_primary_text = $("#hero_cta_primary_text");
const hero_cta_primary_url = $("#hero_cta_primary_url");
const hero_cta_secondary_text = $("#hero_cta_secondary_text");
const hero_cta_secondary_url = $("#hero_cta_secondary_url");

const contact_phone = $("#contact_phone");
const contact_email = $("#contact_email");
const contact_city = $("#contact_city");
const contact_address = $("#contact_address");
const contact_hours = $("#contact_hours");
const contact_whatsapp = $("#contact_whatsapp");
const contact_instagram = $("#contact_instagram");
const contact_google = $("#contact_google");
const contact_calendly = $("#contact_calendly");

// Section réservation (à côté du Hero)
const reservationForm = $("#reservationForm");
const reservation_image = $("#reservation_image");
const reservation_image_wrap = $("#reservation_image_wrap");
const reservation_image_preview = $("#reservation_image_preview");
const reservation_image_remove = $("#reservation_image_remove");

const reservation_badge = $("#reservation_badge");
const reservation_title = $("#reservation_title");
const reservation_text = $("#reservation_text");
const reservation_cta_text = $("#reservation_cta_text");
const reservation_cta_url = $("#reservation_cta_url");

let reservationImageDataUrl = "";

function defaultSettings() {
  return {
    hero: {
      h1: "Ongles & Cils à Gravelines — résultats nets, tenue durable.",
      subtitle: "Prestations premium, hygiène irréprochable, produits professionnels. Réservation en quelques secondes.",
      promise: "Finitions propres, tenue optimisée.",
      location_badge: "Gravelines",
      cta_primary_text: "Réserver sur Calendly",
      cta_primary_url: "", // vide = CTA générique Calendly
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
    reservation: {
      // Image DataURL (optimisée) — vide = fallback (image du site)
      image_data_url: "",
      badge: "Réservation en 30 secondes",
      title: "Réserver votre créneau",
      text: "Choisissez un créneau disponible en quelques secondes. Confirmation immédiate.",
      cta_text: "Voir les créneaux",
      // vide = CTA générique Calendly
      cta_url: "",
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
    reservation: { ...d.reservation, ...((s.reservation || {})) },
  };
}

function fillSettingsForm(settings) {
  const s = mergeSettings(settings);
  hero_h1.value = s.hero.h1 || "";
  hero_subtitle.value = s.hero.subtitle || "";
  hero_promise.value = s.hero.promise || "";
  hero_location.value = s.hero.location_badge || "";
  hero_cta_primary_text.value = s.hero.cta_primary_text || "";
  hero_cta_primary_url.value = s.hero.cta_primary_url || "";
  hero_cta_secondary_text.value = s.hero.cta_secondary_text || "";
  hero_cta_secondary_url.value = s.hero.cta_secondary_url || "";

  contact_phone.value = s.contact.phone || "";
  contact_email.value = s.contact.email || "";
  contact_city.value = s.contact.city || "";
  contact_address.value = s.contact.address || "";
  contact_hours.value = s.contact.hours || "";
  contact_whatsapp.value = s.contact.links.whatsapp || "";
  contact_instagram.value = s.contact.links.instagram || "";
  contact_google.value = s.contact.links.google || "";
  contact_calendly.value = s.contact.links.calendly || "";

// Réservation (à côté du Hero)
reservation_badge.value = s.reservation.badge || "";
reservation_title.value = s.reservation.title || "";
reservation_text.value = s.reservation.text || "";
reservation_cta_text.value = s.reservation.cta_text || "";
reservation_cta_url.value = s.reservation.cta_url || "";

const imgUrl = (s.reservation.image_url || "").trim();
const dataUrl = (s.reservation.image_data_url || "").trim();
reservationImageDataUrl = dataUrl;
if (reservation_image_wrap && reservation_image_preview) {
  const src = imgUrl || dataUrl;
  if (src) {
    reservation_image_preview.src = src;
    reservation_image_wrap.hidden = false;
  } else {
    reservation_image_preview.removeAttribute("src");
    reservation_image_wrap.hidden = true;
  }
}

  // Réservation
  reservation_badge.value = s.reservation.badge || "";
  reservation_title.value = s.reservation.title || "";
  reservation_text.value = s.reservation.text || "";
  reservation_cta_text.value = s.reservation.cta_text || "";
  reservation_cta_url.value = s.reservation.cta_url || "";

  reservationImageDataUrl = (s.reservation.image_data_url || "").trim();
  if (reservation_image_wrap && reservation_image_preview) {
    if (reservationImageDataUrl) {
      reservation_image_preview.src = reservationImageDataUrl;
      reservation_image_wrap.hidden = false;
    } else {
      reservation_image_preview.src = "";
      reservation_image_wrap.hidden = true;
    }
  }
}


function isValidUrlMaybe(v) {
  const s = (v || "").trim();
  if (!s) return true;
  try { new URL(s); return true; } catch { return false; }
}

function collectSettingsFromForm(current) {
  const base = mergeSettings(current);
  const next = structuredClone(base);
  next.hero.h1 = hero_h1.value.trim();
  next.hero.subtitle = hero_subtitle.value.trim();
  next.hero.promise = hero_promise.value.trim();
  next.hero.location_badge = hero_location.value.trim();
  next.hero.cta_primary_text = hero_cta_primary_text.value.trim();
  next.hero.cta_primary_url = hero_cta_primary_url.value.trim();
  next.hero.cta_secondary_text = hero_cta_secondary_text.value.trim();
  next.hero.cta_secondary_url = hero_cta_secondary_url.value.trim();

  next.contact.phone = contact_phone.value.trim();
  next.contact.email = contact_email.value.trim();
  next.contact.city = contact_city.value.trim();
  next.contact.address = contact_address.value.trim();
  next.contact.hours = contact_hours.value;
  next.contact.links.whatsapp = contact_whatsapp.value.trim();
  next.contact.links.instagram = contact_instagram.value.trim();
  next.contact.links.google = contact_google.value.trim();
  next.contact.links.calendly = contact_calendly.value.trim();

  // Réservation
  next.reservation.badge = reservation_badge.value.trim();
  next.reservation.title = reservation_title.value.trim();
  next.reservation.text = reservation_text.value.trim();
  next.reservation.cta_text = reservation_cta_text.value.trim();
  next.reservation.cta_url = reservation_cta_url.value.trim();
  next.reservation.image_data_url = (reservationImageDataUrl || "").trim();

  next.updated_at = new Date().toISOString();
  if (!next.created_at) next.created_at = next.updated_at;
  return next;
}

// ----------------- Services (CRUD + reorder)
let services = [];
let dragServiceId = null;

const serviceForm = $("#serviceForm");
const serviceFormTitle = $("#serviceFormTitle");
const resetServiceFormBtn = $("#resetServiceFormBtn");
const cancelEditBtn = $("#cancelEditBtn");

const serviceId = $("#serviceId");
const category = $("#category");
const title = $("#title");
const price = $("#price");
const duration = $("#duration");
const link_url = $("#link_url");
const description = $("#description");
const featured = $("#featured");
const servicesList = $("#servicesList");
const serviceSearch = $("#serviceSearch");
const clearServiceSearch = $("#clearServiceSearch");

function resetServiceForm() {
  serviceId.value = "";
  category.value = "Manucure";
  title.value = "";
  price.value = "";
  duration.value = "";
  link_url.value = "";
  description.value = "";
  featured.checked = false;
  serviceFormTitle.textContent = "Ajouter une prestation";
  $("#saveServiceBtn").textContent = "Ajouter";
  cancelEditBtn.hidden = true;
}

function normalizeService(raw, idx) {
  const d = raw.duration === "" || raw.duration == null ? null : +raw.duration;
  return {
    id: raw.id || uuid(),
    category: raw.category || "Manucure",
    title: (raw.title || "").trim(),
    price: Number.isFinite(+raw.price) ? Math.round(+raw.price) : 0,
    duration: Number.isFinite(d) && d > 0 ? Math.round(d) : null,
    link_url: (raw.link_url || "").trim(),
    description: (raw.description || "").trim(),
    featured: !!raw.featured,
    order_index: Number.isFinite(+raw.order_index) ? +raw.order_index : idx * 10,
    updated_at: new Date().toISOString(),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

function fillForm(s) {
  serviceId.value = s.id;
  category.value = s.category;
  title.value = s.title;
  price.value = s.price;
  duration.value = s.duration == null ? "" : s.duration;
  link_url.value = s.link_url;
  description.value = s.description;
  featured.checked = !!s.featured;
  serviceFormTitle.textContent = "Modifier la prestation";
  $("#saveServiceBtn").textContent = "Enregistrer";
  cancelEditBtn.hidden = false;
}

function formatMeta(s) {
  const d = s.duration ? ` • ${s.duration} min` : "";
  const link = s.link_url ? "• lien OK" : "• lien générique";
  return `${s.price}€${d} ${link}`;
}

function renderServices() {
  const q = (serviceSearch.value || "").trim().toLowerCase();
  const list = services
    .slice()
    .sort((a,b)=>a.order_index-b.order_index)
    .filter(s => !q || `${s.title} ${s.category} ${s.description}`.toLowerCase().includes(q));

  servicesList.innerHTML = "";
  if (!list.length) {
    servicesList.innerHTML = `<p class="muted">Aucune prestation.</p>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "admin-dnd-list";
  wrap.setAttribute("role","list");

  list.forEach(s => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.draggable = true;
    row.dataset.id = s.id;
    row.setAttribute("role","listitem");

    row.innerHTML = `
      <div class="admin-row__drag" aria-hidden="true">⋮⋮</div>
      <div class="admin-row__main">
        <div class="admin-row__top">
          <strong>${esc(s.title)}</strong>
          ${s.featured ? `<span class="badge">Populaire</span>` : ""}
        </div>
        <div class="admin-row__meta">
          <span class="pill pill--dark">${esc(s.category)}</span>
          <span class="muted">${esc(formatMeta(s))}</span>
        </div>
        ${s.description ? `<div class="admin-row__desc muted">${esc(s.description)}</div>` : ""}
      </div>
      <div class="admin-row__actions">
        <button class="btn btn--ghost btn--sm" data-action="edit">Modifier</button>
        <button class="btn btn--ghost btn--sm" data-action="delete">Supprimer</button>
      </div>
    `;

    row.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "edit") {
        fillForm(s);
        setStatus(adminStatus, "Mode édition activé.", "ok");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (btn.dataset.action === "delete") {
        if (!confirm(`Supprimer "${s.title}" ?`)) return;
        services = services.filter(x => x.id !== s.id);
        reindex(services);
        saveServices(services);
        renderServices();
        setStatus(adminStatus, "Prestation supprimée.", "ok");
      }
    });

    row.addEventListener("dragstart", () => { dragServiceId = s.id; row.classList.add("is-dragging"); });
    row.addEventListener("dragend", () => { dragServiceId = null; row.classList.remove("is-dragging"); row.classList.remove("is-over"); });
    row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("is-over"); });
    row.addEventListener("dragleave", () => row.classList.remove("is-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("is-over");
      if (!dragServiceId || dragServiceId === s.id) return;
      const from = services.findIndex(x => x.id === dragServiceId);
      const to = services.findIndex(x => x.id === s.id);
      if (from < 0 || to < 0) return;
      const [moved] = services.splice(from, 1);
      services.splice(to, 0, moved);
      reindex(services);
      saveServices(services);
      renderServices();
      setStatus(adminStatus, "Ordre mis à jour.", "ok");
    });

    wrap.appendChild(row);
  });

  servicesList.appendChild(wrap);
}

// ----------------- Gallery
let gallery = [];
let dragGalleryId = null;

// ----------------- Reviews (CRUD + reorder)
let reviews = [];
let dragReviewId = null;

const reviewForm = $("#reviewForm");
const reviewFormTitle = $("#reviewFormTitle");
const resetReviewFormBtn = $("#resetReviewFormBtn");
const cancelReviewEditBtn = $("#cancelReviewEditBtn");
const reviewsList = $("#reviewsList");

const reviewId = $("#reviewId");
const review_name = $("#review_name");
const review_rating = $("#review_rating");
const review_text = $("#review_text");
const review_date = $("#review_date");

function normalizeReview(raw, idx) {
  const rating = Math.max(1, Math.min(5, parseInt(raw.rating, 10) || 5));
  return {
    id: raw.id || uuid(),
    name: (raw.name || "").trim() || "Cliente",
    rating,
    text: (raw.text || "").trim(),
    date: (raw.date || "").trim(),
    order_index: Number.isFinite(+raw.order_index) ? +raw.order_index : idx * 10,
    updated_at: new Date().toISOString(),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

function stars(n) {
  const r = Math.max(1, Math.min(5, +n || 5));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function resetReviewForm() {
  reviewId.value = "";
  review_name.value = "";
  review_rating.value = "5";
  review_text.value = "";
  review_date.value = "";
  reviewFormTitle.textContent = "Ajouter un avis";
  $("#saveReviewBtn").textContent = "Ajouter";
  cancelReviewEditBtn.hidden = true;
}

function fillReviewForm(r) {
  reviewId.value = r.id;
  review_name.value = r.name;
  review_rating.value = String(r.rating || 5);
  review_text.value = r.text;
  review_date.value = r.date || "";
  reviewFormTitle.textContent = "Modifier l’avis";
  $("#saveReviewBtn").textContent = "Enregistrer";
  cancelReviewEditBtn.hidden = false;
}

function renderReviews() {
  reviewsList.innerHTML = "";
  const list = reviews.slice().sort((a,b)=>(+a.order_index||0)-(+b.order_index||0));
  if (!list.length) {
    reviewsList.innerHTML = `<p class="muted">Aucun avis. Ajoutez-en via le formulaire.</p>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "admin-dnd-list";
  wrap.setAttribute("role","list");

  list.forEach(r => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.draggable = true;
    row.dataset.id = r.id;
    row.setAttribute("role","listitem");
    row.innerHTML = `
      <div class="admin-row__drag" aria-hidden="true">⋮⋮</div>
      <div class="admin-row__main">
        <div class="admin-row__top">
          <strong>${esc(r.name)}</strong>
          <span class="admin-stars" aria-label="${r.rating} sur 5">${stars(r.rating)}</span>
        </div>
        <div class="admin-row__meta">
          ${r.date ? `<span class="pill pill--dark">${esc(r.date)}</span>` : ""}
          <span class="muted">${esc(r.text.slice(0, 120))}${r.text.length > 120 ? "…" : ""}</span>
        </div>
      </div>
      <div class="admin-row__actions">
        <button class="btn btn--ghost btn--sm" data-action="edit">Modifier</button>
        <button class="btn btn--ghost btn--sm" data-action="delete">Supprimer</button>
      </div>
    `;

    row.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "edit") {
        fillReviewForm(r);
        setStatus(adminStatus, "Mode édition (avis) activé.", "ok");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (btn.dataset.action === "delete") {
        if (!confirm(`Supprimer l’avis de "${r.name}" ?`)) return;
        reviews = reviews.filter(x => x.id !== r.id);
        reindex(reviews);
        saveReviews(reviews);
        renderReviews();
        setStatus(adminStatus, "Avis supprimé.", "ok");
      }
    });

    row.addEventListener("dragstart", () => { dragReviewId = r.id; row.classList.add("is-dragging"); });
    row.addEventListener("dragend", () => { dragReviewId = null; row.classList.remove("is-dragging"); row.classList.remove("is-over"); });
    row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("is-over"); });
    row.addEventListener("dragleave", () => row.classList.remove("is-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("is-over");
      if (!dragReviewId || dragReviewId === r.id) return;
      const from = reviews.findIndex(x => x.id === dragReviewId);
      const to = reviews.findIndex(x => x.id === r.id);
      if (from < 0 || to < 0) return;
      const [moved] = reviews.splice(from, 1);
      reviews.splice(to, 0, moved);
      reindex(reviews);
      saveReviews(reviews);
      renderReviews();
      setStatus(adminStatus, "Ordre des avis mis à jour.", "ok");
    });

    wrap.appendChild(row);
  });

  reviewsList.appendChild(wrap);
}

const dropZone = $("#dropZone");
const fileInput = $("#fileInput");
const galleryList = $("#galleryList");
const clearGalleryBtn = $("#clearGalleryBtn");

function renderGallery() {
  galleryList.innerHTML = "";
  const list = gallery.slice().sort((a,b)=>a.order_index-b.order_index);
  if (!list.length) {
    galleryList.innerHTML = `<p class="muted">Aucune image. Ajoutez via glisser-déposer ou Ctrl+V.</p>`;
    return;
  }

  list.forEach(g => {
    const card = document.createElement("div");
    card.className = "gadmin-item";
    card.draggable = true;
    card.dataset.id = g.id;

    card.innerHTML = `
      <div class="gadmin-thumb"><img src="${g.dataUrl}" alt="${esc(g.alt || "Image galerie")}" loading="lazy" decoding="async"></div>
      <div class="gadmin-meta">
        <input class="gadmin-alt" type="text" placeholder="Alt (ex: Pose gel nude)" value="${esc(g.alt || "")}">
        <div class="gadmin-actions">
          <button class="btn btn--ghost btn--sm" data-action="delete">Supprimer</button>
        </div>
      </div>
    `;

    const alt = card.querySelector(".gadmin-alt");
    alt.addEventListener("input", () => {
      const item = gallery.find(x => x.id === g.id);
      if (!item) return;
      item.alt = alt.value.trim();
      item.updated_at = new Date().toISOString();
      saveGallery(gallery);
    });

    card.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      if (!confirm("Supprimer cette image ?")) return;
      gallery = gallery.filter(x => x.id !== g.id);
      reindex(gallery);
      saveGallery(gallery);
      renderGallery();
      setStatus(adminStatus, "Image supprimée.", "ok");
    });

    card.addEventListener("dragstart", () => { dragGalleryId = g.id; card.classList.add("is-dragging"); });
    card.addEventListener("dragend", () => { dragGalleryId = null; card.classList.remove("is-dragging"); card.classList.remove("is-over"); });
    card.addEventListener("dragover", (e) => { e.preventDefault(); card.classList.add("is-over"); });
    card.addEventListener("dragleave", () => card.classList.remove("is-over"));
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("is-over");
      if (!dragGalleryId || dragGalleryId === g.id) return;
      const from = gallery.findIndex(x => x.id === dragGalleryId);
      const to = gallery.findIndex(x => x.id === g.id);
      if (from < 0 || to < 0) return;
      const [moved] = gallery.splice(from, 1);
      gallery.splice(to, 0, moved);
      reindex(gallery);
      saveGallery(gallery);
      renderGallery();
      setStatus(adminStatus, "Ordre de la galerie mis à jour.", "ok");
    });

    galleryList.appendChild(card);
  });
}

function fileToImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = rej;
    img.src = url;
  });
}

function fitCanvas(img, maxSide) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const ratio = w / h;

  if (w > h && w > maxSide) { w = maxSide; h = Math.round(maxSide / ratio); }
  else if (h >= w && h > maxSide) { h = maxSide; w = Math.round(maxSide * ratio); }

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  return { canvas, ctx, w, h };
}

async function processImage(file) {
  const img = await fileToImage(file);
  const { canvas, ctx, w, h } = fitCanvas(img, 1600);
  ctx.drawImage(img, 0, 0, w, h);

  try {
    const webp = canvas.toDataURL("image/webp", 0.82);
    if (webp.startsWith("data:image/webp")) return webp;
  } catch {}
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function addImages(files) {
  const list = Array.from(files).filter(f => f.type?.startsWith("image/"));
  if (!list.length) { setStatus(adminStatus, "Aucune image détectée.", "err"); return; }

  setStatus(adminStatus, `Ajout de ${list.length} image(s)…`, "ok");

  for (const f of list) {
    try {
      const dataUrl = await processImage(f);
      gallery.push({ id: uuid(), dataUrl, alt: "", order_index: gallery.length*10, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      reindex(gallery);
      saveGallery(gallery);
    } catch {
      setStatus(adminStatus, "Erreur lors du traitement d’une image.", "err");
    }
  }

  renderGallery();
  setStatus(adminStatus, "Images ajoutées.", "ok");
}

// ----------------- Backup
const exportBtn = $("#exportBtn");
const importFile = $("#importFile");
const importBtn = $("#importBtn");

function doExport() {
  const payload = {
    version: 2,
    exported_at: new Date().toISOString(),
    settings: loadSettings(),
    services,
    gallery,
    reviews,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `la-main-dor-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus(adminStatus, "Export terminé.", "ok");
}

async function doImport() {
  const file = importFile.files?.[0];
  if (!file) { setStatus(adminStatus, "Choisissez un fichier JSON.", "err"); return; }
  try {
    const data = JSON.parse(await file.text());
    const incomingSettings = data.settings || null;
    const s = Array.isArray(data.services) ? data.services : [];
    const g = Array.isArray(data.gallery) ? data.gallery : [];
    const r = Array.isArray(data.reviews) ? data.reviews : [];
    services = s.map((x,i)=>normalizeService(x,i));
    gallery = g.map((x,i)=>({ id: x.id || uuid(), dataUrl: x.dataUrl || "", alt: (x.alt||"").trim(), order_index: Number.isFinite(+x.order_index)?+x.order_index:i*10, created_at: x.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }));
    reviews = r.map((x,i)=>normalizeReview(x,i));
    reindex(services); reindex(gallery);
    reindex(reviews);
    saveServices(services); saveGallery(gallery); saveReviews(reviews);
    if (incomingSettings) saveSettings(mergeSettings(incomingSettings));
    renderServices(); renderGallery(); renderReviews();
    fillSettingsForm(loadSettings());
    setStatus(adminStatus, "Import réussi.", "ok");
  } catch {
    setStatus(adminStatus, "Import impossible : fichier invalide.", "err");
  }
}

// ----------------- Events
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus(loginStatus, "");
  const pwd = $("#password").value || "";
  const hash = await sha256Hex(pwd);
  if (hash !== ADMIN_PASS_HASH_SHA256_HEX) {
    setStatus(loginStatus, "Mot de passe incorrect.", "err");
    return;
  }
  // Utilisé pour les appels serveur (Edge Function) pendant la session.
  sessionStorage.setItem("lmd_admin_password", pwd);
  setAuthed(true);
  showApp();
  setStatus(adminStatus, "Connexion réussie.", "ok");
});

logoutBtn?.addEventListener("click", () => {
  setAuthed(false);
  sessionStorage.removeItem("lmd_admin_password");
  showLogin();
  setStatus(loginStatus, "Déconnecté.", "ok");
});

tabBtns.forEach(b => b.addEventListener("click", () => setTab(b.dataset.adminTab)));

heroForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const current = loadSettings();
  const next = collectSettingsFromForm(current);

  // validations
  const email = (next.contact.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus(adminStatus, "Email invalide.", "err");
    return;
  }
  const urls = [
    { label: "Lien du CTA principal", v: next.hero.cta_primary_url },
    { label: "WhatsApp", v: next.contact.links.whatsapp },
    { label: "Instagram", v: next.contact.links.instagram },
    { label: "Avis Google", v: next.contact.links.google },
    { label: "Calendly", v: next.contact.links.calendly },
  ];
  for (const u of urls) {
    if (!isValidUrlMaybe(u.v) && !(u.label.includes("CTA") && (u.v || "").trim() === "")) {
      setStatus(adminStatus, `${u.label} : URL invalide.`, "err");
      return;
    }
  }

  saveSettings(next);
  setStatus(adminStatus, "Hero enregistré.", "ok");
});

contactForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const current = loadSettings();
  const next = collectSettingsFromForm(current);

  const email = (next.contact.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus(adminStatus, "Email invalide.", "err");
    return;
  }
  const urls = [
    { label: "WhatsApp", v: next.contact.links.whatsapp },
    { label: "Instagram", v: next.contact.links.instagram },
    { label: "Avis Google", v: next.contact.links.google },
    { label: "Calendly", v: next.contact.links.calendly },
  ];
  for (const u of urls) {
    if (!isValidUrlMaybe(u.v)) {
      setStatus(adminStatus, `${u.label} : URL invalide.`, "err");
      return;
    }
  }

  saveSettings(next);
  setStatus(adminStatus, "Contact & infos enregistrés.", "ok");
});

// Section réservation (à côté du Hero)
reservation_image?.addEventListener("change", async () => {
  const file = reservation_image.files?.[0];
  if (!file) return;
  try {
    setStatus(adminStatus, "Optimisation de l\u2019image en cours…");
    const { dataUrl, width, height, bytes } = await compressImageFileToDataUrl(file, {
      maxW: 900,
      maxH: 900,
      quality: 0.82,
      format: "image/jpeg",
    });

    reservationImageDataUrl = dataUrl;
    if (reservation_image_preview && reservation_image_wrap) {
      reservation_image_preview.src = dataUrl;
      reservation_image_wrap.hidden = false;
    }

    // Avertissement poids (localStorage + export)
    if (bytes > 1_200_000) {
      setStatus(
        adminStatus,
        `Image enregistr\u00e9e (\u2248 ${Math.round(bytes / 1024)} Ko, ${width}×${height}). Conseil : utilise une image plus l\u00e9g\u00e8re pour \u00e9viter un localStorage plein.`,
        "err"
      );
    } else {
      setStatus(
        adminStatus,
        `Image enregistr\u00e9e (\u2248 ${Math.round(bytes / 1024)} Ko, ${width}×${height}).`,
        "ok"
      );
    }
  } catch (err) {
    console.error(err);
    setStatus(adminStatus, "Impossible de traiter l\u2019image.", "err");
  }
});

reservation_image_remove?.addEventListener("click", () => {
  reservationImageDataUrl = "";
  if (reservation_image) reservation_image.value = "";
  if (reservation_image_preview) reservation_image_preview.src = "";
  if (reservation_image_wrap) reservation_image_wrap.hidden = true;
  setStatus(adminStatus, "Photo retir\u00e9e.", "ok");
});

reservationForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const current = loadSettings();
  const next = collectSettingsFromForm(current);

  // validations (URL optionnelle)
  const url = (next.reservation?.cta_url || "").trim();
  if (url && !isValidUrlMaybe(url)) {
    setStatus(adminStatus, "Lien du bouton : URL invalide.", "err");
    return;
  }

  saveSettings(next);
  setStatus(adminStatus, "Section r\u00e9servation enregistr\u00e9e.", "ok");
});

resetServiceFormBtn?.addEventListener("click", resetServiceForm);
cancelEditBtn?.addEventListener("click", () => { resetServiceForm(); setStatus(adminStatus, "Édition annulée.", "ok"); });

serviceForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const isEdit = !!serviceId.value;
  const base = isEdit ? (services.find(s=>s.id===serviceId.value) || {}) : {};
  const raw = {
    id: isEdit ? serviceId.value : uuid(),
    category: category.value,
    title: title.value,
    price: price.value,
    duration: duration.value === "" ? null : duration.value,
    link_url: link_url.value,
    description: description.value,
    featured: featured.checked,
    order_index: base.order_index ?? (services.length * 10),
    created_at: base.created_at,
  };
  const norm = normalizeService(raw, services.length);
  if (!norm.title) { setStatus(adminStatus, "Le nom de la prestation est obligatoire.", "err"); return; }

  if (isEdit) {
    services = services.map(s => s.id === norm.id ? { ...s, ...norm } : s);
    setStatus(adminStatus, "Prestation modifiée.", "ok");
  } else {
    services.push(norm);
    reindex(services);
    setStatus(adminStatus, "Prestation ajoutée.", "ok");
  }

  saveServices(services);
  renderServices();
  resetServiceForm();
});

serviceSearch?.addEventListener("input", renderServices);
clearServiceSearch?.addEventListener("click", () => { serviceSearch.value = ""; renderServices(); });

// Gallery events
dropZone?.addEventListener("click", () => fileInput.click());
dropZone?.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });
dropZone?.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("is-over"); });
dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-over"));
dropZone?.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("is-over");
  if (e.dataTransfer?.files?.length) await addImages(e.dataTransfer.files);
});

fileInput?.addEventListener("change", async () => {
  if (fileInput.files?.length) await addImages(fileInput.files);
  fileInput.value = "";
});

// Ctrl+V (uniquement onglet Galerie)
window.addEventListener("paste", async (e) => {
  if (!isAuthed() || galleryPanel.hidden) return;
  const items = e.clipboardData?.items;
  if (!items?.length) return;
  const files = [];
  for (const it of items) {
    if (it.kind === "file") {
      const f = it.getAsFile();
      if (f && f.type.startsWith("image/")) files.push(f);
    }
  }
  if (files.length) {
    e.preventDefault();
    await addImages(files);
  }
});

clearGalleryBtn?.addEventListener("click", () => {
  if (!confirm("Tout supprimer dans la galerie ?")) return;
  gallery = [];
  saveGallery(gallery);
  renderGallery();
  setStatus(adminStatus, "Galerie vidée.", "ok");
});

resetReviewFormBtn?.addEventListener("click", resetReviewForm);
cancelReviewEditBtn?.addEventListener("click", () => { resetReviewForm(); setStatus(adminStatus, "Édition (avis) annulée.", "ok"); });

reviewForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const isEdit = !!reviewId.value;
  const base = isEdit ? (reviews.find(r=>r.id===reviewId.value) || {}) : {};

  const raw = {
    id: isEdit ? reviewId.value : uuid(),
    name: review_name.value,
    rating: review_rating.value,
    text: review_text.value,
    date: review_date.value,
    order_index: base.order_index ?? (reviews.length * 10),
    created_at: base.created_at,
  };
  const norm = normalizeReview(raw, reviews.length);
  if (!norm.text) { setStatus(adminStatus, "Le texte de l’avis est obligatoire.", "err"); return; }

  if (isEdit) {
    reviews = reviews.map(r => r.id === norm.id ? { ...r, ...norm } : r);
    setStatus(adminStatus, "Avis modifié.", "ok");
  } else {
    reviews.push(norm);
    reindex(reviews);
    setStatus(adminStatus, "Avis ajouté.", "ok");
  }

  saveReviews(reviews);
  renderReviews();
  resetReviewForm();
});

exportBtn?.addEventListener("click", doExport);
importBtn?.addEventListener("click", doImport);

// ----------------- Init
document.addEventListener("DOMContentLoaded", async () => {
  await hydrateFromSupabaseIfAvailable();
  if (isAuthed()) showApp(); else showLogin();
  services = loadServices();
  gallery = loadGallery();
  reviews = loadReviews();
  const settings = mergeSettings(loadSettings());
  saveSettings(settings);
  fillSettingsForm(settings);
  // ensure order indexes
  reindex(services); reindex(gallery);
  reindex(reviews);
  saveServices(services); saveGallery(gallery); saveReviews(reviews);
  renderServices();
  renderGallery();
  renderReviews();
  resetServiceForm();
  resetReviewForm();
  setTab("settings");
});


// ----------------- Supabase : hydrater l’admin depuis la config en ligne
async function hydrateFromSupabaseIfAvailable() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data: row, error: sErr } = await sb
    .from("settings")
    .select("value")
    .eq("key", "global")
    .single();

  if (sErr || !row?.value) return;
  const value = row.value || {};

  // Injecte en localStorage pour réutiliser les écrans admin existants
  localStorage.setItem(LS.SETTINGS, JSON.stringify(value));
  localStorage.setItem(LS.SERVICES, JSON.stringify(Array.isArray(value.services) ? value.services : []));
  localStorage.setItem(LS.GALLERY, JSON.stringify(Array.isArray(value.gallery) ? value.gallery : []));

  const { data: reviews, error: rErr } = await sb
    .from("reviews")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (!rErr && Array.isArray(reviews)) {
    // on remet le format attendu par ton admin
    const mapped = reviews.map(r => ({
      id: r.id,
      name: r.author,
      rating: r.rating,
      text: r.text,
      date: r.date || "",
      order_index: r.order_index || 0,
    }));
    localStorage.setItem(LS.REVIEWS, JSON.stringify(mapped));
  }
}
