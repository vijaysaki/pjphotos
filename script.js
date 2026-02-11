// PJ Wilkinson Photography — simple interactions
(() => {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Year
  const year = qs("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Mobile menu
  const toggle = qs(".nav__toggle");
  const menu = qs("#navMenu");
  if (toggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    qsa(".nav__link, .nav__cta").forEach(a => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Gallery filter
  const chips = qsa(".chip");
  const tiles = qsa(".tile");
  const setActiveChip = (btn) => {
    chips.forEach(c => {
      c.classList.toggle("is-active", c === btn);
      c.setAttribute("aria-selected", String(c === btn));
    });
  };
  chips.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter || "all";
      setActiveChip(btn);
      tiles.forEach(t => {
        const cat = t.dataset.cat;
        t.style.display = (filter === "all" || cat === filter) ? "" : "none";
      });
    });
  });

  // Lightbox (placeholder image)
  const lightbox = qs("#lightbox");
  const lbImg = qs("#lightboxImage");
  const lbCap = qs("#lightboxCaption");

  const openLightbox = (title, cat) => {
    if (!lightbox || !lbImg || !lbCap) return;
    lbImg.setAttribute("aria-label", title || "Photo preview");
    lbCap.textContent = title ? `${title} • ${cat || ""}` : "Photo preview";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  tiles.forEach((t) => {
    t.addEventListener("click", () => openLightbox(t.dataset.title, t.dataset.cat));
  });

  qsa("[data-close='1']").forEach(el => el.addEventListener("click", closeLightbox));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // Fake form submission (demo)
  const form = qs("#bookingForm");
  const note = qs("#formNote");
  if (form && note) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.textContent = "Sent! (Demo) Wire this to your email/CRM or backend endpoint.";
      form.reset();
      setTimeout(() => (note.textContent = ""), 6000);
    });
  }

  // Fake access code
  const accessBtn = qs("#accessBtn");
  const accessCode = qs("#accessCode");
  if (accessBtn && accessCode) {
    accessBtn.addEventListener("click", () => {
      const code = accessCode.value.trim();
      alert(code ? `Demo: unlocking gallery for code "${code}".` : "Enter an access code first.");
    });
  }
})();