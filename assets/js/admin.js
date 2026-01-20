// /assets/js/admin.js

const LS = {
  SESSION: "lmd_admin_authed",
  SERVICES: "lmd_services",
  GALLERY: "lmd_gallery",
};

// Mot de passe = 18121995, stocké sous forme de hash SHA-256 (protection simple, côté front)
const ADMIN_PASS_HASH_SHA256_HEX =
  "293a5e11f0aad8d69be0ee35a564fea7828e192ddd70057eb88872f1878d96a1";

const $ = (sel) => document.querySelector(sel);

const loginView = $("#loginView");
const appView = $("#appView");
const logoutBtn = $("#logoutBtn");
const loginForm = $("#loginForm");
const loginStatus = $("#loginStatus");
const adminStatus = $("#adminStatus");

const servicesPanel = $("#servicesPanel");
const galleryPanel = $("#galleryPanel");
const backupPanel = $("#backupPanel");

const tabs = Array.from(document.querySelectorAll("[data-admin-tab]"));

/* =========================
   Utils
========================= */
function setStatus(el, msg, type = "info") {
  if (!el) return;
  el.textContent = msg || "";
  el.classList.remove("is-ok", "is-err");
  if (type === "ok") el.classList.add("is-ok");
  if (type === "err") el.classList.add("is-err");
}

function safeJSONParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function uuid() {
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeService(s, idx = 0) {
  return {
    id: s.id || uuid(),
    category: s.category || "Manucure",
    title: (s.title || "").trim(),
    price: Number.isFinite(+s.price) ? +s.price : 0,
    duration: s.duration === "" || s.duration == null ? null : (Number.isFinite(+s.duration) ? +s.duration : null),
    link_url: (s.link_url || "").trim(),
    description: (s.description || "").trim(),
    featured: !!s.featured,
    order_index: Number.isFinite(+s.order_index) ? +s.order_index : idx,
    created_at: s.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalizeGalleryItem(g, idx = 0) {
  return {
    id: g.id || uuid(),
    dataUrl: g.dataUrl || "",
    alt: (g.alt || "").trim(),
    order_index: Number.isFinite(+g.order_index) ? +g.order_index : idx,
    created_at: g.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function loadServices() {
  const arr = safeJSONParse(localStorage.getItem(LS.SERVICES), []);
  const norm = arr.map((s, i) => normalizeService(s, i));
  norm.sort((a, b) => a.order_index - b.order_index);
  return norm;
}

function saveServices(arr) {
  try {
    localStorage.setItem(LS.SERVICES, JSON.stringify(arr));
    return true;
  } catch (e) {
    return false;
  }
}

function loadGallery() {
  const arr = safeJSONParse(localStorage.getItem(LS.GALLERY), []);
  const norm = arr.map((g, i) => normalizeGalleryItem(g, i));
  norm.sort((a, b) => a.order_index - b.order_index);
  return norm;
}

function saveGallery(arr) {
  try {
    localStorage.setItem(LS.GALLERY, JSON.stringify(arr));
    return true;
  } catch (e) {
    return false;
  }
}

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* =========================
   Auth (simple)
========================= */
function isAuthed() {
  return localStorage.getItem(LS.SESSION) === "1";
}

function setAuthed(v) {
  if (v) localStorage.setItem(LS.SESSION, "1");
  else localStorage.removeItem(LS.SESSION);
}

async function handleLogin(password) {
  const hash = await sha256Hex(password);
  return hash === ADMIN_PASS_HASH_SHA256_HEX;
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  logoutBtn.hidden = false;
}

function showLogin() {
  loginView.hidden = false;
  appView.hidden = true;
  logoutBtn.hidden = true;
}

/* =========================
   Tabs
========================= */
function setActiveTab(name) {
  const panels = { services: servicesPanel, gallery: galleryPanel, backup: backupPanel };
  for (const [k, el] of Object.entries(panels)) el.hidden = k !== name;

  tabs.forEach(btn => {
    const active = btn.dataset.adminTab === name;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

/* =========================
   Services UI
========================= */
const serviceForm = $("#serviceForm");
const serviceFormTitle = $("#serviceFormTitle");
const serviceId = $("#serviceId");
const category = $("#category");
const title = $("#title");
const price = $("#price");
const duration = $("#duration");
const link_url = $("#link_url");
const description = $("#description");
const featured = $("#featured");
const saveServiceBtn = $("#saveServiceBtn");
const cancelEditBtn = $("#cancelEditBtn");
const resetServiceFormBtn = $("#resetServiceFormBtn");

const servicesList = $("#servicesList");
const serviceSearch = $("#serviceSearch");
const clearServiceSearch = $("#clearServiceSearch");

let services = [];
let dragServiceId = null;

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
  saveServiceBtn.textContent = "Ajouter";
  cancelEditBtn.hidden = true;
}

function fillServiceForm(s) {
  serviceId.value = s.id;
  category.value = s.category;
  title.value = s.title;
  price.value = s.price;
  duration.value = s.duration == null ? "" : s.duration;
  link_url.value = s.link_url;
  description.value = s.description;
  featured.checked = !!s.featured;

  serviceFormTitle.textContent = "Modifier la prestation";
  saveServiceBtn.textContent = "Enregistrer";
  cancelEditBtn.hidden = false;
}

function renderServicesList() {
  const q = (serviceSearch.value || "").trim().toLowerCase();
  const filtered = services.filter(s => {
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q)
    );
  });

  servicesList.innerHTML = "";

  if (filtered.length === 0) {
    servicesList.innerHTML = `<p class="muted">Aucune prestation.</p>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "admin-dnd-list";
  wrap.setAttribute("role", "list");

  filtered.forEach((s) => {
    const item = document.createElement("div");
    item.className = "admin-row";
    item.setAttribute("role", "listitem");
    item.draggable = true;
    item.dataset.id = s.id;

    item.innerHTML = `
      <div class="admin-row__drag" aria-hidden="true">⋮⋮</div>
      <div class="admin-row__main">
        <div class="admin-row__top">
          <strong>${escapeHTML(s.title)}</strong>
          ${s.featured ? `<span class="badge">Populaire</span>` : ""}
        </div>
        <div class="admin-row__meta">
          <span class="pill pill--dark">${escapeHTML(s.category)}</span>
          <span class="muted">${formatPriceDuration(s.price, s.duration)}</span>
          ${s.link_url ? `<span class="muted">• lien OK</span>` : `<span class="muted">• lien générique</span>`}
        </div>
        ${s.description ? `<div class="admin-row__desc muted">${escapeHTML(s.description)}</div>` : ""}
      </div>
      <div class="admin-row__actions">
        <button class="btn btn--ghost btn--sm" data-action="edit">Modifier</button>
        <button class="btn btn--ghost btn--sm" data-action="delete">Supprimer</button>
      </div>
    `;

    item.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === "edit") {
        fillServiceForm(s);
        setStatus(adminStatus, "Mode édition activé.", "ok");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (action === "delete") {
        const ok = confirm(`Supprimer "${s.title}" ?`);
        if (!ok) return;
        services = services.filter(x => x.id !== s.id);
        reindexOrder(services);
        if (!saveServices(services)) {
          setStatus(adminStatus, "Erreur: stockage plein. Exportez puis supprimez des images.", "err");
        } else {
          setStatus(adminStatus, "Prestation supprimée.", "ok");
        }
        renderServicesList();
      }
    });

    // Drag reorder
    item.addEventListener("dragstart", () => {
      dragServiceId = s.id;
      item.classList.add("is-dragging");
    });
    item.addEventListener("dragend", () => {
      dragServiceId = null;
      item.classList.remove("is-dragging");
      document.querySelectorAll(".admin-row.is-over").forEach(el => el.classList.remove("is-over"));
    });
    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      item.classList.add("is-over");
    });
    item.addEventListener("dragleave", () => item.classList.remove("is-over"));
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("is-over");
      if (!dragServiceId || dragServiceId === s.id) return;
      const fromIdx = services.findIndex(x => x.id === dragServiceId);
      const toIdx = services.findIndex(x => x.id === s.id);
      if (fromIdx < 0 || toIdx < 0) return;

      const [moved] = services.splice(fromIdx, 1);
      services.splice(toIdx, 0, moved);
      reindexOrder(services);

      if (!saveServices(services)) {
        setStatus(adminStatus, "Erreur: stockage plein. Exportez puis supprimez des images.", "err");
      } else {
        setStatus(adminStatus, "Ordre des prestations mis à jour.", "ok");
      }
      renderServicesList();
    });

    wrap.appendChild(item);
  });

  servicesList.appendChild(wrap);
}

function reindexOrder(arr) {
  arr.forEach((x, i) => (x.order_index = i * 10));
}

function formatPriceDuration(p, d) {
  const priceStr = `${Math.round(p)}€`;
  const durStr = (d == null || d === 0) ? "" : ` • ${Math.round(d)} min`;
  return `${priceStr}${durStr}`;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

/* =========================
   Gallery UI
========================= */
const dropZone = $("#dropZone");
const fileInput = $("#fileInput");
const galleryList = $("#galleryList");
const clearGalleryBtn = $("#clearGalleryBtn");

let gallery = [];
let dragGalleryId = null;

function renderGalleryList() {
  galleryList.innerHTML = "";

  if (gallery.length === 0) {
    galleryList.innerHTML = `<p class="muted">Aucune image. Ajoutez via glisser-déposer ou Ctrl+V.</p>`;
    return;
  }

  gallery.forEach((g) => {
    const card = document.createElement("div");
    card.className = "gadmin-item";
    card.draggable = true;
    card.dataset.id = g.id;

    card.innerHTML = `
      <div class="gadmin-thumb">
        <img src="${g.dataUrl}" alt="${escapeHTML(g.alt || "Image galerie")}" loading="lazy" decoding="async">
      </div>
      <div class="gadmin-meta">
        <label class="sr-only" for="alt_${g.id}">Texte alternatif</label>
        <input id="alt_${g.id}" class="gadmin-alt" type="text" placeholder="Alt (ex: Pose gel nude)" value="${escapeHTML(g.alt || "")}">
        <div class="gadmin-actions">
          <button class="btn btn--ghost btn--sm" data-action="delete">Supprimer</button>
        </div>
      </div>
    `;

    const altInput = card.querySelector(".gadmin-alt");
    altInput.addEventListener("input", () => {
      const item = gallery.find(x => x.id === g.id);
      if (!item) return;
      item.alt = altInput.value.trim();
      item.updated_at = new Date().toISOString();
      if (!saveGallery(gallery)) {
        setStatus(adminStatus, "Erreur: stockage plein. Exportez puis supprimez des images.", "err");
      }
    });

    card.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "delete") {
        const ok = confirm("Supprimer cette image ?");
        if (!ok) return;
        gallery = gallery.filter(x => x.id !== g.id);
        reindexOrder(gallery);
        if (!saveGallery(gallery)) {
          setStatus(adminStatus, "Erreur: stockage plein. Exportez puis supprimez des images.", "err");
        } else {
          setStatus(adminStatus, "Image supprimée.", "ok");
        }
        renderGalleryList();
      }
    });

    // Drag reorder
    card.addEventListener("dragstart", () => {
      dragGalleryId = g.id;
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", () => {
      dragGalleryId = null;
      card.classList.remove("is-dragging");
      document.querySelectorAll(".gadmin-item.is-over").forEach(el => el.classList.remove("is-over"));
    });
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      card.classList.add("is-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("is-over"));
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("is-over");
      if (!dragGalleryId || dragGalleryId === g.id) return;

      const fromIdx = gallery.findIndex(x => x.id === dragGalleryId);
      const toIdx = gallery.findIndex(x => x.id === g.id);
      if (fromIdx < 0 || toIdx < 0) return;

      const [moved] = gallery.splice(fromIdx, 1);
      gallery.splice(toIdx, 0, moved);
      reindexOrder(gallery);

      if (!saveGallery(gallery)) {
        setStatus(adminStatus, "Erreur: stockage plein. Exportez puis supprimez des images.", "err");
      } else {
        setStatus(adminStatus, "Ordre de la galerie mis à jour.", "ok");
      }
      renderGalleryList();
    });

    galleryList.appendChild(card);
  });
}

async function processImageFile(file) {
  // Resize/compress best-effort
  const maxSide = 1600;
  const quality = 0.82;

  const img = await fileToImage(file);
  const { canvas, ctx, w, h } = fitToCanvas(img, maxSide);

  ctx.drawImage(img, 0, 0, w, h);

  // Try WEBP, fallback JPEG
  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) throw new Error("WEBP non supporté");
  } catch {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

function fitToCanvas(img, maxSide) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  const ratio = w / h;
  if (w > h && w > maxSide) {
    w = maxSide;
    h = Math.round(maxSide / ratio);
  } else if (h >= w && h > maxSide) {
    h = maxSide;
    w = Math.round(maxSide * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  return { canvas, ctx, w, h };
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function addImagesFromFiles(files) {
  const list = Array.from(files).filter(f => f.type && f.type.startsWith("image/"));
  if (list.length === 0) {
    setStatus(adminStatus, "Aucune image détectée.", "err");
    return;
  }

  setStatus(adminStatus, `Ajout de ${list.length} image(s)…`, "ok");

  for (const f of list) {
    try {
      const dataUrl = await processImageFile(f);
      gallery.push(normalizeGalleryItem({ dataUrl, alt: "" }, gallery.length));
      reindexOrder(gallery);

      if (!saveGallery(gallery)) {
        setStatus(adminStatus, "Stockage plein. Exportez le JSON puis supprimez des images.", "err");
        // rollback last push
        gallery.pop();
        reindexOrder(gallery);
        break;
      }
    } catch (e) {
      setStatus(adminStatus, "Erreur lors du traitement d’une image.", "err");
    }
  }

  renderGalleryList();
  setStatus(adminStatus, "Images ajoutées.", "ok");
}

/* =========================
   Backup
========================= */
const exportBtn = $("#exportBtn");
const importFile = $("#importFile");
const importBtn = $("#importBtn");

function exportJSON() {
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    services,
    gallery,
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

async function importJSON() {
  const file = importFile.files && importFile.files[0];
  if (!file) {
    setStatus(adminStatus, "Choisissez un fichier JSON.", "err");
    return;
  }

  try {
    const txt = await file.text();
    const data = JSON.parse(txt);

    if (!data || typeof data !== "object") throw new Error("JSON invalide");
    const importedServices = Array.isArray(data.services) ? data.services : [];
    const importedGallery = Array.isArray(data.gallery) ? data.gallery : [];

    const normS = importedServices.map((s, i) => normalizeService(s, i));
    const normG = importedGallery.map((g, i) => normalizeGalleryItem(g, i));
    reindexOrder(normS);
    reindexOrder(normG);

    // save
    localStorage.setItem(LS.SERVICES, JSON.stringify(normS));
    localStorage.setItem(LS.GALLERY, JSON.stringify(normG));

    services = loadServices();
    gallery = loadGallery();
    renderServicesList();
    renderGalleryList();

    setStatus(adminStatus, "Import réussi. La vitrine est mise à jour.", "ok");
  } catch {
    setStatus(adminStatus, "Import impossible : fichier invalide.", "err");
  }
}

/* =========================
   Events / Boot
========================= */
function boot() {
  // auth
  if (isAuthed()) showApp();
  else showLogin();

  // load data
  services = loadServices();
  gallery = loadGallery();

  renderServicesList();
  renderGalleryList();

  // default tab
  setActiveTab("services");
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus(loginStatus, "", "info");

  const pwd = $("#password").value;
  if (!pwd) return;

  try {
    const ok = await handleLogin(pwd);
    if (!ok) {
      setStatus(loginStatus, "Mot de passe incorrect.", "err");
      return;
    }
    setAuthed(true);
    showApp();
    setStatus(adminStatus, "Connexion réussie.", "ok");
  } catch {
    setStatus(loginStatus, "Erreur de connexion (navigateur).", "err");
  }
});

logoutBtn?.addEventListener("click", () => {
  setAuthed(false);
  showLogin();
  setStatus(loginStatus, "Déconnecté.", "ok");
});

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.adminTab;
    setActiveTab(name);
  });
});

/* Services actions */
resetServiceFormBtn?.addEventListener("click", () => {
  resetServiceForm();
  setStatus(adminStatus, "Formulaire réinitialisé.", "ok");
});

cancelEditBtn?.addEventListener("click", () => {
  resetServiceForm();
  setStatus(adminStatus, "Édition annulée.", "ok");
});

serviceForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const isEdit = !!serviceId.value;
  const raw = {
    id: serviceId.value || uuid(),
    category: category.value,
    title: title.value,
    price: price.value,
    duration: duration.value === "" ? null : duration.value,
    link_url: link_url.value,
    description: description.value,
    featured: featured.checked,
    order_index: isEdit
      ? (services.find(s => s.id === serviceId.value)?.order_index ?? services.length * 10)
      : services.length * 10,
  };

  const norm = normalizeService(raw, services.length);

  if (!norm.title) {
    setStatus(adminStatus, "Le nom de la prestation est obligatoire.", "err");
    return;
  }

  if (isEdit) {
    services = services.map(s => (s.id === norm.id ? { ...s, ...norm, updated_at: new Date().toISOString() } : s));
    setStatus(adminStatus, "Prestation modifiée.", "ok");
  } else {
    services.push(norm);
    reindexOrder(services);
    setStatus(adminStatus, "Prestation ajoutée.", "ok");
  }

  if (!saveServices(services)) {
    setStatus(adminStatus, "Erreur: stockage plein. Exportez puis supprimez des images.", "err");
    return;
  }

  renderServicesList();
  resetServiceForm();
});

serviceSearch?.addEventListener("input", renderServicesList);
clearServiceSearch?.addEventListener("click", () => {
  serviceSearch.value = "";
  renderServicesList();
});

/* Gallery: drag&drop + click */
dropZone?.addEventListener("click", () => fileInput.click());
dropZone?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("is-over");
});
dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-over"));
dropZone?.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("is-over");
  const files = e.dataTransfer?.files;
  if (files && files.length) await addImagesFromFiles(files);
});

fileInput?.addEventListener("change", async () => {
  const files = fileInput.files;
  if (files && files.length) await addImagesFromFiles(files);
  fileInput.value = "";
});

/* Gallery: paste Ctrl+V */
window.addEventListener("paste", async (e) => {
  // only if authed + on gallery tab
  if (!isAuthed()) return;
  const activeGallery = !galleryPanel.hidden;
  if (!activeGallery) return;

  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return;

  const files = [];
  for (const it of items) {
    if (it.kind === "file") {
      const f = it.getAsFile();
      if (f && f.type.startsWith("image/")) files.push(f);
    }
  }
  if (files.length) {
    e.preventDefault();
    await addImagesFromFiles(files);
  }
});

clearGalleryBtn?.addEventListener("click", () => {
  const ok = confirm("Tout supprimer dans la galerie ?");
  if (!ok) return;
  gallery = [];
  saveGallery(gallery);
  renderGalleryList();
  setStatus(adminStatus, "Galerie vidée.", "ok");
});

/* Backup */
exportBtn?.addEventListener("click", exportJSON);
importBtn?.addEventListener("click", importJSON);

/* Init */
document.addEventListener("DOMContentLoaded", () => {
  resetServiceForm();
  boot();
});
