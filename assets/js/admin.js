// Admin (site statique) — La Main d’Or
// - Mot de passe (protection simple front) + session localStorage
// - CRUD prestations (localStorage)
// - Galerie : drag&drop + Ctrl+V + thumbnails + delete + reorder
// - Export/Import JSON

const LS = {
  SESSION: "lmd_admin_authed",
  SERVICES: "lmd_services",
  GALLERY: "lmd_gallery",
};

const ADMIN_PASS_HASH_SHA256_HEX =
  "293a5e11f0aad8d69be0ee35a564fea7828e192ddd70057eb88872f1878d96a1"; // sha256("18121995")

const $ = (s) => document.querySelector(s);

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
}

function loadGallery() {
  const arr = safeParse(localStorage.getItem(LS.GALLERY), []);
  return Array.isArray(arr) ? arr : [];
}
function saveGallery(arr) {
  localStorage.setItem(LS.GALLERY, JSON.stringify(arr));
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
}

// ----------------- Tabs
const tabBtns = Array.from(document.querySelectorAll("[data-admin-tab]"));
const servicesPanel = $("#servicesPanel");
const galleryPanel = $("#galleryPanel");
const backupPanel = $("#backupPanel");

function setTab(name) {
  const panels = { services: servicesPanel, gallery: galleryPanel, backup: backupPanel };
  for (const [k, el] of Object.entries(panels)) el.hidden = k !== name;
  tabBtns.forEach(b => {
    const active = b.dataset.adminTab === name;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
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
  const payload = { version: 1, exported_at: new Date().toISOString(), services, gallery };
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
    const s = Array.isArray(data.services) ? data.services : [];
    const g = Array.isArray(data.gallery) ? data.gallery : [];
    services = s.map((x,i)=>normalizeService(x,i));
    gallery = g.map((x,i)=>({ id: x.id || uuid(), dataUrl: x.dataUrl || "", alt: (x.alt||"").trim(), order_index: Number.isFinite(+x.order_index)?+x.order_index:i*10, created_at: x.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }));
    reindex(services); reindex(gallery);
    saveServices(services); saveGallery(gallery);
    renderServices(); renderGallery();
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
  setAuthed(true);
  showApp();
  setStatus(adminStatus, "Connexion réussie.", "ok");
});

logoutBtn?.addEventListener("click", () => {
  setAuthed(false);
  showLogin();
  setStatus(loginStatus, "Déconnecté.", "ok");
});

tabBtns.forEach(b => b.addEventListener("click", () => setTab(b.dataset.adminTab)));

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

exportBtn?.addEventListener("click", doExport);
importBtn?.addEventListener("click", doImport);

// ----------------- Init
document.addEventListener("DOMContentLoaded", () => {
  if (isAuthed()) showApp(); else showLogin();
  services = loadServices();
  gallery = loadGallery();
  // ensure order indexes
  reindex(services); reindex(gallery);
  saveServices(services); saveGallery(gallery);
  renderServices();
  renderGallery();
  resetServiceForm();
  setTab("services");
});
