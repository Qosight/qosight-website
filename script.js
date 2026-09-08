/* =========================================================
   QOSIGHT — SCRIPT
   Sections: Mobile nav, header shadow on scroll, project form
   validation, review modal + star rating, case-study placeholder,
   Supabase-backed review submission
   ========================================================= */

// Supabase client for the Client Reviews form (review-images bucket + reviews table).
// The SDK is loaded via CDN in index.html before this file.
var supabaseClient = supabase.createClient(
  'https://zvupnyqqdbgtyifyarwj.supabase.co',
  'sb_publishable_hO4CNNnCgvK3fopPFvZfgQ_JXqaLsGV'
);

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

  /* ---------- Star rating widget ---------- */
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

  reviewForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('rv-name').value.trim();
    var text = document.getElementById('rv-text').value.trim();
    var rating = ratingInput.value;
    var twitchUsername = document.getElementById('rv-twitch').value.trim();
    var service = document.getElementById('rv-service').value;
    var permission = document.getElementById('rv-permission').checked;
    var imageFile = document.getElementById('rv-image').files[0];
    var submitBtn = reviewForm.querySelector('button[type="submit"]');

    if (!name || !text || !rating) {
      reviewStatus.style.color = '#E08585';
      reviewStatus.textContent = 'Please fill in your name, rating and review.';
      return;
    }

    submitBtn.disabled = true;
    reviewStatus.style.color = 'var(--text-muted)';
    reviewStatus.textContent = 'Submitting your review...';

    // Upload the profile image (if one was selected) to the "review-images"
    // bucket, then insert the review into the "reviews" table with
    // approved: false — Qosight reviews and approves it before it appears
    // publicly in the Client Reviews section.
    Promise.resolve()
      .then(function () {
        if (!imageFile) return null;

        var filePath = Date.now() + '-' + imageFile.name.replace(/\s+/g, '_');

        return supabaseClient.storage
          .from('review-images')
          .upload(filePath, imageFile)
          .then(function (uploadResult) {
            if (uploadResult.error) throw uploadResult.error;

            var publicUrlResult = supabaseClient.storage
              .from('review-images')
              .getPublicUrl(filePath);

            return publicUrlResult.data.publicUrl;
          });
      })
      .then(function (imageUrl) {
        return supabaseClient.from('reviews').insert([{
          name: name,
          twitch_username: twitchUsername || null,
          service: service || null,
          rating: parseInt(rating, 10),
          review: text,
          permission: permission,
          image_url: imageUrl || null,
          approved: false
        }]);
      })
      .then(function (insertResult) {
        if (insertResult.error) throw insertResult.error;

        reviewStatus.style.color = 'var(--accent)';
        reviewStatus.textContent = 'Thanks for your feedback — it will be reviewed before appearing publicly.';
        reviewForm.reset();
        stars.forEach(function (s) {
          s.classList.remove('active');
          s.setAttribute('aria-checked', 'false');
        });
        setTimeout(closeModal, 1800);
      })
      .catch(function (error) {
        console.error('Review submission error:', error);
        reviewStatus.style.color = '#E08585';
        reviewStatus.textContent = 'Review submission error: ' + (error && (error.message || error));
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  /* ---------- Approved reviews (public display) ---------- */
  loadApprovedReviews();

  function loadApprovedReviews() {
    var grid = document.getElementById('reviews-grid');
    var emptyState = document.getElementById('reviews-empty');
    if (!grid || !emptyState) return;

    supabaseClient
      .from('reviews')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;
        var reviews = result.data || [];

        // No approved reviews yet — leave the existing empty state as-is.
        if (!reviews.length) return;

        grid.innerHTML = '';
        reviews.forEach(function (review) {
          grid.appendChild(buildReviewCard(review));
        });
        grid.hidden = false;
        emptyState.hidden = true;
      })
      .catch(function (error) {
        // Fail gracefully — the existing empty state stays visible.
        console.error('Error loading approved reviews:', error);
      });
  }

  function buildReviewCard(review) {
    var card = document.createElement('article');
    card.className = 'review-card';

    var top = document.createElement('div');
    top.className = 'review-top';

    if (review.image_url) {
      var img = document.createElement('img');
      img.className = 'review-avatar';
      img.src = review.image_url;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.remove(); });
      top.appendChild(img);
    }

    var info = document.createElement('div');

    var nameEl = document.createElement('p');
    nameEl.className = 'review-name';
    nameEl.textContent = review.name || 'Qosight Client';
    info.appendChild(nameEl);

    var metaParts = [];
    if (review.service) metaParts.push(review.service);
    if (review.created_at) {
      var d = new Date(review.created_at);
      if (!isNaN(d.getTime())) {
        metaParts.push(d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
      }
    }
    if (metaParts.length) {
      var metaEl = document.createElement('p');
      metaEl.className = 'review-meta-inline';
      metaEl.textContent = metaParts.join(' · ');
      info.appendChild(metaEl);
    }

    top.appendChild(info);
    card.appendChild(top);

    if (review.rating) {
      var full = Math.max(0, Math.min(5, parseInt(review.rating, 10) || 0));
      var starsEl = document.createElement('div');
      starsEl.className = 'review-stars';
      starsEl.textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
      starsEl.setAttribute('aria-label', full + ' out of 5 stars');
      card.appendChild(starsEl);
    }

    if (review.review) {
      var textEl = document.createElement('p');
      textEl.className = 'review-text';
      textEl.textContent = '"' + review.review + '"';
      card.appendChild(textEl);
    }

    if (review.twitch_username) {
      var twitchLink = document.createElement('a');
      twitchLink.className = 'review-twitch-link';
      twitchLink.href = 'https://twitch.tv/' + review.twitch_username;
      twitchLink.target = '_blank';
      twitchLink.rel = 'noopener noreferrer';
      twitchLink.textContent = 'twitch.tv/' + review.twitch_username;
      card.appendChild(twitchLink);
    }

    return card;
  }

});
