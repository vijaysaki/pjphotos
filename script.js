// PJ Wilkinson Photography — layout preserved, content from backend API
(() => {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Config: from config.js or data attributes
  const cfg = window.PJPHOTOS_CONFIG || {};
  const API_BASE = (cfg.apiBase || document.body.dataset.apiBase || "https://api.adeptlogics.com").replace(/\/$/, "");
  const DOMAIN = cfg.domain || document.body.dataset.domain || window.location.hostname || "localhost";
  const TENANT_ID = cfg.tenantId || document.body.dataset.tenantId || "";

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

  // --- Build nested gallery dropdown HTML (recursive) ---
  const renderGalleryDropdown = (tree) => {
    if (!Array.isArray(tree) || !tree.length) return "";
    const renderFolder = (f) => {
      const name = (f.name || "Folder").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      const link = `<a href="#gallery/${f.id}" class="nav__dropdown__link">${name}</a>`;
      if (f.children?.length) {
        const sub = f.children.map(renderFolder).join("");
        return `<div class="nav__dropdown__item nav__dropdown__item--has-sub"><a href="#gallery/${f.id}" class="nav__dropdown__link nav__dropdown__parent">${name}</a><div class="nav__dropdown__sub">${sub}</div></div>`;
      }
      return `<div class="nav__dropdown__item">${link}</div>`;
    };
    const items = tree.map(renderFolder).join("");
    return `<div class="nav__dropdown" id="navGalleryDropdown"><a href="#gallery" class="nav__dropdown__link nav__dropdown__link--all">All Galleries</a>${items}</div>`;
  };

  // --- Load menu + gallery tree, inject Gallery dropdown ---
  const dynamicMenu = qs("#dynamicMenu");
  let galleryTreeForNav = [];
  const buildMenuHtml = (items, tree) => {
    const defaultItems = [
      { label: "Home", href: "#" },
      { label: "Services", href: "#/services" },
      { label: "Gallery", href: "#gallery", isGallery: true },
      { label: "Buy Photos", href: "#buy" },
      { label: "About", href: "#/about" },
      { label: "Contact", href: "#/contact" },
      { label: "Book Now", href: "#book", isCta: true },
    ];
    const list = (items && items.length) ? items : defaultItems;
    return list
      .filter((i) => i.visible !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item) => {
        const l = (item.label || "").toLowerCase();
        const isGallery = l.includes("gallery") || item.isGallery;
        if (isGallery && Array.isArray(tree) && tree.length) {
          const dropdown = renderGalleryDropdown(tree);
          return `<div class="nav__item nav__item--dropdown"><a href="#gallery" class="nav__link nav__link--dropdown" aria-expanded="false" aria-haspopup="true">${item.label || "Gallery"} ▾</a>${dropdown}</div>`;
        }
        let href = item.href || item.external_url || "#";
        if (!href.startsWith("#") && !href.startsWith("http")) href = "#" + href;
        if (item.page && (item.page.slug || item.page.full_path)) {
          const slug = (item.page.slug || item.page.full_path).replace(/^\//, "");
          href = "#/" + slug;
        } else if (!item.external_url && item.label && !href) {
          if (l.includes("book")) href = "#book";
          else if (l.includes("home")) href = "#";
          else if (l.includes("gallery")) href = "#gallery";
          else if (l.includes("buy")) href = "#buy";
          else if (l.includes("services")) href = "#/services";
          else if (l.includes("about")) href = "#/about";
          else if (l.includes("contact")) href = "#/contact";
        }
        const isCta = l.includes("book") || item.isCta;
        return `<a class="${isCta ? "btn btn--primary nav__cta" : "nav__link"}" href="${href}">${item.label || "Link"}</a>`;
      })
      .join("");
  };

  if (dynamicMenu) {
    Promise.all([
      fetch(api("/public/pages/menus")).then((r) => (r.ok ? r.json() : [])),
      fetch(api("/public/galleries/tree")).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([menus, tree]) => {
        galleryTreeForNav = Array.isArray(tree) ? tree : [];
        const headerMenu = Array.isArray(menus) && menus.length ? menus.find((m) => (m.slug || m.name || "").toLowerCase() === "header") || menus[0] : null;
        const items = (headerMenu?.items || []).map((i) => {
          let href = i.external_url || "#";
          if (i.page && (i.page.slug || i.page.full_path)) href = "#/" + (i.page.slug || i.page.full_path).replace(/^\//, "");
          else if (!i.external_url && i.label) {
            const ll = (i.label || "").toLowerCase();
            if (ll.includes("book")) href = "#book";
            else if (ll.includes("home")) href = "#";
            else if (ll.includes("gallery")) href = "#gallery";
            else if (ll.includes("buy")) href = "#buy";
            else if (ll.includes("services")) href = "#/services";
            else if (ll.includes("about")) href = "#/about";
            else if (ll.includes("contact")) href = "#/contact";
          }
          return { ...i, href };
        });
        dynamicMenu.innerHTML = buildMenuHtml(items, galleryTreeForNav);
        qsa(".nav__link, .nav__cta, .nav__dropdown__link", dynamicMenu).forEach((a) =>
          a.addEventListener("click", () => {
            const menu = qs("#navMenu");
            const toggle = qs(".nav__toggle");
            if (menu && toggle) {
              menu.classList.remove("is-open");
              toggle.setAttribute("aria-expanded", "false");
            }
            qsa(".nav__item--dropdown", dynamicMenu).forEach((d) => d.classList.remove("is-open"));
          })
        );
        qsa(".nav__item--dropdown", dynamicMenu).forEach((item) => {
          const trigger = qs(".nav__link--dropdown", item);
          if (trigger) {
            trigger.addEventListener("click", (e) => {
              e.preventDefault();
              item.classList.toggle("is-open");
              trigger.setAttribute("aria-expanded", item.classList.contains("is-open"));
            });
            item.addEventListener("mouseenter", () => {
              if (window.innerWidth >= 900) item.classList.add("is-open");
            });
            item.addEventListener("mouseleave", () => {
              if (window.innerWidth >= 900) item.classList.remove("is-open");
            });
          }
        });
      })
      .catch(() => {
        dynamicMenu.innerHTML = buildMenuHtml(null, []);
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

  const findPathToFolder = (tree, id, path = []) => {
    for (const f of tree) {
      if (f.id === id) return [...path, { id: f.id, name: f.name || "Folder" }];
      if (f.children?.length) {
        const found = findPathToFolder(f.children, id, [...path, { id: f.id, name: f.name || "Folder" }]);
        if (found) return found;
      }
    }
    return null;
  };

  const syncGalleryFromHash = () => {
    const hash = (window.location.hash || "").replace(/^#/, "");
    const match = hash.match(/^gallery(?:\/([a-f0-9-]+))?/i);
    if (!match) return;
    const folderId = match[1] || null;
    if (galleryTree.length) {
      if (folderId) {
        const path = findPathToFolder(galleryTree, folderId);
        galleryPath = path ? path.slice(0, -1) : [];
        renderGallery(folderId);
      } else {
        galleryPath = [];
        renderGallery(null);
      }
      const el = qs("#gallery");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
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
      const hash = (window.location.hash || "").replace(/^#/, "");
      if (!hash.match(/^gallery/)) renderGallery();
      else syncGalleryFromHash();
      window.addEventListener("hashchange", () => {
        const h = (window.location.hash || "").replace(/^#/, "");
        if (h.match(/^gallery/)) syncGalleryFromHash();
      });
      document.body.addEventListener("click", (e) => {
        const folderBtn = e.target.closest("[data-gallery-id]");
        if (folderBtn) {
          e.preventDefault();
          const id = folderBtn.getAttribute("data-gallery-id");
          const name = folderBtn.querySelector(".gallery__folderName")?.textContent || "Folder";
          galleryPath = [...galleryPath, { id, name }];
          window.location.hash = "#gallery/" + id;
          renderGallery(id);
        }
        const backBtn = e.target.closest("[data-gallery-back]");
        if (backBtn) {
          e.preventDefault();
          const backId = backBtn.getAttribute("data-gallery-back");
          if (backId === "root") {
            galleryPath = [];
            window.location.hash = "#gallery";
            renderGallery(null);
            return;
          }
          const idx = galleryPath.findIndex((p) => p.id === backId);
          galleryPath = idx >= 0 ? galleryPath.slice(0, idx) : [];
          const targetId = idx > 0 ? galleryPath[idx - 1]?.id : null;
          window.location.hash = targetId ? "#gallery/" + targetId : "#gallery";
          renderGallery(targetId);
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

      const contactSlug = cfg.contactFormSlug || document.body.dataset.contactFormSlug || "contact";
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
