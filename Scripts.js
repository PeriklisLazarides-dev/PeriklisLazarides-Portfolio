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
    buildWireframes();
    buildScrollProgress();
    buildBackToTop();
    buildLightbox();
    setupReveal();
    setupCardGlow();
    setupNavHighlight();
    setupLazyImages();
  });

  /* ============================================================
     Floating wireframe solids (index page only)

     Thin red wireframes drift behind the content and scroll at a
     slower rate than the page, which reads as depth. Each shape is
     plain SVG on a 0..100 viewBox, so it scales to any size.
     ============================================================ */

  /* points helper: [[x,y], ...] -> "x,y x,y" */
  function pts(list) {
    return list.map(function (p) {
      return p[0].toFixed(2) + "," + p[1].toFixed(2);
    }).join(" ");
  }

  /* vertices of a regular n-gon, optionally squashed on Y to fake perspective */
  function ngon(cx, cy, r, n, rot, squashY) {
    var sy = squashY === undefined ? 1 : squashY;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = rot + (i * 2 * Math.PI) / n;
      out.push([cx + r * Math.cos(a), cy + r * sy * Math.sin(a)]);
    }
    return out;
  }

  function poly(list) { return '<polygon points="' + pts(list) + '"/>'; }
  function line(a, b) {
    return '<line x1="' + a[0].toFixed(2) + '" y1="' + a[1].toFixed(2) +
           '" x2="' + b[0].toFixed(2) + '" y2="' + b[1].toFixed(2) + '"/>';
  }

  /* fan of lines from one apex to every vertex of a ring */
  function spokes(apex, ring) {
    return ring.map(function (p) { return line(apex, p); }).join("");
  }

  var SHAPES = {
    cube: function () {
      var front = [[20, 32], [68, 32], [68, 80], [20, 80]];
      var back  = [[38, 16], [86, 16], [86, 64], [38, 64]];
      return poly(front) + poly(back) +
             front.map(function (p, i) { return line(p, back[i]); }).join("");
    },

    octahedron: function () {
      var ring = [[12, 50], [50, 33], [88, 50], [50, 67]];
      return poly(ring) + spokes([50, 8], ring) + spokes([50, 92], ring);
    },

    tetrahedron: function () {
      var base = [[14, 84], [86, 74], [56, 56]];
      return poly(base) + spokes([50, 10], base);
    },

    pyramid: function () {
      var base = [[10, 72], [50, 90], [90, 72], [50, 54]];
      return poly(base) + spokes([50, 10], base);
    },

    sphere: function () {
      return '<circle cx="50" cy="50" r="42"/>' +
             '<ellipse cx="50" cy="50" rx="42" ry="13"/>' +
             '<ellipse cx="50" cy="50" rx="42" ry="27"/>' +
             '<ellipse cx="50" cy="50" rx="13" ry="42"/>' +
             '<ellipse cx="50" cy="50" rx="27" ry="42"/>';
    },

    torus: function () {
      var s = '<ellipse cx="50" cy="50" rx="44" ry="19"/>' +
              '<ellipse cx="50" cy="50" rx="18" ry="8"/>';
      // radial struts suggesting the tube
      for (var i = 0; i < 10; i++) {
        var a = (i * 2 * Math.PI) / 10;
        s += line([50 + 44 * Math.cos(a), 50 + 19 * Math.sin(a)],
                  [50 + 18 * Math.cos(a), 50 + 8 * Math.sin(a)]);
      }
      return s;
    },

    icosahedron: function () {
      var top = [50, 6], bottom = [50, 94];
      var upper = ngon(50, 38, 30, 5, -Math.PI / 2, 0.55);
      var lower = ngon(50, 62, 30, 5, -Math.PI / 2 + Math.PI / 5, 0.55);
      var s = poly(upper) + poly(lower) + spokes(top, upper) + spokes(bottom, lower);
      // the zig-zag band joining the two pentagons
      for (var i = 0; i < 5; i++) {
        s += line(upper[i], lower[i]);
        s += line(upper[i], lower[(i + 4) % 5]);
      }
      return s;
    },

    hexPrism: function () {
      var top = ngon(50, 32, 27, 6, 0, 0.5);
      var bot = ngon(50, 66, 27, 6, 0, 0.5);
      return poly(top) + poly(bot) +
             top.map(function (p, i) { return line(p, bot[i]); }).join("");
    },

    gridPlane: function () {
      var s = "", i, t;
      // a receding ground plane: near edge wide, far edge narrow
      var farL = [32, 26], farR = [68, 26], nearL = [2, 84], nearR = [98, 84];
      for (i = 0; i <= 6; i++) {
        t = i / 6;
        s += line([farL[0] + (nearL[0] - farL[0]) * t, farL[1] + (nearL[1] - farL[1]) * t],
                  [farR[0] + (nearR[0] - farR[0]) * t, farR[1] + (nearR[1] - farR[1]) * t]);
      }
      for (i = 0; i <= 6; i++) {
        t = i / 6;
        s += line([farL[0] + (farR[0] - farL[0]) * t, farL[1]],
                  [nearL[0] + (nearR[0] - nearL[0]) * t, nearL[1]]);
      }
      return s;
    }
  };

    function buildWireframes() {
    // index only — it is the one page with the project/mod grids
    if (!document.querySelector(".projects, .mods")) return;

    var names = Object.keys(SHAPES);
    var small = window.matchMedia("(max-width: 700px)").matches;
    var count = small ? 12 : 24;

    var layer = document.createElement("div");
    layer.id = "wireframes";
    layer.setAttribute("aria-hidden", "true");

    var items = [];

    function rand(min, max) { return min + Math.random() * (max - min); }

    /* Positions come from a shuffled grid rather than pure random, so no two
       shapes can clump. Each shape owns one cell and is jittered inside it. */
    var cols = small ? 2 : 4;
    var rows = Math.ceil(count / cols);
    var cellW = 100 / cols;
    var cellH = 100 / rows;

    var JITTER = 0.55;              // 0 = dead centre of each cell, 1 = anywhere in it
    var BLEED = 5;                  // how far shapes may hang past the edges, in %

    var cells = [];
    for (var col = 0; col < cols; col++) {
      for (var row = 0; row < rows; row++) cells.push([col, row]);
    }
    for (var s = cells.length - 1; s > 0; s--) {
      var t = Math.floor(Math.random() * (s + 1));
      var swap = cells[s]; cells[s] = cells[t]; cells[t] = swap;
    }

    var pad = (1 - JITTER) / 2;

    for (var i = 0; i < count; i++) {
      var name = names[i % names.length];       // spread the set evenly...
      if (i >= names.length) {                  // ...then pick freely
        name = names[Math.floor(Math.random() * names.length)];
      }

      var cell = cells[i];
      var x = cell[0] * cellW + rand(pad, 1 - pad) * cellW;
      var y = cell[1] * cellH + rand(pad, 1 - pad) * cellH;

      // let the outer ring bleed off the edges the way the old layout did
      x = x / 100 * (100 + BLEED * 2) - BLEED;
      y = y / 100 * (100 + BLEED * 2) - BLEED;

      var wrap = document.createElement("div");
      wrap.className = "wf";
      wrap.style.width = rand(small ? 56 : 94, small ? 132 : 226).toFixed(0) + "px";
      wrap.style.left = x.toFixed(2) + "%";
      wrap.style.top = y.toFixed(2) + "%";
      wrap.style.opacity = rand(0.07, 0.17).toFixed(3);

      wrap.innerHTML =
        '<svg class="wf-spin" viewBox="0 0 100 100" style="animation-duration:' +
        rand(40, 130).toFixed(0) + "s;animation-direction:" +
        (Math.random() < 0.5 ? "normal" : "reverse") + '">' +
        SHAPES[name]() + "</svg>";

      layer.appendChild(wrap);
      // shallow depths only, so nothing drifts far off over a long page
      items.push({ el: wrap, depth: rand(0.06, 0.11) });
    }

    document.body.appendChild(layer);

    if (reduceMotion) return; // shapes stay, motion does not

    onScroll(function () {
      var yScroll = window.scrollY;
      for (var j = 0; j < items.length; j++) {
        items[j].el.style.transform =
          "translate3d(0," + (yScroll * items[j].depth).toFixed(1) + "px,0)";
      }
    });
  }

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
        var visible = [];

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var i = visible.indexOf(entry.target);
        if (entry.isIntersecting) {
          if (i === -1) visible.push(entry.target);
        } else if (i !== -1) {
          visible.splice(i, 1);
        }
      });

      Array.prototype.forEach.call(links, function (l) {
        l.classList.remove("active");
      });

      if (!visible.length) return;   // no section in the band — nothing highlighted

      // topmost visible section wins
      var current = visible.reduce(function (a, b) {
        return a.getBoundingClientRect().top < b.getBoundingClientRect().top ? a : b;
      });

      var link = map[current.id];
      if (link) link.classList.add("active");
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
    var pending = 0;

    function run() {
      pending = 0;
      fn();
    }

    function handler() {
      if (pending) return;
      pending = window.requestAnimationFrame(run);
    }

    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler, { passive: true });

    // A page opened in a background tab gets no animation frames, so a frame
    // requested here would stay parked and the pending flag would wedge the
    // handler shut for the rest of the session. Clear it on the way back in.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      if (pending) window.cancelAnimationFrame(pending);
      run();
    });

    fn(); // paint the initial state now rather than waiting for a frame
  }
})();
