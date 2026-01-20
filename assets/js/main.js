/* =========================================
   La Main d’Or — main.js (vanilla)
   - Menu mobile
   - Prestations: tabs + recherche + rendu dynamique
   - WhatsApp pré-rempli: inclut Nom + Prix + Durée
   - Galerie: lightbox (dialog)
   - Scroll reveal
   - Formulaire: validation + fallback WhatsApp
   ========================================= */

(() => {
  "use strict";

  const WA_BASE = "https://wa.me/33750126032";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Year
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");

  const closeNav = () => {
    if (!navToggle || !navMenu) return;
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  const openNav = () => {
    if (!navToggle || !navMenu) return;
    navMenu.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.contains("is-open");
      isOpen ? closeNav() : openNav();
    });

    $$(".nav-link, .nav-cta", navMenu).forEach((a) => {
      a.addEventListener("click", () => closeNav());
    });

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!navMenu.contains(t) && !navToggle.contains(t)) closeNav();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    window.addEventListener(
      "resize",
      () => {
        if (window.matchMedia("(min-width: 920px)").matches) closeNav();
      },
      { passive: true }
    );
  }

  // Quick help CTA
  const quickBtns = $$('[data-quick-help]');
  const quickMsg = `Bonjour, je ne sais pas quoi choisir. Je voudrais un RDV à Gravelines. Peux-tu me conseiller ? Merci !`;
  quickBtns.forEach((b) => {
    b.addEventListener('click', () => {
      const url = `${WA_BASE}?text=${encodeURIComponent(quickMsg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  // -----------------------------
  // Prestations data (33)
  // Rule applied: first number = price, second number = duration
  // -----------------------------
  const SERVICES = [
    // Ongles pieds
    { title: "Semi-permanent pieds", price: 25, duration: 45, category: "Ongles pieds", featured: true, tag: "Populaire" },

    // Manucure
    { title: "Gainage / renfort", price: 40, duration: 75, category: "Manucure", featured: true, tag: "Populaire" },

    // Ongles mains
    { title: "Semi-permanent mains", price: 25, duration: 45, category: "Ongles mains", featured: true, tag: "Populaire" },
    { title: "Dépose semi-permanent", price: 15, duration: 20, category: "Ongles mains", tag: "Dépose" },
    { title: "Pack dépose semi + nouvelle pose semi", price: 35, duration: 60, category: "Ongles mains", tag: "Pack" },
    { title: "Pose américaine", price: 35, duration: 90, category: "Ongles mains", featured: true, tag: "Populaire" },
    { title: "Dépose pose américaine", price: 15, duration: 30, category: "Ongles mains", tag: "Dépose" },
    { title: "Pack dépose capsule + nouvelle pose capsule", price: 45, duration: 90, category: "Ongles mains", tag: "Pack" },
    { title: "Dépose gel", price: 20, duration: 45, category: "Ongles mains", tag: "Dépose" },
    { title: "Remplissage gel", price: 35, duration: 90, category: "Ongles mains", tag: "Remplissage" },
    { title: "Rallongement chablon", price: 50, duration: 120, category: "Ongles mains" },
    { title: "Pack semi mains + pieds", price: 45, duration: 105, category: "Ongles mains", tag: "Pack" },
    { title: "Pack pose américaine + semi pieds", price: 55, duration: 105, category: "Ongles mains", tag: "Pack" },

    // Cils
    { title: "Rehaussement de cils", price: 45, duration: 70, category: "Cils" },
    { title: "Rehaussement de cils + teinture", price: 55, duration: 75, category: "Cils" },
    { title: "Dépose extensions de cils (pose extérieure)", price: 15, duration: 15, category: "Cils", tag: "Dépose" },
    { title: "Dépose extensions de cils (réalisée par mes soins)", price: 10, duration: null, category: "Cils", tag: "Dépose" },

    { title: "Extensions de cils — cils à cils", price: 40, duration: 90, category: "Cils", featured: true, tag: "Populaire" },
    { title: "Remplissage cils à cils — 2 semaines", price: 30, duration: 60, category: "Cils", tag: "Remplissage 2 sem" },
    { title: "Remplissage cils à cils — 3 semaines", price: 35, duration: 75, category: "Cils", tag: "Remplissage 3 sem" },

    { title: "Extensions de cils — volume mixte naturel", price: 50, duration: 90, category: "Cils" },
    { title: "Remplissage mixte naturel — 2 semaines", price: 40, duration: 60, category: "Cils", tag: "Remplissage 2 sem" },
    { title: "Remplissage mixte naturel — 3 semaines", price: 45, duration: 75, category: "Cils", tag: "Remplissage 3 sem" },

    { title: "Extensions de cils — volume mixte fourni", price: 55, duration: 90, category: "Cils" },
    { title: "Remplissage mixte fourni — 2 semaines", price: 45, duration: 60, category: "Cils", tag: "Remplissage 2 sem" },
    { title: "Remplissage mixte fourni — 3 semaines", price: 50, duration: 75, category: "Cils", tag: "Remplissage 3 sem" },

    { title: "Extensions de cils — volume russe", price: 60, duration: 90, category: "Cils" },
    { title: "Remplissage volume russe — 2 semaines", price: 45, duration: 60, category: "Cils", tag: "Remplissage 2 sem" },
    { title: "Remplissage volume russe — 3 semaines", price: 50, duration: 75, category: "Cils", tag: "Remplissage 3 sem" },

    { title: "Extensions de cils — volume mega russe", price: 70, duration: 90, category: "Cils" },
    { title: "Remplissage mega russe — 2 semaines", price: 55, duration: 60, category: "Cils", tag: "Remplissage 2 sem" },
    { title: "Remplissage mega russe — 3 semaines", price: 60, duration: 75, category: "Cils", tag: "Remplissage 3 sem" }
  ];

  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const formatEuro = (n) => (typeof n === "number" ? `${n}€` : "—");
  const formatMin = (n) => (typeof n === "number" ? `${n} min` : "—");

  const buildWhatsApp = (service) => {
    const p = typeof service.price === "number" ? `${service.price}€` : "—€";
    const d = typeof service.duration === "number" ? `${service.duration} min` : "— min";
    const msg = `Bonjour, je souhaite réserver : ${service.title} (${p} / ${d}). Merci !`;
    return `${WA_BASE}?text=${encodeURIComponent(msg)}`;
  };

  const descFromTitle = (title) => {
    const t = normalize(title);
    if (t.includes('semi-permanent')) return "Couleur nette, finition brillante.";
    if (t.includes('pose americaine')) return "Pose soignée, rendu élégant.";
    if (t.includes('remplissage')) return "Entretien pour une tenue optimale.";
    if (t.includes('depose')) return "Retrait en douceur (selon prestation).";
    if (t.includes('rehaussement')) return "Courbure naturelle, regard ouvert.";
    if (t.includes('cils a cils')) return "Effet naturel, regard lumineux.";
    if (t.includes('volume')) return "Regard plus intense, effet travaillé.";
    if (t.includes('gainage')) return "Renfort naturel, finition propre.";
    if (t.includes('chablon')) return "Allongement et construction.";
    if (t.includes('pack')) return "Offre combinée, pratique et complète.";
    return "Prestation professionnelle, sur rendez-vous.";
  };

  // DOM refs
  const tabsRoot = document.querySelector("[data-tabs]");
  const tabButtons = tabsRoot ? $$('[data-tab]', tabsRoot) : [];
  const searchInput = document.querySelector("[data-search]");
  const listRoot = document.querySelector("[data-prestations]");
  const featuredRoot = document.querySelector("[data-featured]");
  const toCheckBox = document.querySelector("[data-to-check]");
  const toCheckList = document.querySelector("[data-to-check-list]");

  let activeCategory = "Ongles mains";

  const renderCard = (service, isFeatured = false) => {
    const price = formatEuro(service.price);
    const duration = formatMin(service.duration);

    const rightBadge = isFeatured ? 'Populaire' : (service.tag || '');
    const leftBadge = !isFeatured && service.tag && service.tag !== 'Populaire' ? service.tag : '';

    return `
      <article class="prestation" data-title="${service.title}" data-category="${service.category}">
        ${isFeatured ? `<span class="badge">Populaire</span>` : (rightBadge ? `<span class="badge">${rightBadge}</span>` : '')}
        ${(!isFeatured && leftBadge && leftBadge !== rightBadge) ? `<span class="badge badge-left">${leftBadge}</span>` : ''}
        <h3>${service.title}</h3>
        <p class="desc">${descFromTitle(service.title)}</p>
        <div class="meta-row">
          <span class="meta-pill"><strong>Prix</strong> ${price}</span>
          <span class="meta-pill ${service.duration == null ? 'meta-pill--warn' : ''}"><strong>Durée</strong> ${duration}</span>
        </div>
        <button class="btn btn--primary" type="button" data-book="${encodeURIComponent(service.title)}">Réserver</button>
      </article>
    `;
  };

  const wireBooking = () => {
    $$('[data-book]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const title = decodeURIComponent(btn.getAttribute('data-book') || '');
        const service = SERVICES.find((s) => s.title === title);
        if (!service) return;
        window.open(buildWhatsApp(service), '_blank', 'noopener,noreferrer');
      });
    });
  };

  const render = () => {
    if (!listRoot) return;

    const q = normalize(searchInput?.value);

    const inCat = SERVICES.filter((s) => s.category === activeCategory);
    const featured = inCat.filter((s) => !!s.featured);
    const filtered = inCat.filter((s) => {
      if (!q) return true;
      return normalize(s.title).includes(q) || normalize(descFromTitle(s.title)).includes(q) || normalize(s.tag || '').includes(q);
    });

    if (featuredRoot) {
      featuredRoot.innerHTML = featured.length ? featured.map((s) => renderCard(s, true)).join('') : '';
    }

    // Avoid duplicates: remove featured from main list
    const nonFeatured = filtered.filter((s) => !s.featured);
    listRoot.innerHTML = nonFeatured.map((s) => renderCard(s, false)).join('');

    wireBooking();
  };

  const setActiveTab = (cat) => {
    activeCategory = cat;
    tabButtons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === cat));
    render();
  };

  if (tabButtons.length) {
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab')));
    });
  }

  if (searchInput) searchInput.addEventListener('input', render);

  // To-check list
  const buildToCheck = () => {
    if (!toCheckBox || !toCheckList) return;
    const issues = SERVICES.filter((s) => s.price == null || s.duration == null);
    if (!issues.length) {
      toCheckBox.hidden = true;
      return;
    }
    toCheckList.innerHTML = issues
      .map((s) => {
        const missing = [s.price == null ? 'prix' : null, s.duration == null ? 'durée' : null].filter(Boolean).join(' + ');
        return `<li><strong>${s.title}</strong> — ${missing} manquant(s)</li>`;
      })
      .join('');
    toCheckBox.hidden = false;
  };

  // Init
  setActiveTab('Ongles mains');
  buildToCheck();

  // -----------------------------
  // Gallery lightbox
  // -----------------------------
  const galleryImgs = $$('[data-gallery] img');
  const dlg = document.getElementById('lightbox');
  const dlgImg = document.getElementById('lightboxImg');
  const dlgCap = document.getElementById('lightboxCap');
  const dlgClose = $('[data-modal-close]');

  const openLightbox = (img) => {
    if (!dlg || !dlgImg) return;
    dlgImg.src = img.currentSrc || img.src;
    dlgImg.alt = img.alt || 'Agrandissement';
    if (dlgCap) dlgCap.textContent = img.alt || '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
  };

  if (galleryImgs.length && dlg) {
    galleryImgs.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openLightbox(img));
    });

    if (dlgClose) dlgClose.addEventListener('click', () => dlg.close());

    dlg.addEventListener('click', (e) => {
      const rect = dlg.getBoundingClientRect();
      const inDialog = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inDialog) dlg.close();
    });
  }

  // -----------------------------
  // Fake form submit (opens WhatsApp)
  // -----------------------------
  const form = document.querySelector('[data-fake-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (form.querySelector('input[name="name"]')?.value || '').trim();
      const msg = (form.querySelector('textarea[name="message"]')?.value || '').trim();

      // basic validation
      if (name.length < 2 || msg.length < 10) {
        const warn = name.length < 2 ? 'Merci d’indiquer ton nom.' : 'Ton message est trop court.';
        alert(warn);
        return;
      }

      const waMsg = `Bonjour, je m’appelle ${name}. Je souhaite un RDV à Gravelines. Message : ${msg}`;
      window.open(`${WA_BASE}?text=${encodeURIComponent(waMsg)}`, '_blank', 'noopener,noreferrer');
      form.reset();
    });
  }

  // -----------------------------
  // Scroll reveal
  // -----------------------------
  const revealTargets = [
    '.section-head',
    '.step-card',
    '.prestation',
    '.info-card',
    '.quote',
    '.acc-item',
    '.contact',
    '.footer-grid > *'
  ].flatMap((sel) => $$(sel));

  revealTargets.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }
})();
