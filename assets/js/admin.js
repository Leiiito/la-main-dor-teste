import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, GENERIC_CALENDLY_URL } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  loginView: document.getElementById("loginView"),
  appView: document.getElementById("appView"),
  loginForm: document.getElementById("loginForm"),
  loginStatus: document.getElementById("loginStatus"),
  adminStatus: document.getElementById("adminStatus"),
  logoutBtn: document.getElementById("logoutBtn"),
  userBadge: document.getElementById("userBadge"),

  tabBtns: Array.from(document.querySelectorAll("[data-admin-tab]")),
  servicesPanel: document.getElementById("servicesPanel"),
  galleryPanel: document.getElementById("galleryPanel"),

  // Services
  servicesList: document.getElementById("servicesList"),
  newServiceBtn: document.getElementById("newServiceBtn"),
  serviceModal: document.getElementById("serviceModal"),
  serviceForm: document.getElementById("serviceForm"),
  serviceModalTitle: document.getElementById("serviceModalTitle"),
  adminServiceSearch: document.getElementById("adminServiceSearch"),
  adminClearServiceSearch: document.getElementById("adminClearServiceSearch"),

  // Service fields
  f_id: document.getElementById("serviceId"),
  f_category: document.getElementById("category"),
  f_title: document.getElementById("title"),
  f_price: document.getElementById("price"),
  f_duration: document.getElementById("duration"),
  f_description: document.getElementById("description"),
  f_calendly: document.getElementById("calendly_url"),
  f_featured: document.getElementById("featured"),
  f_order: document.getElementById("order_index"),

  // Gallery
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  galleryList: document.getElementById("galleryList"),
  refreshGalleryBtn: document.getElementById("refreshGalleryBtn"),
};

let state = {
  user: null,
  services: [],
  gallery: [],
  serviceQuery: "",
  activeTab: "services",
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

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str){ return escapeHtml(str).replaceAll("`","&#096;"); }

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

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function safeUrl(url) {
  try { return url ? new URL(url).toString() : ""; }
  catch { return ""; }
}

function showView(isAuthed) {
  els.loginView.hidden = isAuthed;
  els.appView.hidden = !isAuthed;
  if (isAuthed) {
    const email = state.user?.email || "admin";
    els.userBadge.textContent = email;
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  els.tabBtns.forEach(b => {
    const on = b.dataset.adminTab === tab;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", String(on));
  });
  els.servicesPanel.hidden = tab !== "services";
  els.galleryPanel.hidden = tab !== "gallery";
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  state.user = data.session?.user || null;
  showView(!!state.user);
}

async function login(email, password) {
  setStatus(els.loginStatus, "ok", "Connexion…");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(error);
    setStatus(els.loginStatus, "err", "Connexion impossible. Vérifiez email/mot de passe.");
    return;
  }
  state.user = data.user;
  setStatus(els.loginStatus, "ok", "✅ Connecté.");
  showView(true);
  await refreshAll();
}

async function logout() {
  await supabase.auth.signOut();
  state.user = null;
  setStatus(els.adminStatus, "ok", "Déconnecté.");
  showView(false);
}

function setupAuthUI() {
  els.loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(els.loginForm);
    const email = (fd.get("email") || "").toString().trim();
    const password = (fd.get("password") || "").toString();
    await login(email, password);
  });

  els.logoutBtn?.addEventListener("click", logout);

  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    showView(!!state.user);
  });
}

function setupTabsUI() {
  els.tabBtns.forEach(b => b.addEventListener("click", () => switchTab(b.dataset.adminTab)));
}

function openServiceModal(service = null) {
  const isEdit = !!service?.id;
  els.serviceModalTitle.textContent = isEdit ? "Modifier la prestation" : "Nouvelle prestation";

  const nextOrder = state.services.length ? Math.max(...state.services.map(s => Number(s.order_index) || 0)) + 1 : 0;

  els.f_id.value = service?.id || "";
  els.f_category.value = service?.category || "Manucure";
  els.f_title.value = service?.title || "";
  els.f_price.value = Number.isFinite(service?.price) ? String(service.price) : "0";
  els.f_duration.value = Number.isFinite(service?.duration) ? String(service.duration) : "0";
  els.f_description.value = service?.description || "";
  els.f_calendly.value = service?.calendly_url || "";
  els.f_featured.checked = !!service?.featured;
  els.f_order.value = String(Number.isFinite(service?.order_index) ? service.order_index : nextOrder);

  els.serviceModal.showModal();
}

async function saveServiceFromForm() {
  const payload = {
    category: els.f_category.value,
    title: els.f_title.value.trim(),
    price: Number(els.f_price.value),
    duration: Number(els.f_duration.value),
    description: els.f_description.value.trim() || null,
    calendly_url: safeUrl(els.f_calendly.value.trim()) || null,
    featured: !!els.f_featured.checked,
    order_index: Number(els.f_order.value),
  };

  // Basic validation
  if (!payload.title) throw new Error("Le titre est obligatoire.");
  if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error("Prix invalide.");
  if (!Number.isFinite(payload.duration) || payload.duration < 0) throw new Error("Durée invalide.");

  const id = els.f_id.value || null;

  setStatus(els.adminStatus, "ok", "Enregistrement…");
  if (id) {
    const { error } = await supabase.from("services").update(payload).eq("id", id);
    if (error) throw error;
    setStatus(els.adminStatus, "ok", "✅ Prestation mise à jour.");
  } else {
    const { error } = await supabase.from("services").insert(payload);
    if (error) throw error;
    setStatus(els.adminStatus, "ok", "✅ Prestation ajoutée.");
  }

  await loadServices();
}

async function deleteService(id) {
  if (!id) return;
  const ok = confirm("Supprimer cette prestation ? (Action irréversible)");
  if (!ok) return;

  setStatus(els.adminStatus, "ok", "Suppression…");
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) {
    console.error(error);
    setStatus(els.adminStatus, "err", "Impossible de supprimer (vérifiez les policies RLS).");
    return;
  }
  setStatus(els.adminStatus, "ok", "✅ Prestation supprimée.");
  await loadServices();
}

function renderServices() {
  const q = normalize(state.serviceQuery);
  const list = (state.services || [])
    .slice()
    .sort((a,b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .filter(s => !q ? true : normalize(`${s.title} ${s.category}`).includes(q));

  if (!list.length) {
    els.servicesList.innerHTML = `<div class="note"><p>Aucune prestation. Cliquez sur “Ajouter”.</p></div>`;
    return;
  }

  els.servicesList.innerHTML = list.map(s => `
    <article class="admin-item" draggable="true" data-id="${escapeAttr(s.id)}">
      <div class="admin-item__main">
        <h3>${escapeHtml(s.title)}</h3>
        <div class="admin-item__meta">
          <span class="badge">${escapeHtml(s.category)}</span>
          <span class="badge">${money(s.price)} • ${minutes(s.duration)}</span>
          ${s.featured ? `<span class="badge badge--hot">Populaire</span>` : ""}
          <span class="badge">#${escapeHtml(String(s.order_index ?? 0))}</span>
        </div>
        ${s.description ? `<p class="muted">${escapeHtml(s.description)}</p>` : `<p class="muted">—</p>`}
      </div>
      <div class="admin-item__actions">
        <a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="${escapeAttr(s.calendly_url || GENERIC_CALENDLY_URL)}">Tester “Réserver”</a>
        <button class="btn btn--primary btn--sm" type="button" data-edit="${escapeAttr(s.id)}">Modifier</button>
        <button class="btn btn--ghost btn--sm" type="button" data-del="${escapeAttr(s.id)}">Supprimer</button>
      </div>
    </article>
  `).join("");

  // actions
  els.servicesList.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.edit;
      const service = state.services.find(s => s.id === id);
      openServiceModal(service);
    });
  });
  els.servicesList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteService(btn.dataset.del));
  });

  setupServiceDnD();
}

function setupServiceDnD() {
  const items = Array.from(els.servicesList.querySelectorAll(".admin-item[draggable='true']"));
  let dragging = null;

  items.forEach(it => {
    it.addEventListener("dragstart", () => {
      dragging = it;
      it.classList.add("dragging");
    });
    it.addEventListener("dragend", async () => {
      it.classList.remove("dragging");
      dragging = null;

      // After drop, update order_index based on current DOM order
      const newOrder = Array.from(els.servicesList.querySelectorAll(".admin-item"))
        .map((node, idx) => ({ id: node.dataset.id, order_index: idx }));

      const updates = newOrder.map(u => supabase.from("services").update({ order_index: u.order_index }).eq("id", u.id));
      setStatus(els.adminStatus, "ok", "Réorganisation…");
      const results = await Promise.all(updates);
      const hasErr = results.some(r => r.error);
      if (hasErr) {
        console.error(results.find(r => r.error)?.error);
        setStatus(els.adminStatus, "err", "Erreur de réorganisation (policies RLS ?).");
      } else {
        setStatus(els.adminStatus, "ok", "✅ Ordre mis à jour.");
      }
      await loadServices();
    });

    it.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragging || dragging === it) return;

      const rect = it.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      if (before) it.parentNode.insertBefore(dragging, it);
      else it.parentNode.insertBefore(dragging, it.nextSibling);
    });
  });
}

async function loadServices() {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    setStatus(els.adminStatus, "err", "Impossible de charger les prestations (config Supabase / RLS).");
    state.services = [];
    renderServices();
    return;
  }

  state.services = (data || []).map(s => ({
    id: s.id,
    category: s.category,
    title: s.title,
    price: s.price ?? 0,
    duration: s.duration ?? 0,
    description: s.description || "",
    calendly_url: s.calendly_url || "",
    featured: !!s.featured,
    order_index: s.order_index ?? 0,
  }));

  renderServices();
}

async function ensureBucketPublicUrl(path) {
  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return data.publicUrl;
}

async function compressImage(file, maxW = 1800, quality = 0.82) {
  // Best-effort: compress to JPEG/WebP using canvas.
  // If anything fails, return original file.
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const type = "image/jpeg";
    const blob = await new Promise(res => canvas.toBlob(res, type, quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[a-z0-9]+$/i, ".jpg");
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

function uniquePath(fileName) {
  const safe = fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "")
    .slice(0, 80) || "image.jpg";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(16).slice(2);
  return `${stamp}-${rand}-${safe}`;
}

async function uploadFiles(files) {
  if (!files?.length) return;
  setStatus(els.adminStatus, "ok", `Upload de ${files.length} fichier(s)…`);

  // Start order_index after current max
  const start = state.gallery.length ? Math.max(...state.gallery.map(g => Number(g.order_index) || 0)) + 1 : 0;

  for (let i=0; i<files.length; i++) {
    const original = files[i];
    const file = await compressImage(original);

    const storagePath = uniquePath(file.name);
    const { error: upErr } = await supabase.storage.from("gallery").upload(storagePath, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (upErr) {
      console.error(upErr);
      setStatus(els.adminStatus, "err", `Erreur upload : ${original.name}`);
      continue;
    }

    const publicUrl = await ensureBucketPublicUrl(storagePath);

    const { error: insErr } = await supabase.from("gallery_items").insert({
      storage_path: storagePath,
      public_url: publicUrl,
      alt: original.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 80),
      category: null,
      order_index: start + i,
    });

    if (insErr) {
      console.error(insErr);
      setStatus(els.adminStatus, "err", `Erreur DB (gallery_items) : ${original.name}`);
      // Optionally cleanup storage file (best-effort)
      await supabase.storage.from("gallery").remove([storagePath]);
    }
  }

  setStatus(els.adminStatus, "ok", "✅ Upload terminé.");
  await loadGallery();
}

async function loadGallery() {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    setStatus(els.adminStatus, "err", "Impossible de charger la galerie (config Supabase / RLS).");
    state.gallery = [];
    renderGallery();
    return;
  }

  state.gallery = (data || []).map(it => ({
    id: it.id,
    storage_path: it.storage_path,
    public_url: it.public_url,
    alt: it.alt || "",
    category: it.category || "",
    order_index: it.order_index ?? 0,
  }));

  renderGallery();
}

async function updateGalleryItem(id, patch) {
  if (!id) return;
  const { error } = await supabase.from("gallery_items").update(patch).eq("id", id);
  if (error) throw error;
}

async function deleteGalleryItem(item) {
  if (!item?.id) return;
  const ok = confirm("Supprimer cette image ? (DB + Storage)");
  if (!ok) return;

  setStatus(els.adminStatus, "ok", "Suppression…");
  const { error: dbErr } = await supabase.from("gallery_items").delete().eq("id", item.id);
  if (dbErr) {
    console.error(dbErr);
    setStatus(els.adminStatus, "err", "Suppression DB impossible (RLS ?).");
    return;
  }

  // Best-effort storage cleanup
  if (item.storage_path) await supabase.storage.from("gallery").remove([item.storage_path]);

  setStatus(els.adminStatus, "ok", "✅ Image supprimée.");
  await loadGallery();
}

function renderGallery() {
  const list = (state.gallery || [])
    .slice()
    .sort((a,b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  if (!list.length) {
    els.galleryList.innerHTML = `<div class="note"><p>Aucune image. Uploadez via la zone ci-dessus.</p></div>`;
    return;
  }

  els.galleryList.innerHTML = list.map(it => `
    <article class="gallery-admin-card" draggable="true" data-id="${escapeAttr(it.id)}">
      <img loading="lazy" decoding="async" src="${escapeAttr(it.public_url)}" alt="${escapeAttr(it.alt || "Réalisation")}" width="800" height="800" />
      <div class="gallery-admin-card__body">
        <label class="sr-only" for="alt-${escapeAttr(it.id)}">Texte alternatif</label>
        <input id="alt-${escapeAttr(it.id)}" type="text" value="${escapeAttr(it.alt || "")}" placeholder="Alt (ex: French rose)" maxlength="80" />
        <div class="gallery-admin-card__actions">
          <button class="btn btn--primary btn--sm" type="button" data-save-alt="${escapeAttr(it.id)}">Enregistrer</button>
          <button class="btn btn--ghost btn--sm" type="button" data-del-img="${escapeAttr(it.id)}">Supprimer</button>
        </div>
      </div>
    </article>
  `).join("");

  els.galleryList.querySelectorAll("[data-save-alt]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.saveAlt;
      const input = document.getElementById(`alt-${CSS.escape(id)}`);
      const alt = (input?.value || "").trim();
      try {
        setStatus(els.adminStatus, "ok", "Enregistrement…");
        await updateGalleryItem(id, { alt });
        setStatus(els.adminStatus, "ok", "✅ Alt mis à jour.");
        await loadGallery();
      } catch (e) {
        console.error(e);
        setStatus(els.adminStatus, "err", "Erreur mise à jour alt (RLS ?).");
      }
    });
  });

  els.galleryList.querySelectorAll("[data-del-img]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delImg;
      const item = state.gallery.find(g => g.id === id);
      deleteGalleryItem(item);
    });
  });

  setupGalleryDnD();
}

function setupGalleryDnD() {
  const cards = Array.from(els.galleryList.querySelectorAll(".gallery-admin-card[draggable='true']"));
  let dragging = null;

  cards.forEach(card => {
    card.addEventListener("dragstart", () => {
      dragging = card;
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", async () => {
      card.classList.remove("dragging");
      dragging = null;

      const newOrder = Array.from(els.galleryList.querySelectorAll(".gallery-admin-card"))
        .map((node, idx) => ({ id: node.dataset.id, order_index: idx }));

      const updates = newOrder.map(u => supabase.from("gallery_items").update({ order_index: u.order_index }).eq("id", u.id));
      setStatus(els.adminStatus, "ok", "Réorganisation…");
      const results = await Promise.all(updates);
      const hasErr = results.some(r => r.error);
      if (hasErr) {
        console.error(results.find(r => r.error)?.error);
        setStatus(els.adminStatus, "err", "Erreur de réorganisation (RLS ?).");
      } else {
        setStatus(els.adminStatus, "ok", "✅ Ordre mis à jour.");
      }
      await loadGallery();
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragging || dragging === card) return;

      const rect = card.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      if (before) card.parentNode.insertBefore(dragging, card);
      else card.parentNode.insertBefore(dragging, card.nextSibling);
    });
  });
}

function setupServiceUI() {
  els.newServiceBtn?.addEventListener("click", () => openServiceModal(null));

  els.serviceForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await saveServiceFromForm();
      els.serviceModal.close();
    } catch (err) {
      console.error(err);
      setStatus(els.adminStatus, "err", err?.message || "Erreur d’enregistrement.");
    }
  });

  els.adminServiceSearch?.addEventListener("input", (e) => {
    state.serviceQuery = e.target.value || "";
    renderServices();
  });

  els.adminClearServiceSearch?.addEventListener("click", () => {
    state.serviceQuery = "";
    if (els.adminServiceSearch) els.adminServiceSearch.value = "";
    renderServices();
    els.adminServiceSearch?.focus?.();
  });
}

function setupGalleryUI() {
  // click -> open file picker
  els.dropZone?.addEventListener("click", () => els.fileInput?.click());
  els.dropZone?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.fileInput?.click();
    }
  });

  els.fileInput?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
    e.target.value = "";
  });

  // drag & drop
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
  ["dragenter", "dragover"].forEach(evt => {
    els.dropZone?.addEventListener(evt, (e) => {
      prevent(e);
      els.dropZone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    els.dropZone?.addEventListener(evt, (e) => {
      prevent(e);
      els.dropZone.classList.remove("is-dragover");
    });
  });
  els.dropZone?.addEventListener("drop", async (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith("image/"));
    await uploadFiles(files);
  });

  els.refreshGalleryBtn?.addEventListener("click", loadGallery);
}

async function refreshAll() {
  await Promise.all([loadServices(), loadGallery()]);
}

async function init() {
  setupAuthUI();
  setupTabsUI();
  setupServiceUI();
  setupGalleryUI();

  await requireSession();
  if (state.user) {
    switchTab("services");
    await refreshAll();
  } else {
    switchTab("services");
  }
}

init();
