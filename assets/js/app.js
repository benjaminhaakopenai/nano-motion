(function nanoMotionApp() {
  "use strict";

  var catalogue = window.NANO_MOTION_CATALOGUE || { categories: [], products: [] };
  var config = window.NANO_MOTION_CONFIG || { currency: "GBP", locale: "en-GB" };
  var keys = {
    consent: "nanoMotion.consent",
    cart: "nanoMotion.cart",
    user: "nanoMotion.user",
    eventLog: "nanoMotion.eventLog",
    checkout: "nanoMotion.checkout",
    order: "nanoMotion.order"
  };

  var route = {
    page: document.body.dataset.page || "home",
    category: document.body.dataset.category || "",
    product: null
  };

  function byId(id) { return document.getElementById(id); }
  function qs(selector, parent) { return (parent || document).querySelector(selector); }
  function qsa(selector, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(selector)); }
  function readJSON(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function money(value) {
    return new Intl.NumberFormat(config.locale || "en-GB", {
      style: "currency",
      currency: config.currency || "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }
  function timestampId(prefix) {
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }
  function getCategory(slug) {
    return catalogue.categories.find(function (category) { return category.slug === slug; });
  }
  function getProduct(idOrSlug) {
    return catalogue.products.find(function (product) {
      return product.id === idOrSlug || product.slug === idOrSlug;
    });
  }
  function productUrl(product) {
    return "product.html?id=" + encodeURIComponent(product.slug);
  }
  function consentGranted() {
    var consent = readJSON(keys.consent, null);
    return Boolean(consent && consent.measurement === true);
  }
  function getCart() { return readJSON(keys.cart, []); }
  function setCart(cart) {
    writeJSON(keys.cart, cart);
    updateCartCount();
  }
  function getCartDetails() {
    return getCart().map(function (line) {
      return Object.assign({}, line, { product: getProduct(line.id) });
    }).filter(function (line) { return Boolean(line.product); });
  }
  function totals(lines) {
    var subtotal = lines.reduce(function (sum, line) { return sum + line.product.price * line.quantity; }, 0);
    var shipping = subtotal === 0 || subtotal >= 150 ? 0 : 8;
    return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
  }
  function totalQuantity(lines) {
    return lines.reduce(function (sum, line) { return sum + line.quantity; }, 0);
  }
  function cartItemsForEvent(lines) {
    return lines.map(function (line) {
      return {
        id: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        item_price: line.product.price,
        size: line.size,
        color: line.color
      };
    });
  }

  var tracker = {
    track: function track(eventName, parameters) {
      var granted = consentGranted();
      var safeParameters = Object.assign({}, parameters || {});
      var payload = Object.assign({
        event: eventName,
        event_name: eventName,
        event_id: timestampId("EVT"),
        event_timestamp: new Date().toISOString(),
        event_source: "nano_motion_website"
      }, safeParameters);

      var log = readJSON(keys.eventLog, []);
      log.unshift({
        status: granted ? "dispatched" : "blocked",
        name: eventName,
        at: payload.event_timestamp,
        payload: payload
      });
      writeJSON(keys.eventLog, log.slice(0, 30));

      if (granted) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(payload);
        document.dispatchEvent(new CustomEvent("nano:measurement", { detail: payload }));
      }

      renderEventLog();
      syncMeasurementBadges();
      return granted;
    }
  };

  function icon(name) {
    var icons = {
      bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 7.5h10.4l1 12H5.8l1-12Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
      user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/></svg>',
      menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
      copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M16 8V5H5v11h3"/></svg>'
    };
    return icons[name] || "";
  }

  function artSVG(kind) {
    var art = {
      shoe: '<path d="M28 122c26 9 44 2 64-17l21 27c9 11 23 18 42 21l22 4c8 1 13 6 13 13 0 9-8 15-22 17H60c-26 0-42-7-48-21-5-12 0-26 16-44Z"/><path d="m91 106 29 2M103 119l28 1M18 161c45 10 111 10 167 0"/>',
      shorts: '<path d="M50 36h100l-6 66 24 72h-60l-8-49-8 49H32l24-72-6-66Z"/><path d="M53 62h94M100 41v84"/>',
      shell: '<path d="m64 48 36-18 36 18 43 38-26 33-20-17 8 75H59l8-75-20 17-26-33 43-38Z"/><path d="M100 31v146M72 52l28 27 28-27M59 143h82"/>',
      tank: '<path d="M68 35h20c0 18 24 18 24 0h20c3 28 18 37 26 53l-20 16-4 73H66l-4-73-20-16c8-16 23-25 26-53Z"/><path d="M66 122h68"/>',
      tights: '<path d="M62 34h76l-4 55-13 90H82L66 89l-4-55Z"/><path d="M65 61h70M100 89v90"/>',
      bra: '<path d="M49 63c17-5 29-17 35-35h32c6 18 18 30 35 35l-10 74c-28 13-54 13-82 0L49 63Z"/><path d="M58 96c28 11 56 11 84 0M71 42l29 56 29-56"/>',
      jacket: '<path d="m67 43 33-17 33 17 48 39-27 39-19-14 7 72H58l7-72-19 14-27-39 48-39Z"/><path d="M100 27v152M68 44l32 30 32-30M70 119l-4 25h25M130 119l4 25h-25"/>',
      vest: '<path d="M68 38 89 26h22l21 12 23 29-17 23-5 87H67l-5-87-17-23 23-29Z"/><path d="M100 27v150M68 68h64M65 102h70M64 137h72"/>',
      gilet: '<path d="M68 38 90 25h20l22 13 21 35-19 19 5 85H61l5-85-19-19 21-35Z"/><path d="M100 26v151M69 45l31 31 31-31"/>',
      bottle: '<path d="M80 42h40l4 25 12 17v84c0 9-7 16-16 16H80c-9 0-16-7-16-16V84l12-17 4-25Z"/><path d="M82 20h36v22H82zM69 98h62M92 124h16"/>',
      cap: '<path d="M35 117c2-53 30-82 65-82s63 29 65 82H35Z"/><path d="M35 117c45-7 91-5 147 11 10 3 9 16-4 19-54 10-101 0-143-30ZM100 36v78"/>',
      bag: '<path d="M41 68h118l13 107H28L41 68Z"/><path d="M70 75V54c0-18 12-30 30-30s30 12 30 30v21M55 105h90v47H55z"/>',
      mat: '<path d="M38 70h106c25 0 38 15 38 38s-13 38-38 38H38V70Z"/><ellipse cx="38" cy="108" rx="20" ry="38"/><path d="M38 70c15 0 24 13 24 38s-9 38-24 38"/>',
      blocks: '<path d="m35 75 72-24 43 26-72 28-43-30Z"/><path d="m35 75 5 67 40 29-2-66M78 105l72-28-3 65-67 29"/><path d="m91 45 31-12 43 25-17 7"/>',
      strap: '<path d="M48 63c40-27 91-10 104 25 14 37-21 78-58 60-30-15-16-52 13-49 23 3 28 36 3 60-19 18-56 21-79 3"/><rect x="26" y="143" width="23" height="30" rx="3"/>',
    };
    return '<svg class="product-art-svg" viewBox="0 0 200 210" aria-hidden="true">' + (art[kind] || art.bag) + '</svg>';
  }

  function productArt(product, modifier) {
    return '<div class="product-art tone-' + escapeHTML(product.tone) + ' ' + (modifier || "") + '" style="--product-accent:' + escapeHTML(product.accent) + '">' +
      '<span class="product-art-code">' + escapeHTML(product.id.split("-").slice(-1)[0]) + '</span>' +
      '<span class="product-art-orbit"></span>' +
      artSVG(product.art) +
      '<span class="product-art-caption">NANO / ' + escapeHTML(product.type.toUpperCase()) + '</span>' +
    '</div>';
  }

  function productCard(product) {
    return '<article class="product-card">' +
      '<a class="product-card-visual" href="' + productUrl(product) + '" aria-label="View ' + escapeHTML(product.name) + '">' +
        productArt(product, "product-art-card") +
        (product.badge ? '<span class="product-badge">' + escapeHTML(product.badge) + '</span>' : "") +
      '</a>' +
      '<div class="product-card-copy">' +
        '<div><p class="product-type">' + escapeHTML(product.type) + '</p><h3><a href="' + productUrl(product) + '">' + escapeHTML(product.name) + '</a></h3></div>' +
        '<p class="product-price">' + money(product.price) + '</p>' +
      '</div>' +
    '</article>';
  }

  function renderHeader() {
    var user = readJSON(keys.user, null);
    var navItems = catalogue.categories.map(function (category) {
      var active = route.category === category.slug ? " is-active" : "";
      return '<a class="nav-link' + active + '" href="' + category.page + '">' + escapeHTML(category.name.replace(" gear", "").replace(" apparel", "").replace(" essentials", "")) + '</a>';
    }).join("");

    byId("site-header").innerHTML =
      '<a class="skip-link" href="#main-content">Skip to content</a>' +
      '<div class="demo-rail"><div class="shell demo-rail-inner">' +
        '<p><span class="demo-dot"></span><strong>Demo environment</strong><span>No real purchases or accounts</span></p>' +
        '<div class="demo-actions"><button class="text-button consent-status" type="button" data-cookie-settings>Consent: <span data-consent-label>denied</span></button><button class="text-button" type="button" data-open-events>Event console</button><button class="text-button" type="button" data-reset-demo>Reset demo</button></div>' +
      '</div></div>' +
      '<div class="announcement">Complimentary UK delivery over £150 <span>—</span> 30-day returns</div>' +
      '<header class="main-nav"><div class="shell nav-inner">' +
        '<button class="icon-button menu-button" type="button" data-menu-toggle aria-expanded="false" aria-label="Open menu">' + icon("menu") + '</button>' +
        '<a class="brand" href="index.html" aria-label="Nano Motion home"><span class="brand-mark"><i></i><i></i></span><span>Nano Motion</span></a>' +
        '<nav class="desktop-nav" aria-label="Main navigation">' + navItems + '</nav>' +
        '<div class="nav-tools">' +
          '<a class="nav-account" href="' + (user ? "signin.html" : "signin.html") + '" aria-label="' + (user ? "Signed in account" : "Sign in") + '">' + icon("user") + '<span>' + (user ? "Account" : "Sign in") + '</span></a>' +
          '<a class="bag-link" href="basket.html" aria-label="Shopping basket">' + icon("bag") + '<span class="cart-count" data-cart-count>0</span></a>' +
        '</div>' +
      '</div></header>' +
      '<div class="mobile-menu" data-mobile-menu aria-hidden="true"><div class="mobile-menu-head"><span>Shop Nano Motion</span><button class="icon-button" type="button" data-menu-toggle aria-label="Close menu">' + icon("close") + '</button></div><nav>' + navItems + '<a class="nav-link" href="signup.html">Create account</a></nav></div>';
  }

  function renderFooter() {
    byId("site-footer").innerHTML =
      '<footer class="footer"><div class="shell footer-grid">' +
        '<div class="footer-intro"><a class="brand brand-light" href="index.html"><span class="brand-mark"><i></i><i></i></span><span>Nano Motion</span></a><p>Motion, reduced to what matters.</p><span class="fictional-label">Fictional interview-demo retailer</span></div>' +
        '<div><h2>Shop</h2>' + catalogue.categories.map(function (category) { return '<a href="' + category.page + '">' + escapeHTML(category.name) + '</a>'; }).join("") + '</div>' +
        '<div><h2>Account</h2><a href="signup.html">Create account</a><a href="signin.html">Sign in</a><a href="basket.html">Basket</a><a href="checkout.html">Checkout</a></div>' +
        '<div><h2>Demo controls</h2><button type="button" data-cookie-settings>Cookie settings</button><button type="button" data-open-events>Event console</button><button type="button" data-reset-demo>Reset the demo</button><a href="privacy.html">Demo privacy notice</a></div>' +
      '</div><div class="shell footer-base"><p>© 2026 Nano Motion. Demo only.</p><p>Built for a consented measurement walkthrough.</p></div></footer>';
  }

  function renderHome() {
    var featured = ["aero-knit-runner", "sculpt-7-8-tight", "contour-storm-jacket", "ground-natural-mat"].map(getProduct);
    var categoryCards = catalogue.categories.map(function (category, index) {
      var categoryProduct = catalogue.products.find(function (product) { return product.category === category.slug; });
      return '<a class="category-card category-card-' + (index + 1) + ' tone-' + category.tone + '" href="' + category.page + '">' +
        '<div class="category-card-copy"><span>0' + (index + 1) + '</span><p>' + escapeHTML(category.eyebrow) + '</p><h3>' + escapeHTML(category.name) + '</h3><span class="category-arrow">' + icon("arrow") + '</span></div>' +
        '<div class="category-card-art">' + productArt(categoryProduct, "product-art-category") + '</div>' +
      '</a>';
    }).join("");

    byId("main-content").innerHTML =
      '<section class="hero"><img src="assets/images/nano-motion-hero.png" alt="Two athletes running through modern stone architecture"><div class="hero-wash"></div><div class="shell hero-content"><p class="eyebrow light">The movement collection · 2026</p><h1>Move beyond<br>the expected.</h1><p>Precision activewear for the moments when instinct takes over.</p><div class="button-row"><a class="button button-light" href="running.html">Shop running ' + icon("arrow") + '</a><a class="button button-ghost-light" href="training.html">Explore training</a></div></div><div class="hero-index"><span>01</span><i></i><span>05</span></div></section>' +
      '<section class="section shell intro-statement reveal"><p class="eyebrow">Nano Motion / London</p><div><h2>Technical by nature.<br>Quiet by design.</h2><p>We strip back distraction to create pieces that work harder, feel better and stay relevant beyond the season.</p></div></section>' +
      '<section class="section shell category-section"><div class="section-heading reveal"><div><p class="eyebrow">Explore the system</p><h2>Made for every motion.</h2></div><p>Five focused collections. One considered wardrobe.</p></div><div class="category-grid">' + categoryCards + '</div></section>' +
      '<section class="section product-section"><div class="shell section-heading reveal"><div><p class="eyebrow">Current rotation</p><h2>Built to move now.</h2></div><a class="arrow-link" href="running.html">Shop the edit ' + icon("arrow") + '</a></div><div class="shell product-grid">' + featured.map(productCard).join("") + '</div></section>' +
      '<section class="editorial-band"><div class="editorial-word" aria-hidden="true">NANO</div><div class="shell editorial-copy"><p class="eyebrow light">Material intelligence</p><h2>Less weight.<br>More intent.</h2><p>Every seam, surface and fibre earns its place.</p><a class="button button-light" href="outerwear.html">Discover outerwear ' + icon("arrow") + '</a></div><div class="material-disc"><span>03</span><p>layers<br>of protection</p></div></section>' +
      '<section class="section shell principles"><article><span>01</span><h3>Purposeful performance</h3><p>Function leads every cut, finish and fabric choice.</p></article><article><span>02</span><h3>Considered comfort</h3><p>Tactile, breathable materials that move without noise.</p></article><article><span>03</span><h3>Enduring design</h3><p>Quiet forms made to outlast cycles and seasons.</p></article></section>';
  }

  function renderCategory() {
    var category = getCategory(route.category);
    if (!category) { renderNotFound(); return; }
    var products = catalogue.products.filter(function (product) { return product.category === category.slug; });
    document.title = category.name + " | Nano Motion";
    byId("main-content").innerHTML =
      '<section class="category-hero tone-' + category.tone + '"><div class="shell"><div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><span>' + escapeHTML(category.name) + '</span></div><p class="eyebrow">' + escapeHTML(category.eyebrow) + '</p><h1>' + escapeHTML(category.name) + '</h1><p class="category-intro">' + escapeHTML(category.intro) + '</p><div class="category-count">0' + products.length + ' / pieces</div></div></section>' +
      '<section class="section shell catalogue-section"><div class="catalogue-toolbar"><p><strong>' + products.length + '</strong> considered essentials</p><div class="filter-chips" aria-label="Visual demo filters"><button class="is-active" type="button">All</button><button type="button">New</button><button type="button">Bestsellers</button></div><button class="sort-button" type="button">Sort: Featured ' + icon("chevron") + '</button></div><div class="product-grid category-products">' + products.map(productCard).join("") + '</div></section>' +
      '<section class="category-quote tone-' + category.tone + '"><div class="shell"><p>“Movement reveals what design gets right.”</p><span>Nano Motion product principle</span></div></section>';
  }

  function renderProduct() {
    var params = new URLSearchParams(window.location.search);
    var product = getProduct(params.get("id") || "");
    if (!product) { renderNotFound("We could not find that product."); return; }
    route.product = product;
    route.category = product.category;
    var category = getCategory(product.category);
    document.title = product.name + " | Nano Motion";
    byId("main-content").innerHTML =
      '<section class="product-page shell"><div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><a href="' + category.page + '">' + escapeHTML(category.name) + '</a><span>/</span><span>' + escapeHTML(product.name) + '</span></div>' +
      '<div class="product-layout"><div class="product-gallery">' + productArt(product, "product-art-detail") + '<div class="gallery-note"><span>Engineered detail</span><p>Move to inspect / 01</p></div></div>' +
      '<div class="product-info"><p class="eyebrow">' + escapeHTML(product.type) + '</p><h1>' + escapeHTML(product.name) + '</h1><p class="product-page-price">' + money(product.price) + '</p><p class="product-description">' + escapeHTML(product.description) + '</p>' +
      '<form id="add-to-cart-form"><fieldset><legend>Colour <strong data-selected-color>' + escapeHTML(product.colors[0]) + '</strong></legend><div class="swatches">' + product.colors.map(function (color, index) { return '<label class="swatch ' + (index === 0 ? "is-selected" : "") + '"><input type="radio" name="color" value="' + escapeHTML(color) + '" ' + (index === 0 ? "checked" : "") + '><span style="--swatch:' + (index === 0 ? product.accent : index === 1 ? "#54152b" : "#34383a") + '"></span><em>' + escapeHTML(color) + '</em></label>'; }).join("") + '</div></fieldset>' +
      '<fieldset><legend>Size <button class="size-guide" type="button">Size guide</button></legend><div class="size-grid">' + product.sizes.map(function (size, index) { return '<label><input type="radio" name="size" value="' + escapeHTML(size) + '" ' + (index === 0 ? "checked" : "") + '><span>' + escapeHTML(size) + '</span></label>'; }).join("") + '</div></fieldset>' +
      '<div class="purchase-row"><label class="quantity-field"><span>Qty</span><select name="quantity"><option>1</option><option>2</option><option>3</option></select></label><button class="button button-dark add-button" type="submit">Add to basket <span>' + money(product.price) + '</span></button></div></form>' +
      '<div class="product-promises"><p>' + icon("check") + ' Complimentary delivery over £150</p><p>' + icon("check") + ' Free 30-day returns</p></div>' +
      '<div class="accordions"><details open><summary>Design notes ' + icon("chevron") + '</summary><p>' + escapeHTML(product.detail) + '</p></details><details><summary>Materials & care ' + icon("chevron") + '</summary><p>Technical blend selected for durable stretch and easy care. Machine wash cool and air dry.</p></details><details><summary>Delivery & returns ' + icon("chevron") + '</summary><p>Demo copy only. No goods are sold or dispatched from this fictional storefront.</p></details></div></div></div></section>' +
      '<section class="section related-products"><div class="shell section-heading"><div><p class="eyebrow">Continue the system</p><h2>Pair it with.</h2></div></div><div class="shell product-grid">' + catalogue.products.filter(function (item) { return item.category === product.category && item.id !== product.id; }).map(productCard).join("") + '</div></section>';
  }

  function renderBasket() {
    document.title = "Your basket | Nano Motion";
    var lines = getCartDetails();
    var sum = totals(lines);
    if (!lines.length) {
      byId("main-content").innerHTML = emptyState("Your basket is ready for motion.", "Add a few pieces to begin the measurement journey.", "Explore running", "running.html");
      return;
    }
    byId("main-content").innerHTML =
      '<section class="shell commerce-page"><div class="commerce-heading"><p class="eyebrow">Your selection</p><h1>Basket <span>(' + totalQuantity(lines) + ')</span></h1></div><div class="commerce-layout"><div class="cart-lines">' + lines.map(function (line, index) {
        return '<article class="cart-line" data-line-index="' + index + '"><a href="' + productUrl(line.product) + '">' + productArt(line.product, "product-art-cart") + '</a><div class="cart-line-copy"><div><p class="product-type">' + escapeHTML(line.product.type) + '</p><h2><a href="' + productUrl(line.product) + '">' + escapeHTML(line.product.name) + '</a></h2><p>' + escapeHTML(line.color) + ' / ' + escapeHTML(line.size) + '</p></div><div class="cart-line-actions"><div class="stepper"><button type="button" data-cart-minus="' + index + '" aria-label="Decrease quantity">' + icon("minus") + '</button><span>' + line.quantity + '</span><button type="button" data-cart-plus="' + index + '" aria-label="Increase quantity">' + icon("plus") + '</button></div><button class="remove-button" type="button" data-cart-remove="' + index + '">Remove</button></div></div><p class="cart-line-price">' + money(line.product.price * line.quantity) + '</p></article>';
      }).join("") + '</div>' + orderSummary(sum, lines, true) + '</div></section>';
  }

  function orderSummary(sum, lines, basketMode) {
    return '<aside class="order-summary"><p class="eyebrow">Order summary</p><div class="summary-row"><span>Subtotal</span><strong>' + money(sum.subtotal) + '</strong></div><div class="summary-row"><span>Delivery</span><strong>' + (sum.shipping ? money(sum.shipping) : "Complimentary") + '</strong></div><div class="summary-total"><span>Total <small>including VAT</small></span><strong>' + money(sum.total) + '</strong></div>' +
      (basketMode ? '<button class="button button-dark full-button" type="button" data-start-checkout>Proceed to checkout ' + icon("arrow") + '</button><p class="summary-note">' + icon("check") + ' Secure demo checkout — no payment is taken</p>' : '') +
      '<details class="payload-preview"><summary>Measurement payload preview ' + icon("chevron") + '</summary><pre>' + escapeHTML(JSON.stringify({ id: basketMode ? "NM-CHK-[generated]" : "NM-ORDER-[generated]", name: basketMode ? "Nano Motion checkout" : "Nano Motion order", content_type: "product", quantity: totalQuantity(lines), amount: sum.total, currency: config.currency || "GBP" }, null, 2)) + '</pre></details></aside>';
  }

  function renderCheckout() {
    document.title = "Demo checkout | Nano Motion";
    var lines = getCartDetails();
    var sum = totals(lines);
    if (!lines.length) {
      byId("main-content").innerHTML = emptyState("There is nothing to check out yet.", "Choose a product before continuing to the demo checkout.", "Explore running", "running.html");
      return;
    }
    byId("main-content").innerHTML =
      '<section class="shell checkout-page"><div class="breadcrumbs"><a href="basket.html">Basket</a><span>/</span><span>Checkout</span></div><div class="checkout-header"><div><p class="eyebrow">Final step</p><h1>Demo checkout</h1></div><span class="secure-label">No real payment</span></div><div class="checkout-layout"><form class="checkout-form" id="checkout-form">' +
      '<div class="form-section"><div class="form-section-heading"><span>01</span><div><h2>Contact</h2><p>Your receipt stays in this browser only.</p></div></div><label class="field full"><span>Email address</span><input type="email" name="email" value="demo@nanomotion.example" required autocomplete="email"></label></div>' +
      '<div class="form-section"><div class="form-section-heading"><span>02</span><div><h2>Delivery</h2><p>Use the fictional details supplied for the demo.</p></div></div><div class="field-grid"><label class="field"><span>First name</span><input name="firstName" value="Alex" required></label><label class="field"><span>Last name</span><input name="lastName" value="Morgan" required></label><label class="field full"><span>Address</span><input name="address" value="1 Demo Street" required></label><label class="field"><span>City</span><input name="city" value="London" required></label><label class="field"><span>Postcode</span><input name="postcode" value="W1A 1AA" required></label></div></div>' +
      '<div class="form-section"><div class="form-section-heading"><span>03</span><div><h2>Demo payment</h2><p>These values are illustrative and are never transmitted.</p></div></div><div class="demo-card"><div><span>NANO / DEMO</span><strong>4242&nbsp; 4242&nbsp; 4242&nbsp; 4242</strong></div><p>12 / 30&nbsp;&nbsp;&nbsp; 123</p></div><label class="check-field"><input type="checkbox" required checked><span>' + icon("check") + '</span><em>I understand this is a fictional order and no payment will be taken.</em></label></div>' +
      '<button class="button button-dark full-button place-order" type="submit">Place demo order <strong>' + money(sum.total) + '</strong></button></form>' + orderSummary(sum, lines, false) + '</div></section>';
  }

  function renderOrderComplete() {
    document.title = "Order complete | Nano Motion";
    var order = readJSON(keys.order, null);
    if (!order) {
      byId("main-content").innerHTML = emptyState("No completed demo order found.", "Run through the journey to create an order and fire the final event.", "Start shopping", "running.html");
      return;
    }
    byId("main-content").innerHTML =
      '<section class="complete-page"><div class="complete-orbit"><span>' + icon("check") + '</span></div><p class="eyebrow">Order created</p><h1>Movement,<br>confirmed.</h1><p>Your fictional order <strong>' + escapeHTML(order.id) + '</strong> is complete. No payment was taken and no goods will be dispatched.</p><div class="complete-metrics"><div><span>Order</span><strong>' + escapeHTML(order.id) + '</strong></div><div><span>Pieces</span><strong>' + order.quantity + '</strong></div><div><span>Total</span><strong>' + money(order.total) + '</strong></div></div><div class="complete-event"><div><span class="status-light"></span><div><strong>order_created</strong><p data-order-event-status>Ready for consent check</p></div></div><button class="text-button" type="button" data-open-events>Inspect payload ' + icon("arrow") + '</button></div><div class="button-row centered"><button class="button button-light" type="button" data-reset-demo>Reset & run again</button><a class="button button-ghost-light" href="index.html">Return home</a></div><p class="reset-explainer">Reset clears the basket, account, event history and consent choice, then reopens the consent manager.</p></section>';
  }

  function renderAuth(mode) {
    var isSignup = mode === "signup";
    document.title = (isSignup ? "Create an account" : "Sign in") + " | Nano Motion";
    var user = readJSON(keys.user, null);
    byId("main-content").innerHTML =
      '<section class="auth-page"><div class="auth-art"><div class="auth-art-word">MOVE</div><div class="auth-figure"><span></span><i></i></div><p>Precision begins with intention.</p></div><div class="auth-panel"><a class="brand" href="index.html"><span class="brand-mark"><i></i><i></i></span><span>Nano Motion</span></a>' +
      (user && !isSignup ? '<div class="signed-in-state"><span class="success-mark">' + icon("check") + '</span><p class="eyebrow">Demo account</p><h1>You’re signed in.</h1><p>' + escapeHTML(user.email) + '</p><a class="button button-dark full-button" href="running.html">Shop running ' + icon("arrow") + '</a><button class="text-button" type="button" data-sign-out>Sign out</button></div>' :
      '<div class="auth-copy"><p class="eyebrow">' + (isSignup ? "Join Nano Motion" : "Welcome back") + '</p><h1>' + (isSignup ? "Create your<br>account." : "Sign in to<br>keep moving.") + '</h1><p>' + (isSignup ? "A simple local account for the event demo. Your password is not stored." : "For this demo, any valid email and 6+ character password will work.") + '</p></div><form class="auth-form" id="auth-form" data-mode="' + mode + '"><label class="field full"><span>Email address</span><input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label><label class="field full"><span>Password</span><input type="password" name="password" minlength="6" required autocomplete="' + (isSignup ? "new-password" : "current-password") + '" placeholder="At least 6 characters"></label><button class="button button-dark full-button" type="submit">' + (isSignup ? "Create account" : "Sign in") + ' ' + icon("arrow") + '</button><p class="form-privacy">Demo only. Passwords are validated in your browser and never saved or sent.</p></form><p class="auth-switch">' + (isSignup ? 'Already have an account? <a href="signin.html">Sign in</a>' : 'New to Nano Motion? <a href="signup.html">Create an account</a>') + '</p>') +
      '</div></section>';
  }

  function renderPrivacy() {
    document.title = "Demo privacy notice | Nano Motion";
    byId("main-content").innerHTML =
      '<section class="shell legal-page"><div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><span>Demo privacy</span></div><p class="eyebrow">Plain-language notice</p><h1>Demo privacy<br>and consent.</h1><div class="legal-grid"><aside><p>Last updated</p><strong>11 August 2026</strong><button class="button button-dark" type="button" data-cookie-settings>Cookie settings</button></aside><article><h2>What this is</h2><p>Nano Motion is a fictional storefront created for an interview demonstration. It does not sell products, create real accounts, take payment or dispatch goods.</p><h2>What stays on your device</h2><p>Your consent choice, fictional basket, demo email address and recent event log are held in your browser’s local storage. The password field is never stored. Use “Reset demo” to remove all Nano Motion demo state.</p><h2>Optional measurement</h2><p>The measurement category is denied by default. When accepted, the site makes requested ecommerce events eligible for Google Tag Manager and the configured advertising measurement tag. The site never includes the account email, address or payment-form values in measurement payloads.</p><h2>Production note</h2><p>This notice and consent interface are demonstration material, not legal advice and not a substitute for a production consent management platform, privacy review or vendor agreement.</p></article></div></section>';
  }

  function renderNotFound(message) {
    byId("main-content").innerHTML = emptyState("That page is out of range.", message || "The requested demo content does not exist.", "Return home", "index.html");
  }

  function emptyState(title, copy, button, href) {
    return '<section class="empty-state"><span class="empty-orbit"></span><p class="eyebrow">Nano Motion</p><h1>' + escapeHTML(title) + '</h1><p>' + escapeHTML(copy) + '</p><a class="button button-dark" href="' + href + '">' + escapeHTML(button) + ' ' + icon("arrow") + '</a></section>';
  }

  function renderRoute() {
    if (route.page === "home") renderHome();
    else if (route.page === "category") renderCategory();
    else if (route.page === "product") renderProduct();
    else if (route.page === "basket") renderBasket();
    else if (route.page === "checkout") renderCheckout();
    else if (route.page === "complete") renderOrderComplete();
    else if (route.page === "signup" || route.page === "signin") renderAuth(route.page);
    else if (route.page === "privacy") renderPrivacy();
    else renderNotFound();
  }

  function renderConsentManager(forcePreferences) {
    var existing = byId("consent-layer");
    if (existing) existing.remove();
    var consent = readJSON(keys.consent, null);
    if (consent && !forcePreferences) return;

    var granted = Boolean(consent && consent.measurement);
    var layer = document.createElement("div");
    layer.id = "consent-layer";
    layer.className = "consent-layer";
    layer.innerHTML =
      '<div class="consent-backdrop"></div><section class="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-title"><div class="consent-brand"><span class="brand-mark"><i></i><i></i></span><span>Nano Consent</span><em>Demo CMP</em></div><div class="consent-view" data-consent-summary>' +
      '<p class="eyebrow">Your movement. Your choice.</p><h2 id="consent-title">Choose how this demo measures.</h2><p>We use essential browser storage to keep the demo working. With your permission, measurement events can be sent to Google Tag Manager and an ads measurement tag.</p><div class="consent-proof"><span class="blocked-icon">×</span><div><strong>Measurement is currently blocked</strong><p>The initial <code>page_viewed</code> attempt has not been dispatched to the measurement data layer.</p></div></div><div class="consent-actions"><button class="button button-dark" type="button" data-consent-accept>Accept measurement</button><button class="button button-outline" type="button" data-consent-essential>Only essential</button><button class="text-button manage-link" type="button" data-consent-manage>Manage choices</button></div><p class="consent-fine">Demo interface only. Read our <a href="privacy.html">demo privacy notice</a>.</p></div>' +
      '<div class="consent-view is-hidden" data-consent-preferences><button class="back-link" type="button" data-consent-back>← Back</button><p class="eyebrow">Preference centre</p><h2>Control measurement</h2><div class="preference-row"><div><strong>Essential storage</strong><p>Basket, session and your consent decision.</p></div><span class="always-on">Always on</span></div><label class="preference-row"><div><strong>Ads measurement</strong><p>Allows eligible events to enter GTM for the OpenAI tag.</p></div><input class="switch-input" type="checkbox" data-measurement-toggle ' + (granted ? "checked" : "") + '><span class="switch-ui" aria-hidden="true"></span></label><button class="button button-dark full-button" type="button" data-consent-save>Save choices</button></div>' +
      '</section>';
    document.body.appendChild(layer);
    document.body.classList.add("modal-open");
    setTimeout(function () { layer.classList.add("is-visible"); }, 10);
  }

  function closeConsentManager() {
    var layer = byId("consent-layer");
    if (!layer) return;
    layer.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    setTimeout(function () { if (layer.parentNode) layer.remove(); }, 250);
  }

  function applyConsent(measurement, source) {
    var wasGranted = consentGranted();
    writeJSON(keys.consent, { measurement: Boolean(measurement), source: source, updatedAt: new Date().toISOString() });
    window.gtag("consent", "update", {
      ad_storage: measurement ? "granted" : "denied",
      analytics_storage: measurement ? "granted" : "denied",
      ad_user_data: measurement ? "granted" : "denied",
      ad_personalization: measurement ? "granted" : "denied"
    });
    window.dataLayer.push({
      event: "nano_consent_updated",
      nano_consent_state: measurement ? "granted" : "denied",
      nano_consent_source: source
    });
    closeConsentManager();
    syncMeasurementBadges();
    showToast(measurement ? "Measurement accepted — events are now eligible." : "Only essential storage is active.");
    if (measurement && !wasGranted) measureCurrentPage();
  }

  function renderEventConsole() {
    if (byId("event-console")) return;
    var panel = document.createElement("aside");
    panel.id = "event-console";
    panel.className = "event-console";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML =
      '<div class="event-console-head"><div><p class="eyebrow">Live demo telemetry</p><h2>Event console</h2></div><button class="icon-button" type="button" data-close-events aria-label="Close event console">' + icon("close") + '</button></div><div class="event-status-card"><span class="status-light"></span><div><strong data-console-consent>Consent denied</strong><p data-gtm-status>GTM container not configured</p></div></div><div class="event-console-tools"><button type="button" data-copy-latest>' + icon("copy") + ' Copy latest JSON</button><button type="button" data-clear-events>Clear log</button></div><div class="event-log" data-event-log></div><div class="console-legend"><span><i class="dispatched"></i>Dispatched to dataLayer</span><span><i class="blocked"></i>Blocked before dispatch</span></div>';
    document.body.appendChild(panel);
    renderEventLog();
  }

  function openEventConsole() {
    var panel = byId("event-console");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("console-open");
  }

  function closeEventConsole() {
    var panel = byId("event-console");
    if (!panel) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("console-open");
  }

  function renderEventLog() {
    var container = qs("[data-event-log]");
    if (!container) return;
    var log = readJSON(keys.eventLog, []);
    if (!log.length) {
      container.innerHTML = '<div class="event-empty"><span>∅</span><p>No event attempts yet.</p></div>';
    } else {
      container.innerHTML = log.map(function (record, index) {
        var time = new Date(record.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        return '<details class="event-record ' + record.status + '" ' + (index === 0 ? "open" : "") + '><summary><span class="record-light"></span><div><strong>' + escapeHTML(record.name) + '</strong><small>' + (record.status === "dispatched" ? "dataLayer dispatched" : "blocked — no dispatch") + '</small></div><time>' + time + '</time></summary><pre>' + escapeHTML(JSON.stringify(record.payload, null, 2)) + '</pre></details>';
      }).join("");
    }
    syncMeasurementBadges();
  }

  function syncMeasurementBadges() {
    var granted = consentGranted();
    qsa("[data-consent-label]").forEach(function (element) { element.textContent = granted ? "granted" : "denied"; });
    qsa("[data-console-consent]").forEach(function (element) { element.textContent = granted ? "Measurement consent granted" : "Measurement consent denied"; });
    qsa(".event-status-card").forEach(function (element) { element.classList.toggle("is-granted", granted); });
    var configured = Boolean(window.NANO_MOTION_BOOTSTRAP && window.NANO_MOTION_BOOTSTRAP.gtmConfigured);
    qsa("[data-gtm-status]").forEach(function (element) { element.textContent = configured ? "GTM container loaded" : "GTM placeholder — local contract only"; });
  }

  function updateCartCount() {
    var quantity = getCart().reduce(function (sum, line) { return sum + Number(line.quantity || 0); }, 0);
    qsa("[data-cart-count]").forEach(function (element) {
      element.textContent = quantity;
      element.classList.toggle("has-items", quantity > 0);
    });
  }

  function addToCart(product, quantity, size, color) {
    var cart = getCart();
    var existing = cart.find(function (line) { return line.id === product.id && line.size === size && line.color === color; });
    if (existing) existing.quantity += quantity;
    else cart.push({ id: product.id, quantity: quantity, size: size, color: color });
    setCart(cart);
    tracker.track("items_added", {
      id: product.id,
      name: product.name,
      content_type: "product",
      quantity: quantity,
      amount: product.price * quantity,
      currency: config.currency || "GBP",
      items: [{ id: product.id, name: product.name, quantity: quantity, item_price: product.price, size: size, color: color }]
    });
    showToast(quantity + " × " + product.name + " added to basket.", "View basket", "basket.html");
  }

  function startCheckout() {
    var lines = getCartDetails();
    if (!lines.length) return;
    var sum = totals(lines);
    var checkout = {
      id: timestampId("NM-CHK"),
      createdAt: new Date().toISOString(),
      quantity: totalQuantity(lines),
      total: sum.total
    };
    writeJSON(keys.checkout, checkout);
    tracker.track("checkout_started", {
      id: checkout.id,
      name: "Nano Motion checkout",
      content_type: "product",
      quantity: checkout.quantity,
      amount: checkout.total,
      currency: config.currency || "GBP",
      items: cartItemsForEvent(lines)
    });
    showToast("checkout_started dispatched. Opening checkout…");
    setTimeout(function () { window.location.href = "checkout.html"; }, 450);
  }

  function completeOrder() {
    var lines = getCartDetails();
    var sum = totals(lines);
    var order = {
      id: timestampId("NM-ORDER"),
      name: "Nano Motion order",
      quantity: totalQuantity(lines),
      subtotal: sum.subtotal,
      shipping: sum.shipping,
      total: sum.total,
      currency: config.currency || "GBP",
      items: cartItemsForEvent(lines),
      eventTracked: false,
      createdAt: new Date().toISOString()
    };
    writeJSON(keys.order, order);
    setCart([]);
    window.location.href = "order-complete.html";
  }

  function measureCurrentPage() {
    tracker.track("page_viewed", {
      page_title: document.title,
      page_path: window.location.pathname + window.location.search,
      page_location: window.location.href
    });

    if (route.page === "product" && route.product) {
      tracker.track("contents_viewed", {
        id: route.product.id,
        name: route.product.name,
        content_type: "product",
        quantity: 1,
        amount: route.product.price,
        currency: config.currency || "GBP"
      });
    }

    if (route.page === "complete") {
      var order = readJSON(keys.order, null);
      if (order && !order.eventTracked) {
        var dispatched = tracker.track("order_created", {
          id: order.id,
          name: order.name,
          content_type: "product",
          quantity: order.quantity,
          amount: order.total,
          currency: order.currency,
          items: order.items
        });
        if (dispatched) {
          order.eventTracked = true;
          writeJSON(keys.order, order);
          var status = qs("[data-order-event-status]");
          if (status) status.textContent = "Dispatched to dataLayer — inspect the JSON";
          var completeEvent = qs(".complete-event");
          if (completeEvent) completeEvent.classList.add("is-fired");
        }
      }
    }
  }

  function showToast(message, linkLabel, linkHref) {
    var existing = byId("nano-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.id = "nano-toast";
    toast.className = "toast";
    toast.innerHTML = '<span>' + icon("check") + '</span><p>' + escapeHTML(message) + '</p>' + (linkLabel ? '<a href="' + linkHref + '">' + escapeHTML(linkLabel) + '</a>' : "") + '<button type="button" aria-label="Dismiss">' + icon("close") + '</button>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add("is-visible"); }, 10);
    var timer = setTimeout(function () { toast.classList.remove("is-visible"); setTimeout(function () { toast.remove(); }, 250); }, 4500);
    qs("button", toast).addEventListener("click", function () { clearTimeout(timer); toast.remove(); });
  }

  function resetDemo() {
    var accepted = window.confirm("Reset the complete Nano Motion demo? This clears consent, basket, demo account, order and event history.");
    if (!accepted) return;
    Object.keys(keys).forEach(function (name) { localStorage.removeItem(keys[name]); });
    sessionStorage.removeItem("nanoMotion.session");
    window.location.href = "index.html?reset=1";
  }

  function wireInteractions() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest("button, a");
      if (!target) return;

      if (target.matches("[data-menu-toggle]")) {
        var menu = qs("[data-mobile-menu]");
        var open = !menu.classList.contains("is-open");
        menu.classList.toggle("is-open", open);
        menu.setAttribute("aria-hidden", String(!open));
        qsa("[data-menu-toggle]").forEach(function (button) { button.setAttribute("aria-expanded", String(open)); });
      } else if (target.matches("[data-open-events]")) {
        event.preventDefault(); openEventConsole();
      } else if (target.matches("[data-close-events]")) {
        closeEventConsole();
      } else if (target.matches("[data-cookie-settings]")) {
        event.preventDefault(); renderConsentManager(true);
      } else if (target.matches("[data-reset-demo]")) {
        event.preventDefault(); resetDemo();
      } else if (target.matches("[data-consent-accept]")) {
        applyConsent(true, "accept_all");
      } else if (target.matches("[data-consent-essential]")) {
        applyConsent(false, "essential_only");
      } else if (target.matches("[data-consent-manage]")) {
        qs("[data-consent-summary]").classList.add("is-hidden");
        qs("[data-consent-preferences]").classList.remove("is-hidden");
      } else if (target.matches("[data-consent-back]")) {
        qs("[data-consent-summary]").classList.remove("is-hidden");
        qs("[data-consent-preferences]").classList.add("is-hidden");
      } else if (target.matches("[data-consent-save]")) {
        applyConsent(qs("[data-measurement-toggle]").checked, "preference_centre");
      } else if (target.matches("[data-clear-events]")) {
        writeJSON(keys.eventLog, []); renderEventLog();
      } else if (target.matches("[data-copy-latest]")) {
        var latest = readJSON(keys.eventLog, [])[0];
        if (latest && navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(latest.payload, null, 2));
        showToast(latest ? "Latest payload copied." : "There is no payload to copy yet.");
      } else if (target.matches("[data-start-checkout]")) {
        startCheckout();
      } else if (target.matches("[data-cart-plus]")) {
        var plusIndex = Number(target.dataset.cartPlus);
        var plusCart = getCart();
        var plusLine = plusCart[plusIndex];
        if (plusLine) {
          plusLine.quantity += 1;
          setCart(plusCart);
          var plusProduct = getProduct(plusLine.id);
          tracker.track("items_added", { id: plusProduct.id, name: plusProduct.name, content_type: "product", quantity: 1, amount: plusProduct.price, currency: config.currency || "GBP", items: [{ id: plusProduct.id, name: plusProduct.name, quantity: 1, item_price: plusProduct.price, size: plusLine.size, color: plusLine.color }] });
          renderBasket();
        }
      } else if (target.matches("[data-cart-minus]")) {
        var minusIndex = Number(target.dataset.cartMinus);
        var minusCart = getCart();
        if (minusCart[minusIndex]) {
          minusCart[minusIndex].quantity -= 1;
          if (minusCart[minusIndex].quantity <= 0) minusCart.splice(minusIndex, 1);
          setCart(minusCart); renderBasket();
        }
      } else if (target.matches("[data-cart-remove]")) {
        var removeIndex = Number(target.dataset.cartRemove);
        var removeCart = getCart();
        removeCart.splice(removeIndex, 1); setCart(removeCart); renderBasket();
      } else if (target.matches("[data-sign-out]")) {
        localStorage.removeItem(keys.user); window.location.reload();
      }
    });

    document.addEventListener("change", function (event) {
      if (event.target.matches('input[name="color"]')) {
        qsa(".swatch").forEach(function (swatch) { swatch.classList.toggle("is-selected", qs("input", swatch).checked); });
        var selected = qs("[data-selected-color]");
        if (selected) selected.textContent = event.target.value;
      }
    });

    document.addEventListener("submit", function (event) {
      if (event.target.id === "add-to-cart-form") {
        event.preventDefault();
        var data = new FormData(event.target);
        addToCart(route.product, Number(data.get("quantity")), data.get("size"), data.get("color"));
      } else if (event.target.id === "auth-form") {
        event.preventDefault();
        var authData = new FormData(event.target);
        var mode = event.target.dataset.mode;
        writeJSON(keys.user, { email: authData.get("email"), signedInAt: new Date().toISOString(), mode: mode });
        if (mode === "signup") {
          tracker.track("registration_completed", { registration_method: "email", account_type: "demo" });
          showToast("registration_completed dispatched — your demo account is ready.");
        } else {
          showToast("Signed in locally for the demo.");
        }
        setTimeout(function () { window.location.href = "running.html?welcome=1"; }, 650);
      } else if (event.target.id === "checkout-form") {
        event.preventDefault(); completeOrder();
      }
    });
  }

  function addNoscriptGtmFallback() {
    var id = config.gtmContainerId || "";
    if (!/^GTM-[A-Z0-9]+$/i.test(id) || id === "GTM-XXXXXXX") return;
    var frame = document.createElement("iframe");
    frame.src = "https://www.googletagmanager.com/ns.html?id=" + encodeURIComponent(id);
    frame.height = "0";
    frame.width = "0";
    frame.style.display = "none";
    frame.style.visibility = "hidden";
    frame.title = "Google Tag Manager";
    document.body.insertBefore(frame, document.body.firstChild);
  }

  function init() {
    renderHeader();
    renderRoute();
    renderFooter();
    renderEventConsole();
    updateCartCount();
    wireInteractions();
    addNoscriptGtmFallback();
    measureCurrentPage();
    syncMeasurementBadges();
    if (!readJSON(keys.consent, null)) setTimeout(function () { renderConsentManager(false); }, 180);
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      history.replaceState({}, "", "index.html");
      showToast("Demo reset. Consent is denied until you choose.");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
