/* ==========================================================================
   FRED'S AUTO — interactions
   No dependencies. Progressive: the page is fully readable without this file.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Signals that JS is in control of entrance/reveal states. Anything hidden
     for animation is hidden only under .js-ready, so a failed script or a
     no-JS browser still shows the whole page. */
  root.classList.add('js-ready');

  /* ------------------------------------------------------------------ */
  /* Header: hairline + elevation once the page leaves the top          */
  /* ------------------------------------------------------------------ */
  var header = document.querySelector('[data-header]');

  if (header) {
    var lastScrolled = null;
    var onScroll = function () {
      var scrolled = window.scrollY > 8;
      if (scrolled !== lastScrolled) {
        header.classList.toggle('is-scrolled', scrolled);
        lastScrolled = scrolled;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile menu                                                         */
  /* ------------------------------------------------------------------ */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');

  if (toggle && menu) {
    var closeTimer = null;
    var isOpen = false;

    var focusables = function () {
      return Array.prototype.slice.call(
        menu.querySelectorAll('a[href], button:not([disabled])')
      );
    };

    var openMenu = function () {
      if (isOpen) return;
      isOpen = true;
      window.clearTimeout(closeTimer);
      menu.hidden = false;
      document.body.classList.add('is-locked');
      toggle.setAttribute('aria-expanded', 'true');
      /* Two frames: let `hidden` removal paint before the transition starts. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          menu.classList.add('is-open');
        });
      });
    };

    var closeMenu = function (returnFocus) {
      if (!isOpen) return;
      isOpen = false;
      menu.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
      closeTimer = window.setTimeout(function () {
        if (!isOpen) menu.hidden = true;
      }, reduced.matches ? 0 : 380);
    };

    toggle.addEventListener('click', function () {
      if (isOpen) closeMenu(false);
      else openMenu();
    });

    /* Anchor links inside the menu should navigate, then close. */
    menu.addEventListener('click', function (event) {
      if (event.target.closest('[data-menu-link]')) closeMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      if (event.key !== 'Tab') return;

      /* Keep focus inside the menu, with the toggle as the first stop. */
      var items = [toggle].concat(focusables());
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (isOpen && window.innerWidth > 900) closeMenu(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveals                                                      */
  /* ------------------------------------------------------------------ */
  var revealTargets = document.querySelectorAll('[data-reveal]');

  var showAll = function () {
    Array.prototype.forEach.call(revealTargets, function (el) {
      el.classList.add('is-visible');
    });
  };

  if (!('IntersectionObserver' in window) || reduced.matches) {
    showAll();
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      /* threshold 0 so sections taller than the viewport still trigger. */
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );

    Array.prototype.forEach.call(revealTargets, function (el) {
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Active nav link                                                     */
  /* ------------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));

  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = navLinks
      .map(function (link) {
        return document.querySelector(link.getAttribute('href'));
      })
      .filter(Boolean);

    var setActive = function (id) {
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
      });
    };

    var navObserver = new IntersectionObserver(
      function (entries) {
        /* The entry closest to the top of the viewport wins. */
        var best = null;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (!best || entry.boundingClientRect.top < best.boundingClientRect.top) {
            best = entry;
          }
        });
        if (best) setActive(best.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      navObserver.observe(section);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Contact form — front-end validation only (demo, no transport)       */
  /* ------------------------------------------------------------------ */
  var form = document.getElementById('inquiry-form');

  if (form) {
    var status = document.getElementById('form-status');

    var rules = {
      name: function (value) {
        if (!value) return 'Please enter your name.';
        if (value.length < 2) return 'Please enter your full name.';
        return '';
      },
      contact: function (value) {
        if (!value) return 'Please add a phone number or email address.';
        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        var digits = value.replace(/[^0-9]/g, '');
        var isPhone = digits.length >= 7 && /^[0-9+()\-.\s]+$/.test(value);
        if (!isEmail && !isPhone) return 'Enter a valid phone number or email address.';
        return '';
      },
      vehicle: function (value) {
        if (!value) return 'Please tell Fred which vehicle it is.';
        if (value.length < 2) return 'Please add a little more detail.';
        return '';
      },
      issue: function (value) {
        if (!value) return 'Please describe the electrical issue.';
        if (value.length < 10) return 'A sentence or two helps narrow the fault down.';
        return '';
      },
      date: function (value) {
        if (!value) return '';
        var picked = new Date(value + 'T00:00:00');
        if (isNaN(picked.getTime())) return 'Please choose a valid date.';
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (picked < today) return 'Please choose today or a later date.';
        return '';
      }
    };

    var fieldFor = function (name) {
      return form.elements[name];
    };

    var errorFor = function (input) {
      return document.getElementById('e-' + input.id.replace(/^f-/, ''));
    };

    var setError = function (input, message) {
      var box = errorFor(input);
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        if (box) {
          box.textContent = message;
          box.classList.add('is-shown');
        }
      } else {
        input.removeAttribute('aria-invalid');
        if (box) {
          box.textContent = '';
          box.classList.remove('is-shown');
        }
      }
      return !message;
    };

    var validateField = function (name) {
      var input = fieldFor(name);
      if (!input) return true;
      return setError(input, rules[name](input.value.trim()));
    };

    var showStatus = function (message, isError) {
      if (!status) return;
      status.textContent = message;
      status.classList.add('is-shown');
      status.classList.toggle('is-error', !!isError);
    };

    Object.keys(rules).forEach(function (name) {
      var input = fieldFor(name);
      if (!input) return;

      input.addEventListener('blur', function () {
        if (input.value.trim() || input.hasAttribute('aria-invalid')) validateField(name);
      });

      /* Clear an error as soon as the field becomes valid — never nag mid-typing. */
      input.addEventListener('input', function () {
        if (input.hasAttribute('aria-invalid')) validateField(name);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var invalid = Object.keys(rules).filter(function (name) {
        return !validateField(name);
      });

      if (invalid.length) {
        showStatus(
          invalid.length === 1
            ? 'One field needs attention before this can be sent.'
            : invalid.length + ' fields need attention before this can be sent.',
          true
        );
        var firstInvalid = fieldFor(invalid[0]);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      showStatus(
        'Your request is complete and valid. This is a demo site, so nothing was sent — ' +
          'no backend is connected and no data left your browser.',
        false
      );
      form.reset();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Footer year                                                         */
  /* ------------------------------------------------------------------ */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
