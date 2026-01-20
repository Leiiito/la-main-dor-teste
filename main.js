/* =========================================
   Onglerie Pro — main.js (vanilla)
   - Menu mobile
   - Header compact on scroll
   - Slider controls (nouveautés)
   - Filtre par couleur
   - Modals tutoriels (dialog)
   - Fake form submit feedback
   - Scroll reveal léger (perf-friendly)
   ========================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Year in footer ----------
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Header shrink on scroll ----------
  const header = document.querySelector("[data-header]");
  const setHeaderState = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  };
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  // ---------- Mobile nav ----------
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

    // close on link click (mobile)
    $$(".nav-link, .nav-cta", navMenu).forEach((a) => {
      a.addEventListener("click", () => closeNav());
    });

    // close on outside click
    document.addEventListener("click", (e) => {
      const target = e.target;
      const clickedInside =
        navMenu.contains(target) || navToggle.contains(target);
      if (!clickedInside) closeNav();
    });

    // close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    // close if viewport becomes desktop
    window.addEventListener(
      "resize",
      () => {
        if (window.matchMedia("(min-width: 920px)").matches) closeNav();
      },
      { passive: true }
    );
  }

  // ---------- Slider controls (nouveautés) ----------
  const slider = document.querySelector("[data-slider]");
  const track = document.querySelector("[data-slider-track]");
  const prevBtn = document.querySelector("[data-slider-prev]");
  const nextBtn = document.querySelector("[data-slider-next]");

  const getScrollAmount = () => {
    if (!track) return 0;
    // Scroll ~ 1 card + gap
    const firstTile = track.querySelector(".tile");
    if (!firstTile) return Math.round(track.clientWidth * 0.8);
    const tileRect = firstTile.getBoundingClientRect();
    // include gap (approx)
    return Math.round(tileRect.width + 18);
  };

  const scrollTrack = (dir = 1) => {
    if (!track) return;
    track.scrollBy({ left: getScrollAmount() * dir, behavior: "smooth" });
  };

  if (track && prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => scrollTrack(-1));
    nextBtn.addEventListener("click", () => scrollTrack(1));

    // drag hint on desktop: cursor change
    track.addEventListener("mousedown", () => (track.style.cursor = "grabbing"));
    track.addEventListener("mouseup", () => (track.style.cursor = "grab"));
    track.addEventListener("mouseleave", () => (track.style.cursor = "grab"));
    track.style.cursor = "grab";
  }

  // ---------- Color filter ----------
  const swatches = $$("[data-color]");
  const gallery = document.querySelector("[data-color-gallery]");
  const items = $$("[data-color-item]", gallery || document);

  const setActiveSwatch = (btn) => {
    swatches.forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
  };

  const filterGallery = (color) => {
    if (!items.length) return;

    items.forEach((it) => {
      const itColor = it.getAttribute("data-color-item");
      const show = color === "all" ? true : itColor === color;
      it.classList.toggle("is-hidden", !show);
    });
  };

  if (swatches.length && items.length) {
    swatches.forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.getAttribute("data-color");
        setActiveSwatch(btn);
        filterGallery(color);
      });
    });

    // default
    filterGallery("all");
  }

  // ---------- Modals (dialog) ----------
  const openers = $$("[data-modal-open]");
  const closers = $$("[data-modal-close]");

  const openModal = (id) => {
    const dlg = document.getElementById(id);
    if (!dlg || typeof dlg.showModal !== "function") return;

    // Close any open dialogs first (safety)
    $$("dialog[open]").forEach((d) => {
      if (d !== dlg) d.close();
    });

    dlg.showModal();

    // close on click outside content
    const onClick = (e) => {
      const rect = dlg.getBoundingClientRect();
      const inDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      // If click is outside dialog rect, close
      if (!inDialog) dlg.close();
    };

    dlg.addEventListener("click", onClick, { once: true });
  };

  const closeModal = (dlg) => {
    if (!dlg) return;
    if (dlg.open) dlg.close();
  };

  openers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-modal-open");
      openModal(id);
    });
  });

  closers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dlg = btn.closest("dialog");
      closeModal(dlg);
    });
  });

  // ---------- Fake forms feedback ----------
  const fakeForms = $$("[data-fake-form]");
  fakeForms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Envoyé ✓";
      }

      // lightweight inline toast
      const toast = document.createElement("div");
      toast.setAttribute("role", "status");
      toast.className = "toast";
      toast.textContent =
        "Merci ! Ton message a été pris en compte (mode démo).";

      document.body.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add("is-in"));

      setTimeout(() => {
        toast.classList.remove("is-in");
        setTimeout(() => toast.remove(), 240);
      }, 2600);

      // reset form (optional)
      form.reset();

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText || "Envoyer";
        }
      }, 1200);
    });
  });

  // Inject minimal toast styles (keeps CSS clean, but still maintainable)
  // If you prefer, we can move this into style.css.
  const toastStyle = document.createElement("style");
  toastStyle.textContent = `
    .toast{
      position: fixed;
      left: 50%;
      bottom: 20px;
      transform: translateX(-50%) translateY(12px);
      opacity: 0;
      padding: 12px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.85);
      border: 1px solid rgba(18,18,20,.12);
      box-shadow: 0 18px 50px rgba(18,18,20,.16);
      color: rgba(18,18,20,.88);
      font-weight: 650;
      transition: opacity 220ms cubic-bezier(.2,.8,.2,1), transform 220ms cubic-bezier(.2,.8,.2,1);
      z-index: 9999;
      backdrop-filter: blur(10px);
      width: max-content;
      max-width: calc(100% - 24px);
      text-align: center;
    }
    .toast.is-in{
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(toastStyle);

  // ---------- Scroll reveal (IntersectionObserver) ----------
  // Adds .reveal on key blocks; becomes .is-in when visible.
  const revealTargets = [
    ".section-head",
    ".card",
    ".product",
    ".tile",
    ".feature",
    ".editorial",
    ".gallery-item",
    ".guide",
    ".ugc img",
    ".acc-item",
    ".contact",
    ".footer-grid > *"
  ];

  const allRevealEls = revealTargets.flatMap((sel) => $$(sel));

  allRevealEls.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -5% 0px" }
    );

    allRevealEls.forEach((el) => io.observe(el));
  } else {
    // fallback
    allRevealEls.forEach((el) => el.classList.add("is-in"));
  }
})();
