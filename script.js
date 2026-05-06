(() => {
  // Year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('.nav-main a').forEach(a => {
      a.addEventListener('click', () => {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal on scroll
  const targets = document.querySelectorAll(
    '.hero-copy, .hero-visual, .trust-item, .section-head, .product-card, .spec-row, .service, .about-copy, .stat, .contact-copy, .contact-form'
  );
  targets.forEach(el => el.setAttribute('data-reveal', ''));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
  } else {
    targets.forEach(el => el.classList.add('is-visible'));
  }

  // Smooth-scroll offset for sticky header
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (ev) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      const headerOffset = (document.querySelector('.site-header')?.offsetHeight || 0) + 8;
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // Form: simple client-side validation feedback (no submission backend yet)
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Anfrage übermittelt — wir melden uns.';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = original;
        form.reset();
      }, 4000);
    });
  }
})();
