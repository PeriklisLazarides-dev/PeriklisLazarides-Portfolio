/* ============================================================
   Periklis Lazarides — Portfolio
   Interaction / effects layer.

   Everything here is injected at runtime, so the HTML files
   keep their original structure.
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    buildScrollProgress();
    buildBackToTop();
    buildLightbox();
    setupReveal();
    setupCardGlow();
    setupNavHighlight();
    setupLazyImages();
  });

  /* ---------- red bar at the top showing scroll position ---------- */

  function buildScrollProgress() {
    var bar = document.createElement("div");
    bar.id = "scroll-progress";
    document.body.appendChild(bar);

    onScroll(function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
      bar.style.width = pct + "%";
    });
  }

  /* ---------- floating back-to-top button ---------- */

  function buildBackToTop() {
    var btn = document.createElement("button");
    btn.id = "back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = "&#8593;";
    document.body.appendChild(btn);

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    onScroll(function () {
      btn.classList.toggle("visible", window.scrollY > 400);
    });
  }

  /* ---------- click any content image to view it full size ---------- */

  function buildLightbox() {
    var box = document.createElement("div");
    box.id = "lightbox";
    box.setAttribute("aria-hidden", "true");

    var full = document.createElement("img");
    full.alt = "";
    box.appendChild(full);
    document.body.appendChild(box);

    function close() {
      box.classList.remove("open");
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    box.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    // only the large images inside article content, not the card thumbnails
    var images = document.querySelectorAll(".container section img, .container div img");

    Array.prototype.forEach.call(images, function (img) {
      if (img.closest(".project") || img.closest(".mod")) return;

      img.addEventListener("click", function () {
        full.src = img.currentSrc || img.src;
        full.alt = img.alt || "";
        box.classList.add("open");
        box.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      });
    });
  }

  /* ---------- fade sections and cards in as they scroll into view ---------- */

  function setupReveal() {
    var targets = document.querySelectorAll(
      ".container > section, .container > h3, .container > p, .container > div[id], .project, .mod, .excel-table"
    );

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add("reveal", "in-view");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    Array.prototype.forEach.call(targets, function (el, i) {
      el.classList.add("reveal");

      // stagger cards within their row so they cascade in
      if (el.classList.contains("project") || el.classList.contains("mod")) {
        el.style.transitionDelay = ((i % 3) * 90) + "ms";
      }

      observer.observe(el);
    });

    // Failsafe: the reveal effect must never be able to leave content hidden.
    // If the observer has not reported anything shortly after load (throttled
    // in a background tab, blocked, jumped straight to an #anchor), show
    // everything outright.
    window.setTimeout(function () {
      if (document.querySelector(".reveal.in-view")) return;

      Array.prototype.forEach.call(targets, function (el) {
        el.style.transitionDelay = "0ms";
        el.classList.add("in-view");
        observer.unobserve(el);
      });
    }, 1500);
  }

  /* ---------- the soft red wash on a card follows the cursor ---------- */

  function setupCardGlow() {
    if (isTouch || reduceMotion) return;

    var cards = document.querySelectorAll(".project, .mod");

    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });

      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "0%");
      });
    });
  }

  /* ---------- mark the header link for the section you are reading ---------- */

  function setupNavHighlight() {
    var links = document.querySelectorAll('header a[href^="#"]');
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var sections = [];

    Array.prototype.forEach.call(links, function (link) {
      var id = decodeURIComponent(link.getAttribute("href").slice(1));
      var target = document.getElementById(id);
      if (!target) return;
      map[id] = link;
      sections.push(target);
    });

    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Array.prototype.forEach.call(links, function (l) {
          l.classList.remove("active");
        });
        var link = map[entry.target.id];
        if (link) link.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ---------- defer offscreen images so phones load the page faster ---------- */

  function setupLazyImages() {
    var images = document.querySelectorAll("img");

    Array.prototype.forEach.call(images, function (img, i) {
      // keep the first couple eager so the header never flashes empty
      if (i > 1 && !img.hasAttribute("loading")) {
        img.setAttribute("loading", "lazy");
      }
      if (!img.hasAttribute("decoding")) {
        img.setAttribute("decoding", "async");
      }
    });
  }

  /* ---------- helper: throttle scroll work to animation frames ---------- */

  function onScroll(fn) {
    var ticking = false;

    function handler() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        fn();
        ticking = false;
      });
    }

    window.addEventListener("scroll", handler, { passive: true });
    handler();
  }
})();
