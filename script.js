// PJ Wilkinson Photography — layout preserved, content from backend API
(() => {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Config: from config.js or data attributes
  const cfg = window.PJPHOTOS_CONFIG || {};
  const API_BASE = (cfg.apiBase || document.body.dataset.apiBase || "https://api.adeptlogics.com").replace(/\/$/, "");
  const DOMAIN = cfg.domain || document.body.dataset.domain || window.location.hostname || "localhost";
  const TENANT_ID = cfg.tenantId || document.body.dataset.tenantId || "";

  // Show order modal: capture email, store purchase request, send pay-via email
  function showOrderConfirmation(amount, items, { apiBase, tenantId, payment }) {
    if (!items || items.length === 0) return;
    const orderConfirmation = document.getElementById("orderConfirmation");
    const formState = document.getElementById("orderConfirmationForm");
    const successState = document.getElementById("orderConfirmationSuccess");
    const venmoAmount = document.getElementById("venmoAmount");
    const emailForm = document.getElementById("orderEmailForm");
    const emailInput = document.getElementById("orderBuyerEmail");
    const submitBtn = document.getElementById("orderSubmitBtn");
    if (!orderConfirmation || !formState || !successState || !venmoAmount || !emailForm || !emailInput) return;
    formState.hidden = false;
    successState.hidden = true;
    venmoAmount.textContent = amount;
    emailInput.value = "";
    orderConfirmation.hidden = false;
    orderConfirmation.setAttribute("aria-modal", "true");
    setTimeout(() => emailInput.focus(), 10);
    const closeModal = () => {
      orderConfirmation.removeAttribute("aria-modal");
      setTimeout(() => { orderConfirmation.hidden = true; }, 250);
    };
    emailForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = (emailInput.value || "").trim();
      if (!email) return;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }
      const payload = {
        tenantId,
        buyerEmail: email,
        amount: amount,
        items: items.map((img) => ({
          url: img.url || img.thumbnailUrl,
          fileName: img.fileName,
          title: img.title || img.altText,
        })).filter((i) => i.url),
        payment: payment ? { venmo: payment.venmo, zelle: payment.zelle, cashapp: payment.cashapp } : undefined,
      };
      try {
        const res = await fetch(`${apiBase}/public/purchase-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          formState.hidden = true;
          successState.hidden = false;
          const closeBtn = document.getElementById("orderCloseBtn");
          if (closeBtn) closeBtn.onclick = closeModal;
        } else {
          const err = await res.text();
          alert("Something went wrong. Please try again or contact us.\n" + (err || res.status));
        }
      } catch (err) {
        alert("Could not reach the server. Please check your connection and try again.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send me payment instructions";
        }
      }
    };
    const closeBtn = document.getElementById("orderCloseBtn");
    if (closeBtn) closeBtn.onclick = closeModal;
    const escListener = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", escListener);
    const outsideListener = (e) => { if (e.target === orderConfirmation) closeModal(); };
    orderConfirmation.addEventListener("mousedown", outsideListener);
    const cleanup = () => {
      document.removeEventListener("keydown", escListener);
      orderConfirmation.removeEventListener("mousedown", outsideListener);
    };
    orderConfirmation.addEventListener("transitionend", function handler() {
      if (orderConfirmation.hidden) cleanup();
      orderConfirmation.removeEventListener("transitionend", handler);
    });
  }

  const api = (path) => {
    const sep = path.includes("?") ? "&" : "?";
    const param = TENANT_ID ? `tenantId=${encodeURIComponent(TENANT_ID)}` : `domain=${encodeURIComponent(DOMAIN)}`;
    return `${API_BASE}${path}${sep}${param}`;
  };

  const defaultTitle = document.title;
  const pages = {
    home: qs("#homePage"),
    services: qs("#servicesPage"),
    gallery: qs("#galleryPage"),
    buy: qs("#buyPage"),
    about: qs("#aboutPage"),
    book: qs("#bookPage"),
    contact: qs("#contactPage"),
  };
  const pageView = qs("#pageView");
  const pageViewTitle = qs("#pageViewTitle");
  const pageViewBody = qs("#pageViewBody");

  const hideAllPages = () => {
    Object.values(pages).forEach((p) => { if (p) p.hidden = true; });
    if (pageView) pageView.hidden = true;
  };

  const showPageById = (id) => {
    hideAllPages();
    const el = pages[id] || pageView;
    if (el) el.hidden = false;
    const titles = { services: "Services", gallery: "Gallery", buy: "Buy Photos", about: "About", book: "Book Now", contact: "Contact" };
    document.title = id === "home" ? defaultTitle : (titles[id] || id) + " — " + defaultTitle;
    window.scrollTo(0, 0);
  };

  const showApiPage = (slug, page) => {
    if (!pageView || !pageViewTitle || !pageViewBody) return;
    hideAllPages();
    pageViewTitle.textContent = page.title || slug;
    pageViewBody.innerHTML = page.content || "<p>No content.</p>";
    pageView.hidden = false;
    document.title = (page.title || slug) + " — " + defaultTitle;
    window.scrollTo(0, 0);
  };

  const getRouteFromHash = () => {
    const h = (window.location.hash || "#").replace(/^#\/?/, "").trim();
    if (!h) return { page: "home", rest: "" };
    const pathOnly = h.split("?")[0];
    const parts = pathOnly.split("/");
    return { page: (parts[0] || "home").toLowerCase(), rest: parts.slice(1).join("/") };
  };

  const getHashParams = () => {
    const h = (window.location.hash || "").split("?")[1] || "";
    return Object.fromEntries(new URLSearchParams(h));
  };

  let cachedPages = null;
  const route = () => {
    const { page, rest } = getRouteFromHash();
    if (page === "home" || !page) {
      showPageById("home");
      return;
    }
    const builtIn = Object.keys(pages);
    if (builtIn.includes(page)) {
      showPageById(page);
      if (page === "book") {
        const params = getHashParams();
        const isBuyFlow = params.buy === "selected" || params.buy === "whole";
        const paymentCard = qs("#bookPaymentCard");
        const paymentLinks = qs("#bookPaymentLinks");
        if (paymentCard) paymentCard.hidden = !isBuyFlow;
        if (isBuyFlow && paymentLinks) {
          const pmt = cfg.payment || {};
          const links = [];
          const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
          if (pmt.venmo) links.push(`<a href="https://venmo.com/${String(pmt.venmo).replace(/^@/,'')}" target="_blank" rel="noopener">Venmo: ${esc(pmt.venmo)}</a>`);
          if (pmt.zelle) links.push(`<span>Zelle: ${esc(pmt.zelle)}</span>`);
          if (pmt.cashapp) links.push(`<a href="https://cash.app/${String(pmt.cashapp).replace(/^\$/,'')}" target="_blank" rel="noopener">Cash App: ${esc(pmt.cashapp)}</a>`);
          paymentLinks.innerHTML = links.length ? `<p class="book__payment-item">${links.join('</p><p class="book__payment-item">')}</p>` : "";
        }
        if (params.buy === "selected" && params.files) {
          const msg = qs("#message", qs("#bookingForm"));
          if (msg) {
            const files = decodeURIComponent(params.files).split(",").filter(Boolean);
            const fileList = files.map((f) => "• " + f.trim()).join("\n");
            msg.value = "I'd like to purchase the following photos:\n\n" + fileList +
              (params.desc ? "\n\n" + decodeURIComponent(params.desc) : "");
          }
        }
      }
      return;
    }
    const loadAndShow = (apiPages) => {
      const pageBySlug = (arr, s) => arr && arr.find((p) => (p.slug || (p.full_path || "").replace(/^\//, "") || "").toLowerCase() === s);
      const p = pageBySlug(apiPages, page);
      if (p) showApiPage(page, p);
      else showPageById("home");
    };
    if (cachedPages && Array.isArray(cachedPages)) {
      loadAndShow(cachedPages);
      return;
    }
    fetch(api("/public/pages"))
      .then((res) => (res.ok ? res.json() : []))
      .then((apiPages) => {
        cachedPages = Array.isArray(apiPages) ? apiPages : [];
        loadAndShow(cachedPages);
      })
      .catch(() => showPageById("home"));
  };

  window.addEventListener("hashchange", route);
  route();
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#"], a[href="#/"]');
    if (a) {
      e.preventDefault();
      window.location.hash = "#/";
      route();
    }
  });

  const renderGalleryMegaMenu = (tree) => {
    if (!Array.isArray(tree) || !tree.length) return "";
    const renderFolder = (f, isSub = false) => {
      const name = (f.name || "Folder").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      const hasChildren = Array.isArray(f.children) && f.children.length > 0;
      if (hasChildren) {
        const subItems = f.children.map((c) => renderFolder(c, true)).join("");
        const cls = isSub ? "nav__megamenu__link" : "nav__megamenu__heading";
        return `<div class="nav__megamenu__item nav__megamenu__item--has-sub"><a href="#/gallery/${f.id}" class="${cls}">${name}</a><div class="nav__megamenu__sub">${subItems}</div></div>`;
      }
      const cls = isSub ? "nav__megamenu__link" : "nav__megamenu__heading";
      return `<div class="nav__megamenu__item"><a href="#/gallery/${f.id}" class="${cls}">${name}</a></div>`;
    };
    const items = tree.map((f) => renderFolder(f)).join("");
    return `<div class="nav__megamenu"><div class="nav__megamenu__inner"><a href="#/gallery" class="nav__megamenu__all">View all galleries</a><div class="nav__megamenu__list">${items}</div></div></div>`;
  };

  const buildMenuHtml = (items, tree) => {
    const defaultItems = [
      { label: "Home", href: "#/" },
      { label: "Services", href: "#/services" },
      { label: "Gallery", href: "#/gallery", isGallery: true },
      { label: "About", href: "#/about" },
      { label: "Contact", href: "#/contact" },
      { label: "Book Now", href: "#/book", isCta: true },
    ];
    const list = (items && items.length) ? items : defaultItems;
    const hash = (window.location.hash || "").replace(/^#\/?/, "") || "home";
    return list
      .filter((i) => i.visible !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item) => {
        const l = (item.label || "").toLowerCase();
        const isGallery = l.includes("gallery") || item.isGallery;
        let href = item.href || item.external_url || "#";
        if (!href.startsWith("#") && !href.startsWith("http")) href = "#" + href;
        if (item.page && (item.page.slug || item.page.full_path)) href = "#/" + (item.page.slug || item.page.full_path).replace(/^\//, "");
        else if (!item.external_url && item.label && href === "#") {
          if (l.includes("book")) href = "#/book";
          else if (l.includes("home")) href = "#/";
          else if (l.includes("gallery")) href = "#/gallery";
          else if (l.includes("buy")) href = "#/buy";
          else if (l.includes("services")) href = "#/services";
          else if (l.includes("about")) href = "#/about";
          else if (l.includes("contact")) href = "#/contact";
        }
        const isCta = l.includes("book") || item.isCta;
        const slugMap = { home: "", services: "services", gallery: "gallery", "buy photos": "buy", about: "about", contact: "contact", "book now": "book" };
        const slug = slugMap[l] || l.replace(/\s+/g, "");
        const hashBase = hash.split("/")[0];
        const current = hashBase === slug || (hashBase === "" && slug === "");
        const linkClass = isCta
          ? "nav__cta btn btn--primary block py-2 px-3 rounded"
          : "nav__link block py-2 px-3 text-heading rounded hover:bg-neutral-tertiary md:hover:bg-transparent md:border-0 md:hover:text-fg-brand md:p-0";
        const ariaCurrent = !isCta && current ? ' aria-current="page"' : "";
        return `<li><a class="${linkClass}" href="${href}"${ariaCurrent}>${item.label || "Link"}</a></li>`;
      })
      .join("");
  };

  const dynamicMenu = qs("#dynamicMenu");
  if (dynamicMenu) {
    Promise.all([
      fetch(api("/public/pages/menus")).then((r) => (r.ok ? r.json() : [])),
      fetch(api("/public/galleries/tree")).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([menus, tree]) => {
        const headerMenu = Array.isArray(menus) && menus.length ? menus.find((m) => (m.slug || m.name || "").toLowerCase() === "header") || menus[0] : null;
        const items = (headerMenu?.items || []).map((i) => {
          let href = i.external_url || "#";
          if (i.page && (i.page.slug || i.page.full_path)) href = "#/" + (i.page.slug || i.page.full_path).replace(/^\//, "");
          else if (!i.external_url && i.label) {
            const ll = (i.label || "").toLowerCase();
            if (ll.includes("book")) href = "#/book";
            else if (ll.includes("home")) href = "#/";
            else if (ll.includes("gallery")) href = "#/gallery";
            else if (ll.includes("buy")) href = "#/buy";
            else if (ll.includes("services")) href = "#/services";
            else if (ll.includes("about")) href = "#/about";
            else if (ll.includes("contact")) href = "#/contact";
          }
          return { ...i, href };
        });
        dynamicMenu.innerHTML = buildMenuHtml(items, Array.isArray(tree) ? tree : []);
        qsa(".nav__link, .nav__cta, .nav__megamenu__all, .nav__megamenu__heading, .nav__megamenu__link", dynamicMenu).forEach((a) =>
          a.addEventListener("click", () => {
            const menu = qs("#navbar-dropdown");
            const toggle = qs(".nav__toggle");
            if (menu && toggle) { menu.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
            qsa(".nav__item--dropdown", dynamicMenu).forEach((d) => d.classList.remove("is-open"));
          })
        );
        qsa(".nav__item--dropdown", dynamicMenu).forEach((item) => {
          const trigger = qs(".nav__link--dropdown", item);
          if (trigger) {
            trigger.addEventListener("click", (e) => { e.preventDefault(); item.classList.toggle("is-open"); trigger.setAttribute("aria-expanded", item.classList.contains("is-open")); });
            item.addEventListener("mouseenter", () => { if (window.innerWidth >= 900) item.classList.add("is-open"); });
            item.addEventListener("mouseleave", () => { if (window.innerWidth >= 900) item.classList.remove("is-open"); });
          }
        });
      })
      .catch(() => { dynamicMenu.innerHTML = buildMenuHtml(null, []); });
  }

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
      const homePage = qs("#homePage");
      if (homePage && home && home.content) {
        homePage.innerHTML = home.content;
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
  const galleryBuy = qs("#galleryBuy");
  const buyWholeGalleryBtn = qs("#buyWholeGallery");
  const galleryBuySelection = qs("#galleryBuySelection");
  const galleryContent = qs("#galleryContent");
  const selectedCountEl = qs("#selectedCount");
  const galleryBuyPricing = qs("#galleryBuyPricing");
  const galleryBuyThumbs = qs("#galleryBuyThumbs");

  let galleryTree = [];
  let currentGalleryImageCount = 0;
  let currentGalleryImages = [];
  let currentCategoryName = "Gallery";
  const selectedImages = new Set();

  const calcPrice = (n) => {
    if (n <= 0) return { total: 0, desc: "" };
    if (n <= 5) return { total: n * 4, desc: `$${n * 4} ($4 each)` };
    if (n <= 15) return { total: n * 3, desc: `$${n * 3} ($3 each)` };
    if (n <= 30) return { total: 50, desc: "$50 flat" };
    return { total: 75, desc: "$75 flat" };
  };

  const cartFloat = qs("#cartFloat");
  const cartCountEl = qs("#cartCount");
  const cartList = qs("#cartList");
  const cartBuyBtn = qs("#cartBuyBtn");
  const cartClearBtn = qs("#cartClearBtn");

  const updateBuySelection = () => {
    const n = selectedImages.size;
    const selected = currentGalleryImages.filter((img) => selectedImages.has(img._key));

    if (selectedCountEl) selectedCountEl.textContent = n;
    if (n === 0) {
      if (galleryBuySelection) galleryBuySelection.hidden = true;
      if (cartFloat) cartFloat.hidden = true;
      return;
    }
    if (galleryBuySelection) galleryBuySelection.hidden = false;
    if (galleryBuyPricing) {
      const { desc } = calcPrice(n);
      galleryBuyPricing.innerHTML = `<strong>${desc}</strong>`;
    }
    if (galleryBuyThumbs) {
      galleryBuyThumbs.innerHTML = selected
        .map((img) => {
          const thumb = img.thumbnailUrl || img.url;
          const title = (img.title || img.altText || "Photo").replace(/"/g, "&quot;");
          return `<div class="gallery__buy-thumb"><img src="${thumb}" alt="${title}" width="64" height="64"></div>`;
        })
        .join("");
    }

    if (cartFloat && cartList) {
      cartFloat.hidden = false;
      if (cartCountEl) cartCountEl.textContent = n;
      const esc = (s) => (String(s ?? "")).replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const category = esc(currentCategoryName);
        cartList.innerHTML = selected
        .map((img) => {
          const thumb = img.thumbnailUrl || img.url;
          const title = esc(img.title || img.altText || "Photo");
          const fileName = esc(img.fileName || "");
          return `<li class="cart-float__item">
            <img class="cart-float__thumb" src="${thumb}" alt="" width="48" height="48">
            <div class="cart-float__meta">
              <span class="cart-float__name">${title}</span>
              ${fileName ? `<span class="cart-float__file">${fileName}</span>` : ""}
              <span class="cart-float__cat">${category}</span>
            </div>
          </li>`;
        })
        .join("");
    }
  };

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
    const hash = (window.location.hash || "").replace(/^#\/?/, "");
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
    if (gallerySubtitle) gallerySubtitle.textContent = current?.description || "";

    if (galleryFolders) {
      if (children.length === 0 && !folderId) {
        galleryFolders.innerHTML = "<p class=\"gallery__empty\">No folders found. See troubleshooting below.</p>";
      } else if (children.length > 0) {
        galleryFolders.innerHTML = children
          .map((f) => {
            // Show up to 4 preview images if available
            const previews = (f.images && f.images.length)
              ? f.images.slice(0, 4).map((img, i) => `<img src="${img.thumbUrl || img.url || img}" alt="" class="gallery__folderPreviewImg gallery__folderPreviewImg--fan${i}" loading="lazy">`).join("")
              : '<div class="gallery__folderNoImg">No preview</div>';
            return `<a href="#" data-gallery-id="${f.id}" class="gallery__folder gallery__folder--block" aria-label="Open folder: ${(f.name || "").replace(/"/g, "&quot;")}">
              <div class="gallery__folderPreview">${previews}</div>
              <div class="gallery__folderBlockLabel">
                <span class="gallery__folderName">${(f.name || "Folder").replace(/</g, "&lt;")}</span>
                <span class="gallery__folderCount">${(typeof f._allImagesCount === 'number' ? f._allImagesCount : (f.images && f.images.length ? f.images.length : '')) + (f._allImagesCount === 1 ? ' photo' : f._allImagesCount > 1 ? ' photos' : '')}</span>
              </div>
            </a>`;
          })
          .join("");
      } else {
        galleryFolders.innerHTML = "";
      }
    }
    if (masonry) masonry.innerHTML = "Loading…";
    if (!folderId) {
      if (children.length === 0) {
        masonry.innerHTML = "<p class=\"gallery__empty\"><strong>No gallery folders to display.</strong></p><p class=\"gallery__empty\">Check: (1) <code>config.js</code> <code>tenantId</code> must match the tenant in Admin where your galleries live. (2) <code>apiBase</code> must point to your backend (use <code>http://localhost:3000</code> for local). (3) In Admin → Galleries, ensure folders exist and status is <strong>Active</strong>.</p>";
      } else {
        masonry.innerHTML = "Select a folder above to view images.";
      }
      return;
    }
    fetch(api(`/public/galleries/${folderId}/images`))
      .then((res) => (res.ok ? res.json() : []))
      .then((images) => {
        if (!masonry) return;
        if (!Array.isArray(images) || !images.length) {
          masonry.innerHTML = "<p class=\"gallery__empty\">No images in this folder.</p>";
          if (galleryBuy) { galleryBuy.hidden = true; }
          return;
        }
        currentGalleryImages = images.map((img, i) => ({ ...img, _key: `tile-${i}` }));
        currentCategoryName = current?.name || "Gallery";
        const esc = (s) => (String(s ?? "")).replace(/"/g, "&quot;").replace(/</g, "&lt;");
        const imgEl = (img, uniqueIdx) => {
          const thumbUrl = img.thumbnailUrl || img.url;
          const fullUrl = img.url || img.thumbnailUrl;
          const title = img.title || img.altText || "Photo";
          const imgId = img._key ?? `tile-${uniqueIdx}`;
          const chkId = `chk-${uniqueIdx}`;
          return `<div class="gallery__tile-wrap" data-image-id="${esc(imgId)}">
            <button class="tile gallery__img-wrap" data-cat="gallery" data-image-id="${esc(imgId)}" data-title="${esc(title)}" data-url="${esc(fullUrl)}" type="button" aria-label="Open photo: ${esc(title)}"><img class="h-auto max-w-full rounded-base" src="${esc(thumbUrl || fullUrl)}" alt="${esc(title)}"></button>
            <div class="gallery__tile-select"><input type="checkbox" class="gallery__tile-check" id="${esc(chkId)}"><span class="gallery__tile-select-area"></span></div>
          </div>`;
        };
        const numCols = Math.min(4, currentGalleryImages.length);
        const baseCount = Math.floor(currentGalleryImages.length / numCols);
        const remainder = currentGalleryImages.length % numCols;
        const columns = [];
        let idx = 0;
        for (let c = 0; c < numCols; c++) {
          const count = baseCount + (c < remainder ? 1 : 0);
          const col = currentGalleryImages.slice(idx, idx + count);
          if (col.length) columns.push(col);
          idx += count;
        }
        let tileIdx = 0;
        const html = `<div class="gallery-masonry">${columns.map((col) => `<div class="gallery-masonry__col">${col.map((img) => {
          const h = `<div>${imgEl(img, tileIdx)}</div>`;
          tileIdx++;
          return h;
        }).join("")}</div>`).join("")}</div>`;
        masonry.innerHTML = html;
        tiles = qsa(".tile");
        if (galleryBuy && buyWholeGalleryBtn) {
          galleryBuy.hidden = false;
          currentGalleryImageCount = currentGalleryImages.length;
          galleryBuySelection.hidden = true;
          galleryContent?.classList.remove("is-select-mode");
          selectedImages.clear();
          updateBuySelection();
          const n = currentGalleryImages.length;
          const { desc } = calcPrice(n);
          buyWholeGalleryBtn.textContent = `Buy whole gallery (${n} photo${n !== 1 ? "s" : ""} – ${desc})`;
        }
      })
      .catch(() => {
        if (masonry) masonry.innerHTML = "<p class=\"gallery__empty\">Could not load images.</p>";
      });
  };

  fetch(api("/public/galleries/tree"))
    .then((res) => (res.ok ? res.json() : []))
    .then(async (tree) => {
      // Helper: recursively inject preview images from folder's own images endpoint
      async function injectPreviews(folders) {
        for (const folder of folders) {
          // Always fetch all images to get the true count
          let imgs = [];
          // First, process children so their images/counts are available
          if (folder.children && folder.children.length) {
            await injectPreviews(folder.children);
          }
          try {
            const res = await fetch(api(`/public/galleries/${folder.id}/images`));
            if (res.ok) {
              imgs = await res.json();
            }
          } catch (e) {}
          if (Array.isArray(imgs) && imgs.length) {
            folder._allImagesCount = imgs.length;
            folder.images = imgs.slice(0, 4);
          } else {
            // If no images, look for images in children (now guaranteed to be loaded)
            let childImages = [];
            let childCount = 0;
            const gather = (nodes) => {
              for (const n of nodes) {
                if (n.images && n.images.length) childImages.push(...n.images);
                if (typeof n._allImagesCount === 'number') childCount += n._allImagesCount;
                if (n.children && n.children.length) gather(n.children);
              }
            };
            if (folder.children && folder.children.length) {
              gather(folder.children);
            }
            if (childImages.length) {
              folder.images = childImages.slice(0, 4);
            }
            if (childCount > 0) {
              folder._allImagesCount = childCount;
            }
          }
        }
      }
      if (Array.isArray(tree)) {
        await injectPreviews(tree);
      }
      galleryTree = Array.isArray(tree) ? tree : [];
      const hash = (window.location.hash || "").replace(/^#\/?/, "");
      if (!hash.match(/^gallery/)) renderGallery();
      else syncGalleryFromHash();
      window.addEventListener("hashchange", () => {
        const h = (window.location.hash || "").replace(/^#\/?/, "");
        if (h.match(/^gallery/)) syncGalleryFromHash();
      });
      document.body.addEventListener("click", (e) => {
        const folderBtn = e.target.closest("[data-gallery-id]");
        if (folderBtn) {
          e.preventDefault();
          const id = folderBtn.getAttribute("data-gallery-id");
          const name = folderBtn.querySelector(".gallery__folderName")?.textContent || "Folder";
          galleryPath = [...galleryPath, { id, name }];
          window.location.hash = "#/gallery/" + id;
          renderGallery(id);
        }
        const backBtn = e.target.closest("[data-gallery-back]");
        if (backBtn) {
          e.preventDefault();
          const backId = backBtn.getAttribute("data-gallery-back");
          if (backId === "root") {
            galleryPath = [];
            window.location.hash = "#/gallery";
            renderGallery(null);
            return;
          }
          const idx = galleryPath.findIndex((p) => p.id === backId);
          galleryPath = idx >= 0 ? galleryPath.slice(0, idx) : [];
          const targetId = idx > 0 ? galleryPath[idx - 1]?.id : null;
          window.location.hash = targetId ? "#/gallery/" + targetId : "#/gallery";
          renderGallery(targetId);
        }
      });
    })
    .catch(() => {
      if (galleryFolders) galleryFolders.innerHTML = "";
      if (masonry) {
        masonry.innerHTML = "<p class=\"gallery__empty\"><strong>Could not load galleries.</strong></p><p class=\"gallery__empty\">Check: (1) <code>config.js</code> <code>apiBase</code> points to the production API. (2) Your hosting domain is allowed (CORS). (3) Galleries module is enabled in Admin.</p>";
      }
    });

  const selectPhotosBtn = qs("#selectPhotosBtn");
  const buySelectedBtn = qs("#buySelectedBtn");
  const clearSelectionBtn = qs("#clearSelectionBtn");

  if (buyWholeGalleryBtn) {
    buyWholeGalleryBtn.addEventListener("click", () => {
      const n = currentGalleryImageCount ?? 0;
      const { total } = calcPrice(n);
      const items = currentGalleryImages || [];
      showOrderConfirmation(`$${total}`, items, {
        apiBase: API_BASE,
        tenantId: TENANT_ID,
        payment: cfg.payment,
      });
    });
  }
  if (selectPhotosBtn) {
    selectPhotosBtn.addEventListener("click", () => {
      galleryContent?.classList.toggle("is-select-mode");
      const inSelect = galleryContent?.classList.contains("is-select-mode");
      selectPhotosBtn.textContent = inSelect ? "Cancel selection" : "Select photos";
      if (!inSelect) {
        selectedImages.clear();
        qsa(".gallery__tile-check").forEach((c) => { c.checked = false; });
        updateBuySelection();
      }
    });
  }
  if (buySelectedBtn) {
    buySelectedBtn.addEventListener("click", () => {
      const n = selectedImages.size;
      if (n === 0) return;
      const { total } = calcPrice(n);
      const items = (currentGalleryImages || []).filter((img) => selectedImages.has(img._key));
      showOrderConfirmation(`$${total}`, items, {
        apiBase: API_BASE,
        tenantId: TENANT_ID,
        payment: cfg.payment,
      });
    });
  }
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", () => {
      selectedImages.clear();
      qsa(".gallery__tile-check").forEach((c) => { c.checked = false; });
      updateBuySelection();
    });
  }
  if (cartBuyBtn) {
    cartBuyBtn.addEventListener("click", () => buySelectedBtn?.click());
  }
  if (cartClearBtn) {
    cartClearBtn.addEventListener("click", () => clearSelectionBtn?.click());
  }
  document.body.addEventListener("change", (e) => {
    const chk = e.target.closest(".gallery__tile-check");
    if (chk) {
      const id = chk.closest(".gallery__tile-wrap")?.getAttribute("data-image-id");
      if (id) {
        if (chk.checked) selectedImages.add(id);
        else selectedImages.delete(id);
        updateBuySelection();
      }
    }
  });
  document.body.addEventListener("click", (e) => {
    if (!galleryContent?.classList.contains("is-select-mode")) return;
    const wrap = e.target.closest(".gallery__tile-wrap");
    if (!wrap) return;
    const chk = wrap.querySelector(".gallery__tile-check");
    if (!chk) return;
    e.preventDefault();
    e.stopPropagation();
    chk.checked = !chk.checked;
    const id = wrap.getAttribute("data-image-id");
    if (id) {
      if (chk.checked) selectedImages.add(id);
      else selectedImages.delete(id);
      updateBuySelection();
    }
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
  const menu = qs("#navbar-dropdown");
  if (toggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.body.addEventListener("click", (e) => {
      if (e.target.closest(".nav__link, .nav__cta, .nav__megamenu__all, .nav__megamenu__heading, .nav__megamenu__link")) closeMenu();
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
    if (galleryContent && galleryContent.classList.contains("is-select-mode")) return;
    const t = e.target.closest(".tile.gallery__img-wrap, .tile[data-url]");
    if (!t || !t.dataset.url) return;
    e.preventDefault();
    e.stopPropagation();
    const url = t.dataset.url;
    openLightbox(t.dataset.title, t.dataset.cat, url);
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
