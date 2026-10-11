document.addEventListener("DOMContentLoaded", function() {
  'use strict';

  var html = document.querySelector('html'),
    menuOpenIcon = document.querySelector(".nav__icon-menu"),
    menuCloseIcon = document.querySelector(".nav__icon-close"),
    menuList = document.querySelector(".main-nav"),
    toggleTheme = document.querySelector(".toggle-theme"),
    portfolioViewButton = document.querySelector('.portfolio__toggle'),
    btnScrollToTop = document.querySelector(".top");


  /* =======================================================
  // Menu + Theme Switcher + Toggle list view
  ======================================================= */
  menuOpenIcon.addEventListener("click", () => {
    menuOpen();
  });

  menuCloseIcon.addEventListener("click", () => {
    menuClose();
  });

  toggleTheme.addEventListener("click", () => {
    darkMode();
  });

  if (portfolioViewButton) {
    portfolioViewButton.addEventListener("click", () => {
      viewToggle();
    });
    updateGalleryControl();
  }
  toggleTheme.setAttribute('aria-pressed', html.classList.contains('dark-mode'));

  function menuOpen() {
    menuList.classList.add("is-open");
    menuOpenIcon.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () {
      if (menuList.classList.contains('is-open')) menuCloseIcon.focus();
    });
  }

  function menuClose() {
    menuList.classList.remove("is-open");
    menuOpenIcon.setAttribute('aria-expanded', 'false');
    menuOpenIcon.focus();
  }

  document.addEventListener('keydown', function (event) {
    if (!menuList.classList.contains('is-open')) return;
    if (event.key === 'Escape') { menuClose(); return; }
    if (event.key !== 'Tab') return;
    var controls = Array.from(menuList.querySelectorAll('a, button')).filter(function (element) {
      return element.getClientRects().length > 0;
    });
    var first = controls[0], last = controls[controls.length - 1];
    if (!menuList.contains(document.activeElement)) {
      event.preventDefault(); first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });


  // Theme Switcher
  function darkMode() {
    if (html.classList.contains('dark-mode')) {
      html.classList.remove('dark-mode');
      localStorage.removeItem("theme");
      document.documentElement.removeAttribute("dark");
    } else {
      html.classList.add('dark-mode');
      localStorage.setItem("theme", "dark");
      document.documentElement.setAttribute("dark", "");
    }
    toggleTheme.setAttribute('aria-pressed', html.classList.contains('dark-mode'));
  }


  // Toggle list view
  function viewToggle() {
    if (html.classList.contains('view-list')) {
      html.classList.remove('view-list');
      localStorage.removeItem("classView");
      document.documentElement.removeAttribute("list");
    } else {
      html.classList.add('view-list');
      localStorage.setItem("classView", "list");
      document.documentElement.setAttribute("list", "");
    }
    updateGalleryControl();
  }

  function updateGalleryControl() {
    var singleColumn = html.classList.contains('view-list');
    portfolioViewButton.setAttribute('aria-pressed', singleColumn);
    portfolioViewButton.setAttribute('aria-label', singleColumn ? 'Show photographs in a grid' : 'Show photographs in a single column');
  }


  /* =======================
  // Responsive Videos
  ======================= */
  reframe(".post__content iframe:not(.reframe-off), .page__content iframe:not(.reframe-off)");


  /* =======================
  // Zoom Image
  ======================= */
  const lightense = document.querySelector(".page__content img, .post__content img"),
  imageLink = document.querySelectorAll(".page__content a img, .post__content a img");

  if (imageLink) {
    for (var i = 0; i < imageLink.length; i++) imageLink[i].parentNode.classList.add("image-link");
    for (var i = 0; i < imageLink.length; i++) imageLink[i].classList.add("no-lightense");
  }

  if (lightense) {
    Lightense(".page__content img:not(.no-lightense), .post__content img:not(.no-lightense)", {
    padding: 60,
    offset: 30
    });
  }


  /* =======================
  // LazyLoad Images
  ======================= */
  var lazyLoadInstance = new LazyLoad({
    elements_selector: ".lazy"
  })


  /* ==========================
  // Lightbox Gallery
  ========================== */
  const lightbox = GLightbox({
    touchNavigation: true,
    loop: true,
    moreLength: 0,
    autoplayVideos: true
  });


  /* =================================
  // Smooth scroll to the tags page
  ================================= */
  document.querySelectorAll(".tag__link").forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      var target = document.getElementById(decodeURIComponent(this.hash.slice(1)));
      if (!target) return;
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', this.hash);
    });
  });


  /* =======================
  // Scroll Top Button
  ======================= */
  window.addEventListener("scroll", function () {
    window.scrollY > window.innerHeight ? btnScrollToTop.classList.add("is-active") : btnScrollToTop.classList.remove("is-active");
  });

  btnScrollToTop.addEventListener("click", function () {
    if (window.scrollY != 0) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      })
    }
  });

  // Supplementary descriptions: no layout shift or change to touch navigation.
  var activePreviewClose = null;
  document.querySelectorAll('.title-preview').forEach(function (wrapper, index) {
    var link = wrapper.querySelector('a'), preview = wrapper.querySelector('[role="tooltip"]');
    if (!preview) return;
    preview.id = 'writing-preview-' + index;
    var openTimer, closeTimer, suppressed = false;
    function close() {
      clearTimeout(openTimer); clearTimeout(closeTimer);
      preview.classList.remove('is-visible');
      link.removeAttribute('aria-describedby');
      if (activePreviewClose === close) activePreviewClose = null;
    }
    function place() {
      var rect = link.getBoundingClientRect(), box = preview.getBoundingClientRect();
      preview.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - box.width - 16)) + 'px';
      var top = rect.bottom + 10;
      if (top + box.height > window.innerHeight - 16) top = rect.top - box.height - 10;
      preview.style.top = Math.max(16, top) + 'px';
    }
    function open() {
      if (suppressed) return;
      if (activePreviewClose && activePreviewClose !== close) activePreviewClose();
      preview.classList.add('is-visible');
      link.setAttribute('aria-describedby', preview.id);
      place(); activePreviewClose = close;
    }
    link.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover)').matches) return;
      suppressed = false; clearTimeout(closeTimer); openTimer = setTimeout(open, 400);
    });
    wrapper.addEventListener('pointerenter', function () { clearTimeout(closeTimer); });
    wrapper.addEventListener('pointerleave', function () {
      clearTimeout(openTimer);
      if (document.activeElement !== link) closeTimer = setTimeout(close, 160);
      suppressed = false;
    });
    link.addEventListener('focus', function () { suppressed = false; open(); });
    link.addEventListener('blur', function () { suppressed = false; close(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && activePreviewClose === close) { suppressed = true; close(); }
    });
    window.addEventListener('scroll', function () {
      if (document.activeElement === link && preview.classList.contains('is-visible')) place();
      else close();
    }, { passive: true });
    window.addEventListener('resize', close);
  });

  // A small tilt for mouse/trackpad users; static cards for touch and reduced motion.
  var tiltAllowed = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  document.querySelectorAll('.project').forEach(function (card) {
    var frame;
    function reset() {
      cancelAnimationFrame(frame);
      card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y');
    }
    card.addEventListener('pointermove', function (event) {
      if (!tiltAllowed.matches || event.pointerType === 'touch') return;
      var rect = card.getBoundingClientRect();
      var x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      var y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        card.style.setProperty('--tilt-x', (-y * 3).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', (x * 3).toFixed(2) + 'deg');
      });
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('blur', reset);
    tiltAllowed.addEventListener('change', reset);
  });

});
