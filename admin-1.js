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
        loadRecentVisits();
        loadPortfolioManager();
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

  function loadRecentVisits() {
    var sectionEl = document.getElementById('visits-section');
    var loadingEl = document.getElementById('visits-loading');
    var emptyEl = document.getElementById('visits-empty');
    var listEl = document.getElementById('visit-list');
    if (!sectionEl) return;

    sectionEl.hidden = false;
    loadingEl.hidden = false;
    emptyEl.hidden = true;
    listEl.innerHTML = '';

    supabaseClient
      .from('site_visits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(function (result) {
        if (result.error) throw result.error;

        var visits = result.data || [];
        loadingEl.hidden = true;

        if (!visits.length) {
          emptyEl.hidden = false;
          return;
        }

        visits.forEach(function (visit) {
          listEl.appendChild(buildVisitRow(visit));
        });
      })
      .catch(function (error) {
        console.error('Error loading recent visits:', error);
        loadingEl.textContent = 'Could not load recent visits. Please refresh the page.';
      });
  }

  function buildVisitRow(visit) {
    var row = document.createElement('div');
    row.className = 'visit-row';

    var timeEl = document.createElement('span');
    timeEl.className = 'visit-time';
    var d = new Date(visit.created_at);
    timeEl.textContent = isNaN(d.getTime())
      ? 'Unknown time'
      : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    row.appendChild(timeEl);

    var locationParts = [visit.city, visit.region, visit.country].filter(Boolean);
    var locationEl = document.createElement('span');
    locationEl.className = 'visit-location';
    locationEl.textContent = locationParts.length ? locationParts.join(', ') : 'Unknown location';
    row.appendChild(locationEl);

    var pageEl = document.createElement('span');
    pageEl.className = 'visit-page';
    pageEl.textContent = visit.page || '/';
    row.appendChild(pageEl);

    if (visit.referrer) {
      var refEl = document.createElement('span');
      refEl.className = 'visit-referrer';
      refEl.textContent = 'From: ' + visit.referrer;
      row.appendChild(refEl);
    }

    return row;
  }

  /* ---------- Portfolio manager (Our Work categories and videos) ---------- */
  var portfolioSection = document.getElementById('portfolio-section');
  var portfolioLoading = document.getElementById('portfolio-loading');
  var portfolioCategoriesEl = document.getElementById('portfolio-categories');
  var addCategoryForm = document.getElementById('add-category-form');
  var addCategoryStatus = document.getElementById('add-category-status');

  function slugifyTitle(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function loadPortfolioManager() {
    if (!portfolioSection) return;
    portfolioSection.hidden = false;
    portfolioLoading.hidden = false;
    portfolioCategoriesEl.innerHTML = '';

    supabaseClient
      .from('portfolio_categories')
      .select('*')
      .order('display_order', { ascending: true })
      .then(function (result) {
        if (result.error) throw result.error;
        var categories = result.data || [];
        portfolioLoading.hidden = true;

        var videosByCategory = {};
        var loaders = categories.map(function (category) {
          return supabaseClient
            .from('portfolio_videos')
            .select('*')
            .eq('category_key', category.key)
            .order('created_at', { ascending: true })
            .then(function (videoResult) {
              if (videoResult.error) throw videoResult.error;
              videosByCategory[category.key] = videoResult.data || [];
            });
        });

        return Promise.all(loaders).then(function () {
          categories.forEach(function (category) {
            portfolioCategoriesEl.appendChild(
              buildCategoryBlock(category, videosByCategory[category.key] || [])
            );
          });
        });
      })
      .catch(function (error) {
        console.error('Error loading portfolio manager:', error);
        portfolioLoading.textContent = 'Could not load the portfolio. Please refresh the page.';
      });
  }

  function buildCategoryBlock(category, videos) {
    var card = document.createElement('div');
    card.className = 'portfolio-category-card';

    var header = document.createElement('div');
    header.className = 'portfolio-category-header';

    var h3 = document.createElement('h3');
    h3.textContent = category.title;

    var count = document.createElement('span');
    count.className = 'portfolio-category-count';
    count.textContent = videos.length + ' video' + (videos.length === 1 ? '' : 's');

    header.appendChild(h3);
    header.appendChild(count);
    card.appendChild(header);

    if (category.thumbnail_url) {
      var thumbImg = document.createElement('img');
      thumbImg.src = category.thumbnail_url;
      thumbImg.alt = '';
      thumbImg.style.cssText = 'width:100%;max-width:220px;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border);margin:0.6rem 0;display:block;';
      card.appendChild(thumbImg);
    }

    if (category.description) {
      var desc = document.createElement('p');
      desc.className = 'portfolio-category-desc';
      desc.textContent = category.description;
      card.appendChild(desc);
    }

    var thumbRow = document.createElement('div');
    thumbRow.className = 'portfolio-upload-row';

    var thumbFileInput = document.createElement('input');
    thumbFileInput.type = 'file';
    thumbFileInput.accept = 'image/png,image/jpeg,image/webp';

    var thumbBtn = document.createElement('button');
    thumbBtn.type = 'button';
    thumbBtn.className = 'btn btn-secondary btn-small';
    thumbBtn.textContent = category.thumbnail_url ? 'Change Image' : 'Add Card Image';

    var thumbStatus = document.createElement('p');
    thumbStatus.className = 'portfolio-category-count';

    thumbBtn.addEventListener('click', function () {
      var file = thumbFileInput.files[0];
      if (!file) {
        thumbStatus.textContent = 'Choose an image first.';
        return;
      }
      uploadCategoryThumbnail(category, file, thumbBtn, thumbStatus);
    });

    thumbRow.appendChild(thumbFileInput);
    thumbRow.appendChild(thumbBtn);
    card.appendChild(thumbRow);
    card.appendChild(thumbStatus);

    var videoList = document.createElement('div');
    videoList.className = 'portfolio-video-list';

    if (!videos.length) {
      var emptyRow = document.createElement('p');
      emptyRow.className = 'portfolio-category-count';
      emptyRow.textContent = 'No videos yet.';
      videoList.appendChild(emptyRow);
    } else {
      videos.forEach(function (video, index) {
        var row = document.createElement('div');
        row.className = 'portfolio-video-row';

        var label = document.createElement('span');
        label.textContent = 'Video ' + (index + 1);

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-reject btn-small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function () {
          deletePortfolioVideo(video.id, category.title, index + 1);
        });

        row.appendChild(label);
        row.appendChild(deleteBtn);
        videoList.appendChild(row);
      });
    }
    card.appendChild(videoList);

    var uploadRow = document.createElement('div');
    uploadRow.className = 'portfolio-upload-row';

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/mp4,video/webm,video/quicktime';

    var uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn btn-approve btn-small';
    uploadBtn.textContent = 'Upload Video';

    var uploadStatus = document.createElement('p');
    uploadStatus.className = 'portfolio-category-count';

    uploadBtn.addEventListener('click', function () {
      var file = fileInput.files[0];
      if (!file) {
        uploadStatus.textContent = 'Choose a video file first.';
        return;
      }
      uploadPortfolioVideo(category.key, file, uploadBtn, uploadStatus);
    });

    uploadRow.appendChild(fileInput);
    uploadRow.appendChild(uploadBtn);
    card.appendChild(uploadRow);
    card.appendChild(uploadStatus);

    return card;
  }

  function uploadPortfolioVideo(categoryKey, file, uploadBtn, statusEl) {
    uploadBtn.disabled = true;
    statusEl.textContent = 'Uploading...';

    var filePath = categoryKey + '/' + Date.now() + '-' + file.name.replace(/\s+/g, '_');

    supabaseClient.storage
      .from('portfolio-videos')
      .upload(filePath, file)
      .then(function (uploadResult) {
        if (uploadResult.error) throw uploadResult.error;

        var publicUrlResult = supabaseClient.storage
          .from('portfolio-videos')
          .getPublicUrl(filePath);

        return supabaseClient.from('portfolio_videos').insert([{
          category_key: categoryKey,
          video_url: publicUrlResult.data.publicUrl
        }]);
      })
      .then(function (insertResult) {
        if (insertResult.error) throw insertResult.error;
        loadPortfolioManager();
      })
      .catch(function (error) {
        console.error('Error uploading portfolio video:', error);
        statusEl.textContent = 'Upload failed. Please try again.';
        uploadBtn.disabled = false;
      });
  }

  function uploadCategoryThumbnail(category, file, uploadBtn, statusEl) {
    uploadBtn.disabled = true;
    statusEl.textContent = 'Uploading...';

    var filePath = category.key + '/' + Date.now() + '-' + file.name.replace(/\s+/g, '_');

    supabaseClient.storage
      .from('portfolio-thumbnails')
      .upload(filePath, file)
      .then(function (uploadResult) {
        if (uploadResult.error) throw uploadResult.error;

        var publicUrlResult = supabaseClient.storage
          .from('portfolio-thumbnails')
          .getPublicUrl(filePath);

        return supabaseClient
          .from('portfolio_categories')
          .update({ thumbnail_url: publicUrlResult.data.publicUrl })
          .eq('id', category.id);
      })
      .then(function (updateResult) {
        if (updateResult.error) throw updateResult.error;
        loadPortfolioManager();
      })
      .catch(function (error) {
        console.error('Error uploading category thumbnail:', error);
        statusEl.textContent = 'Upload failed. Please try again.';
        uploadBtn.disabled = false;
      });
  }

  function deletePortfolioVideo(id, categoryTitle, videoNumber) {
    var confirmed = window.confirm('Remove video ' + videoNumber + ' from ' + categoryTitle + '? This cannot be undone.');
    if (!confirmed) return;

    supabaseClient
      .from('portfolio_videos')
      .delete()
      .eq('id', id)
      .then(function (result) {
        if (result.error) throw result.error;
        loadPortfolioManager();
      })
      .catch(function (error) {
        console.error('Error deleting portfolio video:', error);
        alert('Could not delete this video. Please try again.');
      });
  }

  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var titleInput = document.getElementById('new-cat-title');
      var descInput = document.getElementById('new-cat-description');
      var title = titleInput.value.trim();
      var description = descInput.value.trim();

      if (!title) {
        addCategoryStatus.style.color = '#E08585';
        addCategoryStatus.textContent = 'Please enter a category title.';
        return;
      }

      var key = slugifyTitle(title);
      if (!key) {
        addCategoryStatus.style.color = '#E08585';
        addCategoryStatus.textContent = 'Please use at least one letter or number in the title.';
        return;
      }

      var imageInput = document.getElementById('new-cat-image');
      var imageFile = imageInput.files[0];

      addCategoryStatus.style.color = 'var(--text-muted)';
      addCategoryStatus.textContent = 'Adding category...';

      supabaseClient
        .from('portfolio_categories')
        .select('id')
        .eq('key', key)
        .then(function (existingResult) {
          if (existingResult.error) throw existingResult.error;
          if (existingResult.data && existingResult.data.length) {
            throw new Error('A category with a matching name already exists. Try a slightly different title.');
          }

          return supabaseClient
            .from('portfolio_categories')
            .insert([{
              key: key,
              title: title,
              description: description || null,
              display_order: 99
            }])
            .select();
        })
        .then(function (insertResult) {
          if (insertResult.error) throw insertResult.error;
          var newCategory = insertResult.data && insertResult.data[0];

          if (imageFile && newCategory) {
            addCategoryStatus.textContent = 'Category added, uploading image...';
            var filePath = newCategory.key + '/' + Date.now() + '-' + imageFile.name.replace(/\s+/g, '_');

            return supabaseClient.storage
              .from('portfolio-thumbnails')
              .upload(filePath, imageFile)
              .then(function (uploadResult) {
                if (uploadResult.error) throw uploadResult.error;

                var publicUrlResult = supabaseClient.storage
                  .from('portfolio-thumbnails')
                  .getPublicUrl(filePath);

                return supabaseClient
                  .from('portfolio_categories')
                  .update({ thumbnail_url: publicUrlResult.data.publicUrl })
                  .eq('id', newCategory.id);
              });
          }
        })
        .then(function () {
          addCategoryStatus.style.color = 'var(--accent)';
          addCategoryStatus.textContent = 'Category added.';
          addCategoryForm.reset();
          loadPortfolioManager();
        })
        .catch(function (error) {
          console.error('Error adding category:', error);
          addCategoryStatus.style.color = '#E08585';
          addCategoryStatus.textContent = error.message || 'Could not add this category. Please try again.';
        });
    });
  }
});
