/* =========================================
   La Main d’Or — main.js (vanilla)
   Conversion-first RDV:
   - Tabs prestations + filtre catégorie
   - Recherche live
   - WhatsApp message pré-rempli (par prestation)
   - Scroll reveal léger
   - Validation formulaire (fallback) + feedback
   ========================================= */

(() => {
  "use strict";

  const WA_BASE = "https://wa.me/33750126032";
  const INSTAGRAM_URL = "https://www.instagram.com/manon__behra";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // -----------------------------
  // Helpers
  // -----------------------------
  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const buildWhatsAppLink = (prestationName) => {
    const msg =
      `Bonjour Manon, je voudrais réserver "${prestationName}" à Gravelines. ` +
      `Quelles dispos cette semaine ?`;
    return `${WA_BASE}?text=${encodeURIComponent(msg)}`;
  };

  // Optional: slightly smarter messages depending on category
  const buildWhatsAppLinkSmart = (prestationName, category) => {
    let extra = "";
    if (category === "cils") {
      extra = " (Si possible : cil à cil / volume, et effet souhaité.)";
    } else if (category === "ongles" || category === "manucure" || category === "pieds") {
      extra = " (Si possible : longueur courte/moyenne, et teinte souhaitée.)";
    }

    const msg =
      `Bonjour Manon, je voudrais réserver "${prestationName}" à Gravelines. ` +
      `Quelles dispos cette semaine ?${extra}`;

    return `${WA_BASE}?text=${encodeURIComponent(msg)}`;
  };

  // -----------------------------
  // Prestations: Tabs + Search
  // -----------------------------
  const tabsRoot = document.querySelector("[data-tabs]");
  const tabButtons = $$("[data-tab]", tabsRoot || document);
  const listRoot = document.querySelector("[data-prestations]");
  const items = $$(".prestation", listRoot || document);
  const searchInput = document.querySelector("[data-search]");

  let activeCategory = "manucure";

  const applyFilters = () => {
    const query = normalize(searchInput?.value);
    items.forEach((item) => {
      const cat = item.getAttribute("data-category") || "";
      const title = normalize($("h3", item)?.textContent);
      const desc = normalize($("p", item)?.textContent);

      const matchCategory = cat === activeCategory;
      const matchSearch = !query || title.includes(query) || desc.includes(query);

      item.style.display = matchCategory && matchSearch ? "" : "none";
    });
  };

  const setActiveTab = (cat) => {
    activeCategory = cat;
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === cat);
    });
    applyFilters();
  };

  if (tabButtons.length && items.length) {
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.getAttribute("data-tab")));
    });

    // Default: show "ongles" first (conversion: most requested)
    // If you prefer "manucure", replace "ongles" below.
    setActiveTab("ongles");
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => applyFilters());
  }

  // -----------------------------
  // WhatsApp pre-filled by prestation
  // -----------------------------
  const waButtons = $$("[data-whatsapp]");
  waButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const prestation = btn.getAttribute("data-whatsapp") || "une prestation";
      const parent = btn.closest(".prestation");
      const category = parent?.getAttribute("data-category") || "";
      const url = buildWhatsAppLinkSmart(prestation, category);

      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  // Make main CTA in navbar also pre-fill a generic message (optional)
  // (Your HTML uses direct wa.me link; we keep it as-is for speed.)

  // -----------------------------
  // Scroll reveal (light)
  // -----------------------------
  const revealEls = [
    ".hero .hero-content",
    ".hero .hero-image",
    ".steps .step",
    ".prestations .tab",
    ".prestations .prestation",
    ".galerie .gallery-grid img",
    ".avis blockquote",
    ".contact .contact-actions",
    ".contact .contact-form"
  ].flatMap((sel) => $$(sel));

  revealEls.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  // -----------------------------
  // Contact form validation + feedback
  // -----------------------------
  const form = document.querySelector("[data-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = (form.querySelector('input[type="text"]')?.value || "").trim();
      const message = (form.querySelector("textarea")?.value || "").trim();

      const errors = [];
      if (name.length < 2) errors.push("Merci d’indiquer ton prénom/nom.");
      if (message.length < 10) errors.push("Ton message est un peu court (min. 10 caractères).");

      // remove existing message
      const old = form.querySelector(".form-feedback");
      if (old) old.remove();

      const feedback = document.createElement("div");
      feedback.className = "form-feedback";
      feedback.style.marginTop = "10px";
      feedback.style.fontWeight = "700";

      if (errors.length) {
        feedback.style.color = "rgba(180,40,40,.95)";
        feedback.textContent = errors.join(" ");
        form.appendChild(feedback);
        return;
      }

      // Fallback behavior: propose sending the same message via WhatsApp (best conversion)
      const composed =
        `Bonjour Manon, je m’appelle ${name}. ` +
        `Je souhaite un RDV à Gravelines. Message : ${message}`;

      const waUrl = `${WA_BASE}?text=${encodeURIComponent(composed)}`;

      feedback.style.color = "rgba(0,0,0,.75)";
      feedback.textContent = "Merci ! Pour une réponse plus rapide, ton message va s’ouvrir sur WhatsApp.";
      form.appendChild(feedback);

      // Open WhatsApp after a short delay (feels intentional)
      setTimeout(() => {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }, 600);

      form.reset();
    });
  }

  // -----------------------------
  // Optional: smooth focus on search when arriving at prestations
  // -----------------------------
  const hash = window.location.hash;
  if (hash === "#prestations" && searchInput) {
    setTimeout(() => searchInput.focus({ preventScroll: true }), 250);
  }

})();
