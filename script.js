// PJ Wilkinson Photography — layout preserved, content from backend API
(() => {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Config: override via data attributes
  const API_BASE = (document.body.dataset.apiBase || "https://api.adeptlogics.com").replace(/\/$/, "");
  const DOMAIN = document.body.dataset.domain || window.location.hostname || "localhost";
  const TENANT_ID = document.body.dataset.tenantId || "";

  const api = (path) => {
    const sep = path.includes("?") ? "&" : "?";
    const param = TENANT_ID ? `tenantId=${encodeURIComponent(TENANT_ID)}` : `domain=${encodeURIComponent(DOMAIN)}`;
    return `${API_BASE}${path}${sep}${param}`;
  };

  const defaultTitle = document.title;
  const homeView = qs("#homeView");
  const pageView = qs("#pageView");
  const pageViewTitle = qs("#pageViewTitle");
  const pageViewBody = qs("#pageViewBody");

  const getPageSlugFromHash = () => {
    const h = (window.location.hash || "").replace(/^#\/?/, "").trim().toLowerCase();
    if (!h || h === "home") return null;
    return h;
  };

  const showHome = (scrollId) => {
    if (homeView) homeView.hidden = false;
    if (pageView) pageView.hidden = true;
    document.title = defaultTitle;
    if (scrollId) {
      const el = qs(`#${scrollId}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const showPage = (slug, page) => {
    if (!pageView || !pageViewTitle || !pageViewBody) return;
    pageViewTitle.textContent = page.title || slug;
    pageViewBody.innerHTML = page.content || "<p>No content.</p>";
    if (homeView) homeView.hidden = true;
    pageView.hidden = false;
    document.title = (page.title || slug) + " — " + defaultTitle;
    window.scrollTo(0, 0);
  };

  let cachedPages = null;
  const route = () => {
    const slug = getPageSlugFromHash();
    if (!slug) {
      showHome();
      return;
    }
    const loadAndShow = (pages) => {
      const pageBySlug = (arr, s) => arr && arr.find((p) => (p.slug || (p.full_path || "").replace(/^\//, "") || "").toLowerCase() === s);
      const page = pageBySlug(pages, slug);
      if (page) showPage(slug, page);
      else showHome();
    };
    if (cachedPages && Array.isArray(cachedPages)) {
      loadAndShow(cachedPages);
      return;
    }
    fetch(api("/public/pages"))
      .then((res) => (res.ok ? res.json() : []))
      .then((pages) => {
        cachedPages = Array.isArray(pages) ? pages : [];
        loadAndShow(cachedPages);
      })
      .catch(() => showHome());
  };

  window.addEventListener("hashchange", route);
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#"]');
    if (a) {
      e.preventDefault();
      window.location.hash = "";
      route();
    }
    const sectionLink = e.target.closest('a[href^="#"]');
    if (sectionLink && pageView && !pageView.hidden) {
      const href = (sectionLink.getAttribute("href") || "").trim();
      if (href === "#" || href === "#/") return;
      if (href.startsWith("#/")) return;
      e.preventDefault();
      window.location.hash = "";
      route();
      setTimeout(() => {
        const id = href.replace(/^#/, "");
        if (id) showHome(id);
      }, 50);
    }
  });

  // --- Load menu from /public/pages/menus (page links use #/slug for same layout) ---
  const dynamicMenu = qs("#dynamicMenu");
  if (dynamicMenu) {
    fetch(api("/public/pages/menus"))
      .then((res) => (res.ok ? res.json() : Promise.reject("Menu fetch failed")))
      .then((menus) => {
        const headerMenu = Array.isArray(menus) && menus.length ? menus.find((m) => (m.slug || m.name || "").toLowerCase() === "header") || menus[0] : null;
        const items = (headerMenu?.items || [])
          .filter((i) => i.visible !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (items.length) {
          dynamicMenu.innerHTML = items
            .map((item) => {
              let href = item.external_url || "#";
              if (item.page && (item.page.slug || item.page.full_path)) {
                const slug = (item.page.slug || item.page.full_path).replace(/^\//, "");
                href = "#/" + slug;
              } else if (!item.external_url && item.label) {
                const l = (item.label || "").toLowerCase();
                if (l.includes("book")) href = "#book";
                else if (l.includes("home")) href = "#";
                else if (l.includes("gallery")) href = "#gallery";
                else if (l.includes("buy")) href = "#buy";
                else if (l.includes("services")) href = "#/services";
                else if (l.includes("about")) href = "#/about";
                else if (l.includes("contact")) href = "#/contact";
              }
              const isCta = (item.label || "").toLowerCase().includes("book");
              return `<a class="${isCta ? "btn btn--primary nav__cta" : "nav__link"}" href="${href}">${item.label || "Link"}</a>`;
            })
            .join("");
        } else {
          throw new Error("No menu items");
        }
        qsa(".nav__link, .nav__cta", dynamicMenu).forEach((a) =>
          a.addEventListener("click", () => {
            const menu = qs("#navMenu");
            const toggle = qs(".nav__toggle");
            if (menu && toggle) {
              menu.classList.remove("is-open");
              toggle.setAttribute("aria-expanded", "false");
            }
          })
        );
      })
      .catch(() => {
        dynamicMenu.innerHTML = `
          <a class="nav__link" href="#">Home</a>
          <a class="nav__link" href="#/services">Services</a>
          <a class="nav__link" href="#book">Book Now</a>
          <a class="nav__link" href="#gallery">Gallery</a>
          <a class="nav__link" href="#buy">Buy Photos</a>
          <a class="nav__link" href="#/about">About</a>
          <a class="nav__link" href="#/contact">Contact</a>
          <a class="btn btn--primary nav__cta" href="#book">Book Now</a>
        `;
      });
  }

  route();

  // --- Load services from /public/services (cards + booking dropdown) ---
  const servicesGrid = qs(".cards", qs("#services"));
  const serviceSelect = qs("#service");
  const loadServices = (list) => {
    if (!Array.isArray(list) || !list.length) return;
    const active = list.filter((s) => s.status === "active");
    if (servicesGrid && active.length) {
      const mediaClasses = ["media--portraits", "media--weddings", "media--events", "media--families"];
      servicesGrid.innerHTML = active
        .slice(0, 4)
        .map(
          (s, i) => `
            <article class="card">
              <div class="card__media ${mediaClasses[i % mediaClasses.length]}" aria-hidden="true"${s.imageUrl ? ` style="background-image:url(${s.imageUrl}); background-size:cover;"` : ""}></div>
              <h3 class="card__title">${s.name || "Service"}</h3>
              <p class="card__text">${s.description || ""}</p>
              <a class="card__link" href="#book">${s.slug ? s.name + " →" : "Book →"}</a>
            </article>
          `
        )
        .join("");
    }
    if (serviceSelect && active.length) {
      const opts = active.map((s) => `<option value="${(s.name || "").replace(/"/g, "&quot;")}">${s.name || "Service"}</option>`).join("");
      serviceSelect.innerHTML = '<option value="">Select…</option>' + opts;
    }
  };

  fetch(api("/public/services"))
    .then((res) => (res.ok ? res.json() : []))
    .then((services) => loadServices(Array.isArray(services) ? services : []))
    .catch(() => loadServices([]));

  // --- Load all section content from /public/pages ---
  const pageBySlug = (pages, slugOrTitle) =>
    Array.isArray(pages) && pages.find((p) => (p.slug || p.full_path || "").toLowerCase().includes(slugOrTitle) || (p.title || "").toLowerCase().includes(slugOrTitle));

  fetch(api("/public/pages"))
    .then((res) => (res.ok ? res.json() : []))
    .then((pages) => {
      cachedPages = Array.isArray(pages) ? pages : [];
      if (!cachedPages.length) return;
      const home = pageBySlug(cachedPages, "home") || cachedPages[0];
      const heroCard = qs(".hero__card");
      if (heroCard && home) {
        const heroTitle = qs(".hero__title", heroCard);
        const heroLead = qs(".hero__lead", heroCard);
        const eyebrow = qs(".eyebrow", heroCard);
        if (heroTitle && home.title) heroTitle.textContent = home.title;
        if (heroLead && home.content) heroLead.innerHTML = home.content.length > 200 ? home.content.slice(0, 200) + "…" : home.content;
        if (eyebrow && home.meta_description) eyebrow.textContent = home.meta_description;
      }
      ["services", "gallery", "book", "contact"].forEach((slug) => {
        const page = pageBySlug(cachedPages, slug);
        if (!page) return;
        const section = qs(`#${slug}`);
        if (!section) return;
        const titleEl = qs(".section__title", section);
        const subtitleEl = qs(".section__subtitle", section);
        if (titleEl && page.title) titleEl.textContent = page.title;
        if (subtitleEl && (page.meta_description || page.content)) subtitleEl.textContent = page.meta_description || (page.content || "").replace(/<[^>]+>/g, "").slice(0, 160) + (page.content && page.content.length > 160 ? "…" : "");
      });
      const aboutPage = pageBySlug(cachedPages, "about");
      if (aboutPage) {
        const aboutSection = qs("#about");
        if (aboutSection) {
          const aboutTitle = qs(".section__title", aboutSection);
          const aboutSubtitle = qs(".section__subtitle", aboutSection);
          const aboutBody = qs(".about__text .body", aboutSection);
          if (aboutTitle && aboutPage.title) aboutTitle.textContent = aboutPage.title;
          if (aboutSubtitle && (aboutPage.meta_description || aboutPage.content)) aboutSubtitle.textContent = aboutPage.meta_description || (aboutPage.content || "").replace(/<[^>]+>/g, "").slice(0, 120) + "…";
          if (aboutBody && aboutPage.content) aboutBody.innerHTML = aboutPage.content;
        }
      }
    })
    .catch(() => {});

  // --- Optional: site/contact config (phone, email, instagram) ---
  // --- Gallery: folders + images from /public/galleries ---
  const masonry = qs("#masonry");
  const galleryFolders = qs("#galleryFolders");
  const galleryBreadcrumb = qs("#galleryBreadcrumb");
  const galleryTitle = qs("#galleryTitle");
  const gallerySubtitle = qs("#gallerySubtitle");

  let galleryTree = [];
  let galleryPath = []; // [{ id, name }] breadcrumb trail

  const findFolderById = (tree, id) => {
    for (const f of tree) {
      if (f.id === id) return f;
      if (f.children?.length) {
        const found = findFolderById(f.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const renderGallery = (folderId = null) => {
    const current = folderId ? findFolderById(galleryTree, folderId) : null;
    const children = current ? (current.children || []) : galleryTree;
    const path = folderId ? galleryPath : [];

    if (galleryBreadcrumb) {
      const crumbs = path.length
        ? [`<a href="#" data-gallery-back="root" class="gallery__crumb">Gallery</a>`].concat(
            path.map((p, i) => `<a href="#" data-gallery-back="${p.id}" class="gallery__crumb">${(p.name || "Folder").replace(/</g, "&lt;")}</a>`)
          )
        : [];
      galleryBreadcrumb.innerHTML = crumbs.join(' <span aria-hidden="true">/</span> ');
    }
    if (galleryTitle) galleryTitle.textContent = current ? (current.name || "Gallery") : "Gallery";
    if (gallerySubtitle) gallerySubtitle.textContent = current?.description || "Browse folders and click any image to view full size.";

    if (galleryFolders) {
      galleryFolders.innerHTML = children
        .map((f) => `<a href="#" data-gallery-id="${f.id}" class="gallery__folder" aria-label="Open folder: ${(f.name || "").replace(/"/g, "&quot;")}"><span class="gallery__folderIcon" aria-hidden="true">📁</span><span class="gallery__folderName">${(f.name || "Folder").replace(/</g, "&lt;")}</span></a>`)
        .join("");
    }
    if (masonry) masonry.innerHTML = "Loading…";
    if (!folderId) {
      if (masonry) masonry.innerHTML = "Select a folder to view images.";
      return;
    }
    fetch(api(`/public/galleries/${folderId}/images`))
      .then((res) => (res.ok ? res.json() : []))
      .then((images) => {
        if (!masonry) return;
        if (!Array.isArray(images) || !images.length) {
          masonry.innerHTML = "<p class=\"gallery__empty\">No images in this folder.</p>";
          return;
        }
        masonry.innerHTML = images
          .map((img) => {
            const thumbUrl = img.thumbnailUrl || img.url;
            const fullUrl = img.url || img.thumbnailUrl;
            const title = img.title || img.altText || "Photo";
            return `<button class="tile" data-cat="gallery" data-title="${(title || "").replace(/"/g, "&quot;")}" data-url="${(fullUrl || "").replace(/"/g, "&quot;")}" type="button" aria-label="Open photo: ${(title || "").replace(/"/g, "&quot;")}"${thumbUrl ? ` style="background-image:url(${thumbUrl}); background-size:cover;"` : ""}></button>`;
          })
          .join("");
        tiles = qsa(".tile");
      })
      .catch(() => {
        if (masonry) masonry.innerHTML = "<p class=\"gallery__empty\">Could not load images.</p>";
      });
  };

  fetch(api("/public/galleries/tree"))
    .then((res) => (res.ok ? res.json() : []))
    .then((tree) => {
      galleryTree = Array.isArray(tree) ? tree : [];
      renderGallery();
      document.body.addEventListener("click", (e) => {
        const folderBtn = e.target.closest("[data-gallery-id]");
        if (folderBtn) {
          e.preventDefault();
          const id = folderBtn.getAttribute("data-gallery-id");
          const name = folderBtn.querySelector(".gallery__folderName")?.textContent || "Folder";
          galleryPath = [...galleryPath, { id, name }];
          renderGallery(id);
        }
        const backBtn = e.target.closest("[data-gallery-back]");
        if (backBtn) {
          e.preventDefault();
          const backId = backBtn.getAttribute("data-gallery-back");
          if (backId === "root") {
            galleryPath = [];
            renderGallery(null);
            return;
          }
          const idx = galleryPath.findIndex((p) => p.id === backId);
          galleryPath = idx >= 0 ? galleryPath.slice(0, idx) : [];
          renderGallery(idx > 0 ? galleryPath[idx - 1]?.id : null);
        }
      });
    })
    .catch(() => {
      if (galleryFolders) galleryFolders.innerHTML = "";
      if (masonry) masonry.innerHTML = "<p class=\"gallery__empty\">Could not load galleries. Check that the Galleries module is enabled.</p>";
    });

  // --- Optional: site/contact config (phone, email, instagram) ---
  fetch(api("/public/site"))
    .then((res) => (res.ok ? res.json() : null))
    .then((site) => {
      if (!site || typeof site !== "object") return;
      const setLinks = (container) => {
        if (!container) return;
        const email = site.contact_email || site.email;
        const phone = site.contact_phone || site.phone;
        const instagram = site.instagram || site.social_instagram;
        if (email) {
          const a = qs('a[href^="mailto:"]', container);
          if (a) { a.href = `mailto:${email}`; a.textContent = email; }
        }
        if (phone) {
          const a = qs('a[href^="tel:"]', container);
          if (a) { a.href = `tel:${phone.replace(/\D/g, "")}`; a.textContent = phone; }
        }
        if (instagram) {
          const a = qs('a[aria-label*="Instagram"]', container) || qs('a[href*="instagram"]', container);
          if (a) { a.textContent = instagram; a.href = instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`; }
        }
      };
      setLinks(qs(".book__aside"));
      setLinks(qs(".contact__grid"));
    })
    .catch(() => {});

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
    document.body.addEventListener("click", (e) => {
      if (e.target.closest(".nav__link, .nav__cta")) closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  let tiles = qsa(".tile");

  // Lightbox
  const lightbox = qs("#lightbox");
  const lbImg = qs("#lightboxImage");
  const lbCap = qs("#lightboxCaption");

  const openLightbox = (title, cat, url) => {
    if (!lightbox || !lbImg || !lbCap) return;
    lbImg.setAttribute("aria-label", title || "Photo preview");
    lbCap.textContent = title ? `${title} • ${cat || ""}` : "Photo preview";
    lbImg.style.backgroundImage = url ? `url(${url})` : "";
    lbImg.style.backgroundSize = "contain";
    lbImg.style.backgroundPosition = "center";
    lbImg.style.backgroundRepeat = "no-repeat";
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

  document.body.addEventListener("click", (e) => {
    const t = e.target.closest(".tile");
    if (t) {
      const url = t.dataset.url || (t.style.backgroundImage || "").replace(/url\(["']?([^"')]+)["']?\)/, "$1");
      openLightbox(t.dataset.title, t.dataset.cat, url);
    }
  });

  qsa("[data-close='1']").forEach((el) => el.addEventListener("click", closeLightbox));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // --- Booking form → contact form API ---
  const form = qs("#bookingForm");
  const note = qs("#formNote");
  if (form && note) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      note.textContent = "Sending…";
      note.style.color = "";

      const contactSlug = document.body.dataset.contactFormSlug || "contact";
      try {
        const formRes = await fetch(api(`/public/contact-forms/by-slug/${encodeURIComponent(contactSlug)}`));
        if (!formRes.ok) throw new Error("Could not load form");
        const formConfig = await formRes.json();
        const formId = formConfig.id;

        const data = {
          name: qs("#name", form)?.value || "",
          email: qs("#email", form)?.value || "",
          service: qs("#service", form)?.value || "",
          date: qs("#date", form)?.value || "",
          message: qs("#message", form)?.value || "",
        };

        const subParam = TENANT_ID ? `tenantId=${encodeURIComponent(TENANT_ID)}` : `domain=${encodeURIComponent(DOMAIN)}`;
        const subRes = await fetch(`${API_BASE}/public/contact-forms/${formId}/submissions?${subParam}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });

        if (!subRes.ok) {
          const err = await subRes.json();
          throw new Error(err.message || "Submission failed");
        }

        note.textContent = "Sent! We'll be in touch soon.";
        note.style.color = "var(--sage)";
        form.reset();
      } catch (err) {
        note.textContent = err.message || "Could not send. Try again.";
        note.style.color = "var(--coral)";
      }
      setTimeout(() => (note.textContent = ""), 6000);
    });
  }

  // Access code (demo)
  const accessBtn = qs("#accessBtn");
  const accessCode = qs("#accessCode");
  if (accessBtn && accessCode) {
    accessBtn.addEventListener("click", () => {
      const code = accessCode.value.trim();
      alert(code ? `Demo: unlocking gallery for code "${code}".` : "Enter an access code first.");
    });
  }
})();
