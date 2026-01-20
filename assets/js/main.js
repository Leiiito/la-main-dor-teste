/* =========================================
   La Main d'Or — main.js (vanilla)
   - Prestations: tabs + recherche + rendu cards
   - Réservation: liens Calendly par prestation
   - WhatsApp: contact / message libre
   - Galerie: filtres + lightbox
   - FAQ: accordéon
   - Active links nav + reveal
   - Background: micro-parallax ultra léger
   ========================================= */

(() => {
  "use strict";

  // --- constants
  const WA_BASE = "https://wa.me/33750126032";
  const IG_URL = "https://www.instagram.com/manon__behra";
  const GOOGLE_REVIEW_URL = "https://g.page/r/CTha_eAXpwwcEAE/review";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- utils
  const normalize = (s) => {
    const v = (s || "").toLowerCase().normalize("NFD");
    try {
      return v.replace(/\p{Diacritic}/gu, "").trim();
    } catch (_) {
      // Fallback (environnements sans Unicode property escapes)
      return v.replace(/[̀-ͯ]/g, "").trim();
    }
  };

  const fmtEuro = (v) => (typeof v === "number" ? `${v}€` : "—");
  const fmtMin = (v) => (typeof v === "number" ? `${v} min` : "—");
  const buildBookingLink = (service) => {
    // Réservation directe Calendly (1 clic = la bonne prestation)
    if (service && typeof service.calendlyUrl === 'string' && service.calendlyUrl.startsWith('https://calendly.com/')) {
      return service.calendlyUrl;
    }
    // Fallback (ne devrait pas arriver) : contact WhatsApp avec message pré-rempli
    const pText = typeof service.price === 'number' ? `${service.price}€` : '—€';
    const dText = typeof service.duration === 'number' ? `${service.duration} min` : '— min';
    const msg = `Bonjour, je souhaite réserver : ${service.title} (${pText} / ${dText}). Merci !`;
    return `${WA_BASE}?text=${encodeURIComponent(msg)}`;
  };

  // ---------- PRESTATIONS DATA (32)
  // Règle respectée: 1er nombre = prix, 2e nombre = durée.
  // Si valeur manquante => null => affichage "—" + liste À vérifier.
  const SERVICES = [
    // Ongles pieds
    { title: "Semi-permanent pieds", price: 25, duration: 45, category: "Ongles pieds", tag: "Pieds", calendlyUrl: "https://calendly.com/behramanon/semi-permanent-pieds-25-45-min" },

    // Manucure
    { title: "Gainage / renfort", price: 40, duration: 75, category: "Manucure", featured: true, tag: "Renfort", calendlyUrl: "https://calendly.com/behramanon/gainage-renfort-40-75-min" },

    // Ongles mains
    { title: "Semi-permanent mains", price: 25, duration: 45, category: "Ongles mains", featured: true, calendlyUrl: "https://calendly.com/behramanon/semi-permanent-mains-25-45-min" },
    { title: "Dépose semi-permanent", price: 15, duration: 20, category: "Ongles mains", tag: "Dépose", calendlyUrl: "https://calendly.com/behramanon/depose-semi-permanent-15-20min" },
    { title: "Pack dépose semi + nouvelle pose semi", price: 35, duration: 60, category: "Ongles mains", tag: "Pack", calendlyUrl: "https://calendly.com/behramanon/pack-depose-semi-nouvelle-pose-semi-35-60min" },
    { title: "Pose américaine", price: 35, duration: 90, category: "Ongles mains", featured: true, tag: "Capsules", calendlyUrl: "https://calendly.com/behramanon/pose-americaine-35-90-min" },
    { title: "Dépose pose américaine", price: 15, duration: 30, category: "Ongles mains", tag: "Dépose", calendlyUrl: "https://calendly.com/behramanon/depose-pose-americaine-15-30-min" },
    { title: "Pack dépose capsule + nouvelle pose capsule", price: 45, duration: 90, category: "Ongles mains", tag: "Pack", calendlyUrl: "https://calendly.com/behramanon/pack-depose-capsule-nouvelle-pose-capsule-45-90min" },
    { title: "Dépose gel", price: 20, duration: 45, category: "Ongles mains", tag: "Dépose", calendlyUrl: "https://calendly.com/behramanon/depose-gel-20-45-min" },
    { title: "Remplissage gel", price: 35, duration: 90, category: "Ongles mains", tag: "Remplissage", calendlyUrl: "https://calendly.com/behramanon/remplissage-gel-35-90-min" },
    { title: "Rallongement chablon", price: 50, duration: 120, category: "Ongles mains", tag: "Chablon", calendlyUrl: "https://calendly.com/behramanon/rallongement-chablon-50-120-min" },
    { title: "Pack semi mains + pieds", price: 45, duration: 105, category: "Ongles mains", tag: "Pack", calendlyUrl: "https://calendly.com/behramanon/pack-semi-mains-pieds-45-105-min" },
    { title: "Pack pose américaine + semi pieds", price: 55, duration: 105, category: "Ongles mains", tag: "Pack", calendlyUrl: "https://calendly.com/behramanon/pack-pose-americaine-semi-pieds-55-105-min" },

    // Cils
    { title: "Rehaussement de cils", price: 45, duration: 70, category: "Cils", tag: "Rehaussement", calendlyUrl: "https://calendly.com/behramanon/rehaussement-de-cils-45-70-min" },
    { title: "Rehaussement de cils + teinture", price: 55, duration: 75, category: "Cils", tag: "Rehaussement", calendlyUrl: "https://calendly.com/behramanon/rehaussement-de-cils-teinture-55-75min" },
    { title: "Dépose extensions de cils (pose extérieure)", price: 15, duration: 15, category: "Cils", tag: "Dépose", calendlyUrl: "https://calendly.com/behramanon/depose-extensions-de-cils-pose-exterieure-15-15min" },
    { title: "Dépose extensions de cils (réalisée par mes soins)", price: 10, duration: null, category: "Cils", tag: "Dépose", calendlyUrl: "https://calendly.com/behramanon/depose-extensions-de-cils-realisee-par-mes-soins-10" },

    { title: "Extensions de cils — cils à cils", price: 40, duration: 90, category: "Cils", featured: true, calendlyUrl: "https://calendly.com/behramanon/extensions-de-cils-cils-a-cils-40-90-min" },
    { title: "Remplissage cils à cils — 2 semaines", price: 30, duration: 60, category: "Cils", tag: "2 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-cils-a-cils-2-semaines-30-60-min" },
    { title: "Remplissage cils à cils — 3 semaines", price: 35, duration: 75, category: "Cils", tag: "3 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-cils-a-cils-3-semaines-35-75-min" },

    { title: "Extensions de cils — volume mixte naturel", price: 50, duration: 90, category: "Cils", calendlyUrl: "https://calendly.com/behramanon/extensions-de-cils-volume-mixte-naturel-50-90-min" },
    { title: "Remplissage mixte naturel — 2 semaines", price: 40, duration: 60, category: "Cils", tag: "2 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-mixte-naturel-2-semaines-40-60-min" },
    { title: "Remplissage mixte naturel — 3 semaines", price: 45, duration: 75, category: "Cils", tag: "3 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-mixte-naturel-3-semaines-45-75-min" },

    { title: "Extensions de cils — volume mixte fourni", price: 55, duration: 90, category: "Cils", calendlyUrl: "https://calendly.com/behramanon/extensions-de-cils-volume-mixte-fourni-55-90-min" },
    { title: "Remplissage mixte fourni — 2 semaines", price: 45, duration: 60, category: "Cils", tag: "2 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-mixte-fourni-2-semaines-45-60min" },
    { title: "Remplissage mixte fourni — 3 semaines", price: 50, duration: 75, category: "Cils", tag: "3 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-mixte-fourni-3-semaines-50-75min" },

    { title: "Extensions de cils — volume russe", price: 60, duration: 90, category: "Cils", calendlyUrl: "https://calendly.com/behramanon/extensions-de-cils-volume-russe-60-90-min" },
    { title: "Remplissage volume russe — 2 semaines", price: 45, duration: 60, category: "Cils", tag: "2 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-volume-russe-2-semaines-45-60-min" },
    { title: "Remplissage volume russe — 3 semaines", price: 50, duration: 75, category: "Cils", tag: "3 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-volume-russe-3-semaines-50-75-min" },

    { title: "Extensions de cils — volume mega russe", price: 70, duration: 90, category: "Cils", calendlyUrl: "https://calendly.com/behramanon/extensions-de-cils-volume-mega-russe-70-90-min" },
    { title: "Remplissage mega russe — 2 semaines", price: 55, duration: 60, category: "Cils", tag: "2 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-mega-russe-2-semaines-55-60min" },
    { title: "Remplissage mega russe — 3 semaines", price: 60, duration: 75, category: "Cils", tag: "3 semaines", calendlyUrl: "https://calendly.com/behramanon/remplissage-mega-russe-3-semaines-60-75-min" }
  ];

  const CATEGORIES = ["Manucure", "Ongles mains", "Ongles pieds", "Cils"];

  // ---------- PRESTATIONS RENDER
  const tabsRoot = $("[data-tabs]");
  const tabButtons = tabsRoot ? $$('[data-tab]', tabsRoot) : [];
  const searchInput = $("[data-search]");
  const featuredRoot = $("[data-featured]");
  const listRoot = $("[data-prestations]");
  const toCheckBox = $("[data-to-check]");
  const toCheckList = $("[data-to-check-list]");

  let activeCategory = tabButtons.find(b => b.classList.contains("active"))?.dataset.tab || "Manucure";


  const renderServiceCard = (s) => {
    const isFeatured = !!s.featured;
    const bookingUrl = buildBookingLink(s);

    const tag = s.tag ? `<span class="badge badge-left">${s.tag}</span>` : "";
    const featuredBadge = isFeatured ? `<span class="badge">Populaire</span>` : "";

    return `
      <article class="prestation ${isFeatured ? "featured" : ""}" data-title="${s.title}">
        ${featuredBadge}
        ${tag}
        <h3 class="title">${s.title}</h3>
        <p class="desc">Réservation en ligne (Calendly) • Prix & durée visibles</p>
        <div class="meta-row">
          <span class="meta-pill"><strong>Prix</strong> ${fmtEuro(s.price)}</span>
          <span class="meta-pill ${s.duration == null ? "meta-pill--warn" : ""}"><strong>Durée</strong> ${fmtMin(s.duration)}</span>
        </div>
        <a class="btn btn--outline" href="${bookingUrl}" target="_blank" rel="noopener noreferrer" data-calendly>
          Réserver
        </a>
      </article>
    `.trim();
  };


  const applyServices = () => {
    if (!listRoot) return;

    const q = normalize(searchInput?.value);

    const inCat = SERVICES.filter(s => s.category === activeCategory);
    const filtered = inCat.filter(s => !q || normalize(s.title).includes(q));

    // featured first (max 3)
    if (featuredRoot) {
      const featured = filtered.filter(s => s.featured).slice(0, 3);
      featuredRoot.innerHTML = featured.length
        ? `<div class="featured-wrap">${featured.map(s => renderServiceCard(s)).join("")}</div>`
        : "";
    }

    const rest = filtered.filter(s => !s.featured);
    listRoot.innerHTML = rest.length
      ? `<div class="prestations-list">${rest.map(s => renderServiceCard(s)).join("")}</div>`
      : `<p class="empty">Aucune prestation trouvée. Essaie un autre mot-clé.</p>`;

    buildToCheck();
  };

  const setActiveTab = (cat) => {
    activeCategory = cat;
    tabButtons.forEach(b => b.classList.toggle("active", b.dataset.tab === cat));
    applyServices();
  };

  const buildToCheck = () => {
    if (!toCheckBox || !toCheckList) return;

    const issues = SERVICES.filter(s => s.price == null || s.duration == null || !s.calendlyUrl);
    if (!issues.length) {
      toCheckBox.hidden = true;
      return;
    }

    toCheckList.innerHTML = issues.map(s => {
      const missing = [s.price == null ? 'prix' : null, s.duration == null ? 'durée' : null, !s.calendlyUrl ? 'lien Calendly' : null].filter(Boolean).join(' + ');
      return `<li><strong>${s.title}</strong> — ${missing} manquant(s)</li>`;
    }).join("");

    toCheckBox.hidden = false;
  };

  if (tabButtons.length) {
    tabButtons.forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
  }
  if (searchInput) {
    searchInput.addEventListener("input", () => applyServices());
  }

  
  const validateCalendlyLinks = () => {
    const urls = SERVICES.map(s => s.calendlyUrl).filter(Boolean);
    const dup = urls.filter((u,i) => urls.indexOf(u) !== i);
    if (dup.length) console.warn('[Calendly] Liens en doublon détectés:', Array.from(new Set(dup)));
    const missing = SERVICES.filter(s => !s.calendlyUrl);
    if (missing.length) console.warn('[Calendly] Prestations sans lien:', missing.map(s => s.title));
  };

  // vérif console (doublons / manquants)
  validateCalendlyLinks();

  // init
  setActiveTab(activeCategory);

  // ---------- GALLERY FILTERS + LIGHTBOX
  // Supporte 2 versions de markup:
  // - v1 (data-gchip / data-gitem / data-src)
  // - v2 (data-filter / .g-item / <img src>)
  const chips = $$("[data-gchip], [data-filter]");
  const items = $$("[data-gitem], .g-item");
  const lb = $("[data-lightbox]") || $("#lightbox");
  const lbImg = lb ? ($("[data-lb-img]", lb) || $(".lightbox__img", lb)) : null;
  const lbClose = lb ? $("[data-lb-close]", lb) : null;
  const lbPrev = lb ? $("[data-lb-prev]", lb) : null;
  const lbNext = lb ? $("[data-lb-next]", lb) : null;

  let lbIndex = -1;

  const visibleGalleryItems = () => items.filter(it => it.style.display !== "none");

  const openLB = (index) => {
    const vis = visibleGalleryItems();
    if (!lb || !lbImg || !vis.length) return;

    lbIndex = Math.max(0, Math.min(index, vis.length - 1));
    const fig = vis[lbIndex];
    const img = fig.querySelector("img") || fig;
    const src = fig.getAttribute("data-src") || img.getAttribute("src") || "";
    const alt = fig.getAttribute("data-alt") || img.getAttribute("alt") || "";

    lbImg.src = src;
    lbImg.alt = alt;

    lb.showModal();
    document.documentElement.classList.add("no-scroll");
  };

  const closeLB = () => {
    if (!lb) return;
    lb.close();
    document.documentElement.classList.remove("no-scroll");
  };

  const navLB = (dir) => {
    const vis = visibleGalleryItems();
    if (!vis.length) return;
    lbIndex = (lbIndex + dir + vis.length) % vis.length;
    const fig = vis[lbIndex];
    const img = fig.querySelector("img") || fig;
    lbImg.src = fig.getAttribute("data-src") || img.getAttribute("src") || "";
    lbImg.alt = fig.getAttribute("data-alt") || img.getAttribute("alt") || "";
  };

  if (chips.length && items.length) {
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => {
          c.classList.toggle("active", c === chip);
          c.classList.toggle("is-active", c === chip);
          c.setAttribute("aria-selected", c === chip ? "true" : "false");
        });
        const type = chip.getAttribute("data-gchip") || chip.getAttribute("data-filter");

        items.forEach(fig => {
          const t = fig.getAttribute("data-type");
          const show = type === "all" || t === type;
          fig.style.display = show ? "" : "none";
        });
      });
    });
  }

  // click to open
  items.forEach((fig, idx) => {
    fig.addEventListener("click", () => {
      // open within visible list index
      const vis = visibleGalleryItems();
      const visIndex = vis.indexOf(fig);
      openLB(visIndex >= 0 ? visIndex : idx);
    });
  });

  // close / nav handlers
  if (lb) {
    lb.addEventListener("click", (e) => {
      // click outside panel
      if (e.target === lb) closeLB();
    });
    lb.addEventListener("close", () => {
      document.documentElement.classList.remove("no-scroll");
      if (lbImg) lbImg.src = "";
    });
  }

  lbClose && lbClose.addEventListener("click", closeLB);
  lbPrev && lbPrev.addEventListener("click", () => navLB(-1));
  lbNext && lbNext.addEventListener("click", () => navLB(1));

  document.addEventListener("keydown", (e) => {
    if (!lb || !lb.open) return;
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") navLB(-1);
    if (e.key === "ArrowRight") navLB(1);
  });

  // ---------- FAQ accordion
  const faqBtns = $$('[data-acc-btn]');
  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-acc-item]');
      if (!item) return;
      const open = item.getAttribute('data-open') === 'true';
      item.setAttribute('data-open', open ? 'false' : 'true');
    });
  });

  // ---------- Active nav links (optional, subtle)
  const navLinks = $$('[data-nav-link]');
  const sections = navLinks
    .map(a => $(a.getAttribute('href')))
    .filter(Boolean);

  if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0.01 });

    sections.forEach(s => obs.observe(s));
  }

  // ---------- Scroll reveal (light)
  const revealEls = $$('[data-reveal]');
  revealEls.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (ent.isIntersecting) {
          ent.target.classList.add('in');
          io.unobserve(ent.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // ---------- Contact form fallback => WhatsApp
  const form = $('[data-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = (form.querySelector('input[name="name"]')?.value || '').trim();
      const message = (form.querySelector('textarea[name="message"]')?.value || '').trim();

      const errors = [];
      if (name.length < 2) errors.push('Merci d’indiquer ton prénom.');
      if (message.length < 10) errors.push('Ton message est un peu court (min. 10 caractères).');

      let box = form.querySelector('[data-form-feedback]');
      if (!box) {
        box = document.createElement('p');
        box.className = 'form__feedback';
        box.setAttribute('data-form-feedback', '');
        box.setAttribute('aria-live', 'polite');
        const note = form.querySelector('.form__note');
        (note ? note.parentNode : form).insertBefore(box, note || null);
      }

      box.textContent = '';
      box.classList.remove('ok', 'err');

      if (errors.length) {
        if (box) {
          box.textContent = errors.join(' ');
          box.classList.add('err');
        }
        return;
      }

      const msg = `Bonjour, je m’appelle ${name}. Je souhaite un RDV à Gravelines. Message : ${message}`;
      const url = `${WA_BASE}?text=${encodeURIComponent(msg)}`;

      if (box) {
        box.textContent = 'Merci ! Ouverture de WhatsApp pour une réponse plus rapide…';
        box.classList.add('ok');
      }

      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 450);

      form.reset();
    });
  }

  // ---------- Footer year
  const y = $('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());

  // ---------- Background micro-parallax (ultra léger)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const targets = [
      { el: $('.bg-frag--hero-1'), factor: 0.08 },
      { el: $('.bg-frag--presta-2'), factor: 0.06 },
      { el: $('.bg-frag--gallery-1'), factor: 0.05 }
    ].filter(t => t.el);

    if (targets.length) {
      let ticking = false;

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY || 0;
          const isMobile = window.matchMedia('(max-width: 720px)').matches;
          const mobileScale = isMobile ? 0.55 : 1;

          for (const t of targets) {
            const offset = Math.max(-18, Math.min(18, (y * t.factor) * mobileScale));
            t.el.style.setProperty('--bg-parallax', `${-offset}px`);
          }

          ticking = false;
        });
      };

      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }
  }

})();
