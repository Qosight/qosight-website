/* =========================================================
   QOSIGHT ADMIN - REVIEW APPROVALS
   Handles the admin.html page only. Uses the same Supabase project as
   the main site. The real security is the Supabase Auth session plus
   the RLS policies already set up on the reviews table, not anything
   in this file. If someone isn't signed in as the admin account, the
   database itself refuses to return pending reviews or apply changes,
   no matter what this script tries to do.
   ========================================================= */

var supabaseClient = supabase.createClient(
  'https://zvupnyqqdbgtyifyarwj.supabase.co',
  'sb_publishable_hO4CNNnCgvK3fopPFvZfgQ_JXqaLsGV'
);

document.addEventListener('DOMContentLoaded', function () {
  var checkingEl = document.getElementById('admin-checking');
  var contentEl = document.getElementById('admin-content');
  var loadingEl = document.getElementById('pending-loading');
  var emptyEl = document.getElementById('pending-empty');
  var gridEl = document.getElementById('pending-grid');
  var logoutBtn = document.getElementById('logout-btn');

  checkSessionAndLoad();

  logoutBtn.addEventListener('click', function () {
    logoutBtn.disabled = true;
    supabaseClient.auth.signOut().then(function () {
      window.location.href = 'index.html';
    });
  });

  function checkSessionAndLoad() {
    supabaseClient.auth.getSession()
      .then(function (result) {
        var session = result.data && result.data.session;
        if (!session) {
          window.location.href = 'index.html';
          return;
        }
        checkingEl.hidden = true;
        contentEl.hidden = false;
        loadPendingReviews();
      })
      .catch(function () {
        window.location.href = 'index.html';
      });
  }

  function loadPendingReviews() {
    loadingEl.hidden = false;
    emptyEl.hidden = true;
    gridEl.innerHTML = '';

    supabaseClient
      .from('reviews')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;

        var reviews = result.data || [];
        loadingEl.hidden = true;

        if (!reviews.length) {
          emptyEl.hidden = false;
          return;
        }

        reviews.forEach(function (review) {
          gridEl.appendChild(buildPendingCard(review));
        });
      })
      .catch(function (error) {
        console.error('Error loading pending reviews:', error);
        loadingEl.textContent = 'Could not load pending reviews. Please refresh the page.';
      });
  }

  function buildPendingCard(review) {
    var card = document.createElement('article');
    card.className = 'pending-card';

    var top = document.createElement('div');
    top.className = 'pending-top';

    if (review.image_url) {
      var img = document.createElement('img');
      img.className = 'pending-avatar';
      img.src = review.image_url;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.remove(); });
      top.appendChild(img);
    }

    var info = document.createElement('div');

    var nameEl = document.createElement('p');
    nameEl.className = 'pending-name';
    nameEl.textContent = review.name || 'Unnamed';
    info.appendChild(nameEl);

    var metaParts = [];
    if (review.service) metaParts.push(review.service);
    if (review.twitch_username) metaParts.push('twitch.tv/' + review.twitch_username);
    if (review.created_at) {
      var d = new Date(review.created_at);
      if (!isNaN(d.getTime())) {
        metaParts.push(d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }));
      }
    }
    if (metaParts.length) {
      var metaEl = document.createElement('p');
      metaEl.className = 'pending-meta';
      metaEl.textContent = metaParts.join(' · ');
      info.appendChild(metaEl);
    }

    top.appendChild(info);
    card.appendChild(top);

    if (review.rating) {
      var full = Math.max(0, Math.min(5, parseInt(review.rating, 10) || 0));
      var starsEl = document.createElement('div');
      starsEl.className = 'pending-stars';
      starsEl.textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
      starsEl.setAttribute('aria-label', full + ' out of 5 stars');
      card.appendChild(starsEl);
    }

    if (review.review) {
      var textEl = document.createElement('p');
      textEl.className = 'pending-text';
      textEl.textContent = '"' + review.review + '"';
      card.appendChild(textEl);
    }

    var flagsEl = document.createElement('div');
    flagsEl.className = 'pending-flags';
    var permissionFlag = document.createElement('span');
    permissionFlag.className = 'pending-flag';
    permissionFlag.textContent = review.permission ? 'Permission given' : 'No permission given';
    flagsEl.appendChild(permissionFlag);
    card.appendChild(flagsEl);

    var actions = document.createElement('div');
    actions.className = 'pending-actions';

    var approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'btn btn-approve btn-small';
    approveBtn.textContent = 'Approve';

    var rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'btn btn-reject btn-small';
    rejectBtn.textContent = 'Reject';

    approveBtn.addEventListener('click', function () {
      approveReview(review.id, approveBtn, rejectBtn);
    });
    rejectBtn.addEventListener('click', function () {
      rejectReview(review.id, review.name, approveBtn, rejectBtn);
    });

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    card.appendChild(actions);

    return card;
  }

  function approveReview(id, approveBtn, rejectBtn) {
    approveBtn.disabled = true;
    rejectBtn.disabled = true;

    supabaseClient
      .from('reviews')
      .update({ approved: true })
      .eq('id', id)
      .then(function (result) {
        if (result.error) throw result.error;
        loadPendingReviews();
      })
      .catch(function (error) {
        console.error('Error approving review:', error);
        alert('Could not approve this review. Please try again.');
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
      });
  }

  function rejectReview(id, name, approveBtn, rejectBtn) {
    var confirmed = window.confirm('Permanently delete this review from ' + (name || 'this reviewer') + '? This cannot be undone.');
    if (!confirmed) return;

    approveBtn.disabled = true;
    rejectBtn.disabled = true;

    supabaseClient
      .from('reviews')
      .delete()
      .eq('id', id)
      .then(function (result) {
        if (result.error) throw result.error;
        loadPendingReviews();
      })
      .catch(function (error) {
        console.error('Error rejecting review:', error);
        alert('Could not delete this review. Please try again.');
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
      });
  }
});
