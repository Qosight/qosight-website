/* =========================================================
   QOSIGHT — SCRIPT
   Sections: Mobile nav, header shadow on scroll, project form
   validation, review modal + star rating, case-study placeholder
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Mobile navigation ---------- */
  var menuToggle = document.getElementById('menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');

  menuToggle.addEventListener('click', function () {
    var isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    mobileNav.classList.toggle('open', !isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  });

  // Close mobile menu after tapping a link
  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    });
  });

  /* ---------- Header background on scroll ---------- */
  var header = document.getElementById('site-header');
  var lastScrollState = false;
  window.addEventListener('scroll', function () {
    var scrolled = window.scrollY > 8;
    if (scrolled !== lastScrollState) {
      header.style.borderBottomColor = scrolled ? 'var(--accent-dim)' : 'var(--border)';
      lastScrollState = scrolled;
    }
  });

  /* ---------- Case study placeholder links ---------- */
  document.querySelectorAll('[data-case-study]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      alert('Case studies are coming soon. Replace this link in index.html once the project page is ready.');
    });
  });

  /* ---------- Placeholder contact links (Discord / TikTok) ---------- */
  document.querySelectorAll('[data-placeholder-link]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      alert('Add your real Discord invite or TikTok URL to this link in index.html.');
    });
  });

  /* ---------- Project form validation ---------- */
  var projectForm = document.getElementById('project-form');
  var formStatus = document.getElementById('form-status');

  var requiredFields = [
    { id: 'pf-name', message: 'Please enter your name.' },
    { id: 'pf-discord', message: 'Please enter your Discord username.' },
    { id: 'pf-email', message: 'Please enter a valid email address.', type: 'email' },
    { id: 'pf-community-name', message: 'Please enter your community name.' },
    { id: 'pf-community-type', message: 'Please enter your community type.' },
    { id: 'pf-project-type', message: 'Please select a project type.' },
    { id: 'pf-help', message: 'Let us know what you need help with.' },
    { id: 'pf-description', message: 'Please add a short project description.' }
  ];

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateField(field) {
    var input = document.getElementById(field.id);
    var errorEl = document.getElementById(field.id + '-error');
    var value = input.value.trim();
    var valid = value.length > 0;

    if (valid && field.type === 'email') {
      valid = isValidEmail(value);
    }

    if (errorEl) {
      errorEl.textContent = valid ? '' : field.message;
    }
    input.style.borderColor = valid ? 'var(--border)' : '#E08585';

    return valid;
  }

  projectForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var allValid = true;

    requiredFields.forEach(function (field) {
      if (!validateField(field)) {
        allValid = false;
      }
    });

    if (!allValid) {
      formStatus.textContent = 'Please fill in the required fields above.';
      formStatus.style.color = '#E08585';
      return;
    }

    // Front-end only for now. Connect this to your backend, form service,
    // or email handler to actually send the submitted data.
    formStatus.style.color = 'var(--accent)';
    formStatus.textContent = 'Thanks — your project request has been prepared. Connect this form to a backend to send it.';
    projectForm.reset();
  });

  // Clear a field's error as soon as the person starts fixing it
  requiredFields.forEach(function (field) {
    var input = document.getElementById(field.id);
    input.addEventListener('input', function () { validateField(field); });
    input.addEventListener('change', function () { validateField(field); });
  });

  /* ---------- Supabase ---------- */
  var supabaseUrl = 'https://zvupnyqqdbgtyifyarwj.supabase.co';
  var supabasePublishableKey = 'sb_publishable_hO4CNNnCgvK3fopPFvZfgQ_JXqaLsGV';
  var supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabasePublishableKey
  );

  /* ---------- Review modal ---------- */
  var reviewModal = document.getElementById('review-modal');
  var openReviewBtn = document.getElementById('open-review-modal');
  var closeReviewBtn = document.getElementById('close-review-modal');
  var reviewForm = document.getElementById('review-form');
  var reviewStatus = document.getElementById('review-form-status');
  var ratingInput = document.getElementById('rv-rating-value');
  var stars = document.querySelectorAll('.star');

  function openModal() {
    reviewModal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeReviewBtn.focus();
  }

  function closeModal() {
    reviewModal.hidden = true;
    document.body.style.overflow = '';
    openReviewBtn.focus();
  }

  openReviewBtn.addEventListener('click', openModal);
  closeReviewBtn.addEventListener('click', closeModal);

  reviewModal.addEventListener('click', function (e) {
    if (e.target === reviewModal) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !reviewModal.hidden) closeModal();
  });

  /* ---------- Star rating ---------- */
  stars.forEach(function (star) {
    star.addEventListener('click', function () {
      var value = parseInt(star.getAttribute('data-value'), 10);
      ratingInput.value = value;

      stars.forEach(function (s) {
        var active = parseInt(s.getAttribute('data-value'), 10) <= value;
        s.classList.toggle('active', active);
        s.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    });
  });

  /* ---------- Submit review to Supabase ---------- */
  reviewForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var name = document.getElementById('rv-name').value.trim();
    var service = document.getElementById('rv-service').value;
    var text = document.getElementById('rv-text').value.trim();
    var rating = ratingInput.value;
    var permission = document.getElementById('rv-permission').checked;

    if (!name || !text || !rating) {
      reviewStatus.style.color = '#E08585';
      reviewStatus.textContent =
        'Please fill in your name, rating and review.';
      return;
    }

    if (!permission) {
      reviewStatus.style.color = '#E08585';
      reviewStatus.textContent =
        'Please give permission before submitting your review.';
      return;
    }

    reviewStatus.style.color = 'var(--accent)';
    reviewStatus.textContent = 'Submitting your review...';

    var result = await supabaseClient
      .from('reviews')
      .insert([
        {
          name: name,
          service: service,
          rating: Number(rating),
          review: text,
          permission: permission,
          approved: false
        }
      ]);

    if (result.error) {
      console.error('Review submission error:', result.error);

      reviewStatus.style.color = '#E08585';
      reviewStatus.textContent =
        'Something went wrong. Please try again.';
      return;
    }

    reviewStatus.style.color = 'var(--accent)';
    reviewStatus.textContent =
      'Thanks for your feedback — your review was submitted and will be reviewed before appearing publicly.';

    reviewForm.reset();
    ratingInput.value = '';

    stars.forEach(function (s) {
      s.classList.remove('active');
      s.setAttribute('aria-checked', 'false');
    });

    setTimeout(closeModal, 1800);
  });
   
});
