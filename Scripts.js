/* ============================================================
   Periklis Lazarides — Portfolio
   Small progressive enhancements. Every page works without this file.
   ============================================================ */

(function () {
  "use strict";

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("DOMContentLoaded", function () {
    setupAutoplayVideos();
    buildBackToTop();
    buildLightbox();
    setupNavHighlight();
  });

  /* ---------- looping videos: respect reduced motion ----------
     With reduced motion on, the video stops on its poster and shows
     controls so the visitor can still choose to play it. */

  function setupAutoplayVideos() {
    var videos = document.querySelectorAll("video[autoplay]");

    function apply() {
      Array.prototype.forEach.call(videos, function (v) {
        if (motionQuery.matches) {
          v.pause();
          v.controls = true;
        } else {
          v.controls = false;
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      });
    }

    apply();
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", apply);
  }

  /* ---------- floating back-to-top button ---------- */

  function buildBackToTop() {
    var btn = document.createElement("button");
    btn.id = "back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<span aria-hidden="true">&#8593;</span>';
    document.body.appendChild(btn);

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: motionQuery.matches ? "auto" : "smooth" });
    });

    // the button fills bottom-up with how far down the page you are
    onScroll(function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;

      btn.style.setProperty("--progress", progress.toFixed(3));
      btn.classList.toggle("is-filled", progress > 0.55);
      btn.classList.toggle("is-visible", window.scrollY > 300);
    });
  }

  /* ---------- click a content image to view it full size ----------
     Uses a native <dialog>: focus moves into it, Escape closes it,
     and focus returns to the image that opened it. */

  function buildLightbox() {
    var images = document.querySelectorAll(".prose img");
    if (!images.length || typeof HTMLDialogElement !== "function") return;

    var dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-label", "Image viewer");
    dialog.innerHTML =
      '<button type="button" class="lightbox__close">Close · Esc</button><img alt="">';
    document.body.appendChild(dialog);

    var full = dialog.querySelector("img");
    var opener = null;

    function open(img) {
      opener = img;
      full.src = img.currentSrc || img.src;
      full.alt = img.alt || "";
      dialog.showModal();
    }

    dialog.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("close", function () {
      full.removeAttribute("src");
      if (opener) opener.focus();
    });

    Array.prototype.forEach.call(images, function (img) {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "View full size" + (img.alt ? ": " + img.alt : ""));

      img.addEventListener("click", function () { open(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(img);
        }
      });
    });
  }

  /* ---------- mark the nav link for the section you are reading ---------- */

  function setupNavHighlight() {
    if (!("IntersectionObserver" in window)) return;

    var links = document.querySelectorAll('.site-nav__links a[href^="#"]');
    var map = {};
    var sections = [];

    Array.prototype.forEach.call(links, function (link) {
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      map[target.id] = link;
      sections.push(target);
    });

    if (!sections.length) return;

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
        l.classList.remove("is-active");
        l.removeAttribute("aria-current");
      });

      if (!visible.length) return;

      // topmost visible section wins
      var current = visible.reduce(function (a, b) {
        return a.getBoundingClientRect().top < b.getBoundingClientRect().top ? a : b;
      });

      var link = map[current.id];
      if (link) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "location");
      }
    }, { rootMargin: "-40% 0px -55% 0px" });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ---------- helper: throttle scroll work to animation frames ---------- */

  function onScroll(fn) {
    var pending = 0;

    function run() {
      pending = 0;
      fn();
    }

    window.addEventListener("scroll", function () {
      if (!pending) pending = window.requestAnimationFrame(run);
    }, { passive: true });

    // a background tab gets no frames, so a parked request would wedge the flag
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      if (pending) window.cancelAnimationFrame(pending);
      run();
    });

    fn();
  }
})();
