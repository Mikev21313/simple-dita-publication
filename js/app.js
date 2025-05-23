// Enhanced SPA Application with comments side cart review system

// DOM Elements
const contentEl = document.getElementById('content');
const contentTitleEl = document.getElementById('content-title');
const navigationEl = document.getElementById('navigation');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchResultsEl = document.getElementById('searchResults');

// Review System Elements
const reviewToggleBtn = document.getElementById('reviewToggle');
const startReviewBtn = document.getElementById('startReview');
const clearReviewBtn = document.getElementById('clearReview');

// Base path handling for GitHub Pages
const getBasePath = () => {
  if (location.hostname.includes('github.io')) {
    const pathSegments = location.pathname.split('/');
    if (pathSegments.length > 1) {
      return '/' + pathSegments[1];
    }
  }
  return '';
};

// Current state
window.currentPage = null;
window.reviewMode = false;
window.reviewData = JSON.parse(localStorage.getItem('reviewData') || '{}');
const basePath = getBasePath();

// Debug logging function
function debug(message, data) {
  console.log(`[DITA-SPA] ${message}`, data || '');
}

// Initialize the application
function initApp() {
  debug('Initializing app with base path:', basePath);

  // Render navigation
  renderNavigation(navigationConfig);

  // Set up event listeners
  window.addEventListener('popstate', handlePopState);
  if (searchButton && searchInput) {
      searchButton.addEventListener('click', performSearch);
      searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              performSearch();
          }
      });
  }

  // Review system event listeners
  if (reviewToggleBtn) {
    reviewToggleBtn.addEventListener('click', toggleReviewMode);
  }
  if (startReviewBtn) {
    startReviewBtn.addEventListener('click', startReviewSession);
  }
  if (clearReviewBtn) {
    clearReviewBtn.addEventListener('click', promptClearReviewData);
  }

  // Add print functionality
  document.querySelector('.wh_print_link button').addEventListener('click', (e) => {
    e.preventDefault();
    if (window.reviewMode && window.currentPage) {
      openPrintSnapshotWindow();
    } else {
      window.print();
    }
  });

  // Initialize review system UI
  initReviewSystem();

  // Check if we have a hash in the URL
  const initialPageId = getPageIdFromUrl();

  if (initialPageId) {
    navigateToPage(initialPageId, false);
  } else {
    showWelcomeScreen();
  }
}

// Initialize Review System
function initReviewSystem() {
  debug('Initializing review system');
  
  // Create hover tooltip
  createHoverTooltip();
  
  // Create comment input dialog
  createCommentDialog();
  
  // Create comments side cart
  createCommentsSideCart();
  
  // Create image modal
  createImageModal();
  
  // Create image hover preview
  createImageHoverPreview();
  
  // Create password dialog
  createPasswordDialog();
  
  // Update review button states
  updateReviewButtons();
}

// Create Comments Side Cart (NEW)
function createCommentsSideCart() {
  const sideCart = document.createElement('div');
  sideCart.className = 'comments-side-cart';
  sideCart.id = 'commentsSideCart';
  sideCart.innerHTML = `
    <div class="cart-header">
      <h3>Comments & Suggestions</h3>
      <button class="cart-close-btn" onclick="closeCommentsSideCart()">✕</button>
    </div>
    <div class="cart-content">
      <div class="cart-stats" id="cartStats">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number" id="totalComments">0</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="unresolvedComments">0</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="resolvedComments">0</span>
            <span class="stat-label">Resolved</span>
          </div>
        </div>
      </div>
      <div class="comments-list" id="commentsList">
        <div class="no-comments">
          <div class="no-comments-icon">💬</div>
          <h4>No Comments Yet</h4>
          <p>Select text or click images to add comments and suggestions in review mode.</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(sideCart);
}

// Create Password Dialog (NEW)
function createPasswordDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.id = 'passwordDialogOverlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'password-dialog';
  dialog.id = 'passwordDialog';
  dialog.innerHTML = `
    <h3>⚠️ Clear All Comments</h3>
    <p>This action will permanently delete all comments and suggestions. Please enter the password to confirm:</p>
    <input type="password" id="clearPassword" placeholder="Enter password...">
    <div class="password-dialog-actions">
      <button class="password-dialog-btn secondary" onclick="closePasswordDialog()">Cancel</button>
      <button class="password-dialog-btn danger" onclick="confirmClearReviewData()">Clear All</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  // Close dialog when clicking overlay
  overlay.addEventListener('click', closePasswordDialog);
  
  // Allow Enter key to submit password
  document.getElementById('clearPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmClearReviewData();
    }
  });
}

// Create Image Hover Preview (NEW)
function createImageHoverPreview() {
  const preview = document.createElement('div');
  preview.className = 'image-hover-preview';
  preview.id = 'imageHoverPreview';
  preview.innerHTML = `
    <img src="" alt="Preview">
    <div class="preview-filename"></div>
  `;
  
  document.body.appendChild(preview);
}

// Open Comments Side Cart (NEW)
function openCommentsSideCart() {
  const sideCart = document.getElementById('commentsSideCart');
  if (sideCart) {
    sideCart.classList.add('open');
    updateCommentsSideCart();
  }
}

// Close Comments Side Cart (NEW)
function closeCommentsSideCart() {
  const sideCart = document.getElementById('commentsSideCart');
  if (sideCart) {
    sideCart.classList.remove('open');
  }
}

// Update Comments Side Cart Content (NEW)
function updateCommentsSideCart() {
  if (!window.currentPage) return;
  
  const comments = getCommentsForPage(window.currentPage);
  const resolvedCount = comments.filter(c => c.resolved).length;
  const unresolvedCount = comments.length - resolvedCount;
  
  // Update statistics
  document.getElementById('totalComments').textContent = comments.length;
  document.getElementById('unresolvedComments').textContent = unresolvedCount;
  document.getElementById('resolvedComments').textContent = resolvedCount;
  
  // Update comments list
  const commentsList = document.getElementById('commentsList');
  
  if (comments.length === 0) {
    commentsList.innerHTML = `
      <div class="no-comments">
        <div class="no-comments-icon">💬</div>
        <h4>No Comments Yet</h4>
        <p>Select text or click images to add comments and suggestions in review mode.</p>
      </div>
    `;
    return;
  }
  
  // Sort comments by timestamp (newest first)
  const sortedComments = comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  commentsList.innerHTML = sortedComments.map(comment => `
    <div class="comment-item ${comment.resolved ? 'resolved' : ''}" data-comment-id="${comment.id}">
      <div class="comment-header">
        <span class="comment-type-badge ${comment.type}">${comment.type}</span>
        <span class="comment-timestamp">${new Date(comment.timestamp).toLocaleDateString()} ${new Date(comment.timestamp).toLocaleTimeString()}</span>
      </div>
      
      <div class="comment-selected-text">
        "${comment.selectedText}"
        ${comment.selectionType === 'image' ? ' (Image)' : ''}
      </div>
      
      ${comment.text ? `<div class="comment-text">${comment.text}</div>` : ''}
      
      ${comment.uploadedImages && comment.uploadedImages.length > 0 ? `
        <div class="comment-images">
          <div class="comment-images-header">
            📎 ${comment.uploadedImages.length} image${comment.uploadedImages.length > 1 ? 's' : ''}
          </div>
          <div class="image-preview-grid">
            ${comment.uploadedImages.map(img => `
              <div class="image-preview-item">
                <div class="image-filename">${img.name}</div>
                <img src="${img.data}" alt="${img.name}" class="comment-image-thumb" 
                     onmouseenter="showImageHoverPreview(event, '${img.data}', '${img.name}')"
                     onmouseleave="hideImageHoverPreview()"
                     onclick="showImageModal('${img.data}')">
                <div class="image-actions">
                  <button class="image-action-btn view" onclick="showImageModal('${img.data}')" title="View full size">👁</button>
                  <button class="image-action-btn download" onclick="downloadCommentImage('${img.data}', '${img.name}')" title="Download">💾</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <button class="comment-resolve-btn ${comment.resolved ? 'resolved' : ''}" 
              onclick="toggleCommentResolved('${comment.id}')"
              ${comment.resolved ? 'disabled' : ''}>
        ${comment.resolved ? '✓ Resolved' : 'Mark Resolved'}
      </button>
    </div>
  `).join('');
}

// Show Image Hover Preview (NEW)
function showImageHoverPreview(event, imageSrc, filename) {
  const preview = document.getElementById('imageHoverPreview');
  if (!preview) return;
  
  const img = preview.querySelector('img');
  const filenameEl = preview.querySelector('.preview-filename');
  
  img.src = imageSrc;
  filenameEl.textContent = filename;
  
  // Position preview near cursor
  const rect = event.target.getBoundingClientRect();
  preview.style.left = (rect.right + 10) + 'px';
  preview.style.top = (rect.top) + 'px';
  
  // Adjust if would go off screen
  const previewRect = preview.getBoundingClientRect();
  if (previewRect.right > window.innerWidth - 20) {
    preview.style.left = (rect.left - previewRect.width - 10) + 'px';
  }
  if (previewRect.bottom > window.innerHeight - 20) {
    preview.style.top = (window.innerHeight - previewRect.height - 20) + 'px';
  }
  
  preview.classList.add('show');
}

// Hide Image Hover Preview (NEW)
function hideImageHoverPreview() {
  const preview = document.getElementById('imageHoverPreview');
  if (preview) {
    preview.classList.remove('show');
  }
}

// Download Comment Image (NEW)
function downloadCommentImage(imageSrc, filename) {
  const link = document.createElement('a');
  link.href = imageSrc;
  link.download = filename || 'comment-image.png';
  link.click();
}

// Toggle Comment Resolved Status (NEW)
function toggleCommentResolved(commentId) {
  if (!window.currentPage) return;
  
  const pageData = window.reviewData[window.currentPage];
  if (!pageData) return;
  
  const comment = pageData.comments.find(c => c.id === commentId);
  if (!comment) return;
  
  comment.resolved = !comment.resolved;
  comment.resolvedTimestamp = comment.resolved ? new Date().toISOString() : null;
  
  // Save to localStorage
  localStorage.setItem('reviewData', JSON.stringify(window.reviewData));
  
  // Update UI
  updateCommentsSideCart();
  
  // Update highlights in main content
  if (window.reviewMode) {
    loadReviewDataForPage(window.currentPage);
  }
  
  // Update toolbar
  if (window.reviewMode) {
    addReviewToolbar();
  }
}

// Create Hover Tooltip
function createHoverTooltip() {
  const tooltip = document.createElement('div');
  tooltip.className = 'comment-tooltip';
  tooltip.id = 'commentTooltip';
  document.body.appendChild(tooltip);
}

// Create Comment Dialog
function createCommentDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.id = 'dialogOverlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'comment-dialog';
  dialog.id = 'commentDialog';
  dialog.innerHTML = `
    <h3>Add Review Comment</h3>
    <div>
      <label>
        <input type="radio" name="commentType" value="comment" checked> Comment
      </label>
      <label style="margin-left: 15px;">
        <input type="radio" name="commentType" value="suggestion"> Suggestion
      </label>
    </div>
    <div style="margin: 15px 0;">
      <textarea id="commentText" placeholder="Enter your comment or suggestion..."></textarea>
    </div>
    <div class="image-upload-section" id="imageUploadSection">
      <input type="file" id="imageUpload" accept="image/*" multiple style="display: none;">
      <div id="uploadDropZone">
        <p>📸 Add Reference Images</p>
        <button type="button" class="upload-btn" onclick="document.getElementById('imageUpload').click()">
          Choose Images
        </button>
        <p style="font-size: 0.8em; color: #666; margin-top: 8px;">
          Drag & drop images here or click to browse<br>
          <em>Useful for suggesting image placements or providing visual references</em>
        </p>
      </div>
      <div id="imagePreview" class="image-preview"></div>
    </div>
    <div class="dialog-actions">
      <button class="dialog-btn secondary" onclick="closeCommentDialog()">Cancel</button>
      <button class="dialog-btn primary" onclick="saveComment()">Save</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  // Close dialog when clicking overlay
  overlay.addEventListener('click', closeCommentDialog);
  
  // Set up image upload functionality
  setupImageUpload();
}

// Create Image Modal for Full View
function createImageModal() {
  const imageModal = document.createElement('div');
  imageModal.className = 'image-modal';
  imageModal.id = 'imageModal';
  imageModal.innerHTML = `
    <button class="close-btn" onclick="closeImageModal()">✕</button>
    <img id="modalImage" src="" alt="Full size image">
  `;
  
  document.body.appendChild(imageModal);
  
  // Close on background click
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      closeImageModal();
    }
  });
}

// Setup Image Upload Functionality
function setupImageUpload() {
  const imageUpload = document.getElementById('imageUpload');
  const dropZone = document.getElementById('uploadDropZone');
  const imagePreview = document.getElementById('imagePreview');
  const uploadSection = document.getElementById('imageUploadSection');
  
  // Store uploaded images for current comment
  window.currentCommentImages = [];
  
  // File input change handler
  imageUpload.addEventListener('change', handleImageFiles);
  
  // Drag and drop handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      processImageFiles(files);
    }
  });
}

function handleImageFiles(event) {
  const files = Array.from(event.target.files);
  processImageFiles(files);
}

function processImageFiles(files) {
  files.forEach(file => {
    if (file.type.startsWith('image/') && file.size < 5 * 1024 * 1024) { // 5MB limit
      const reader = new FileReader();
      reader.onload = function(e) {
        const imageData = {
          id: generateImageId(),
          data: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type
        };
        
        window.currentCommentImages.push(imageData);
        updateImagePreview();
      };
      reader.readAsDataURL(file);
    } else if (file.size >= 5 * 1024 * 1024) {
      alert(`Image "${file.name}" is too large. Please use images smaller than 5MB.`);
    }
  });
}

function generateImageId() {
  return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateImagePreview() {
  const imagePreview = document.getElementById('imagePreview');
  
  if (window.currentCommentImages.length === 0) {
    imagePreview.innerHTML = '';
    return;
  }
  
  imagePreview.innerHTML = window.currentCommentImages.map(img => `
    <div style="display: flex; align-items: center; margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <img src="${img.data}" alt="${img.name}" class="preview-image" onclick="showImageModal('${img.data}')">
      <div style="margin-left: 10px; flex: 1;">
        <div class="image-info">
          <strong>${img.name}</strong><br>
          ${(img.size / 1024).toFixed(1)} KB
        </div>
      </div>
      <button class="remove-image" onclick="removeImageFromComment('${img.id}')">Remove</button>
    </div>
  `).join('');
}

function removeImageFromComment(imageId) {
  window.currentCommentImages = window.currentCommentImages.filter(img => img.id !== imageId);
  updateImagePreview();
}

function showImageModal(imageSrc) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  
  modalImage.src = imageSrc;
  modal.classList.add('show');
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('show');
}

// Password Protection Functions (NEW)
function promptClearReviewData() {
  const dialog = document.getElementById('passwordDialog');
  const overlay = document.getElementById('passwordDialogOverlay');
  
  dialog.classList.add('show');
  overlay.classList.add('show');
  
  // Clear and focus on password input
  const passwordInput = document.getElementById('clearPassword');
  passwordInput.value = '';
  passwordInput.focus();
}

function closePasswordDialog() {
  const dialog = document.getElementById('passwordDialog');
  const overlay = document.getElementById('passwordDialogOverlay');
  
  dialog.classList.remove('show');
  overlay.classList.remove('show');
  
  // Clear password input
  document.getElementById('clearPassword').value = '';
}

function confirmClearReviewData() {
  const passwordInput = document.getElementById('clearPassword');
  const enteredPassword = passwordInput.value;
  
  // Check if password is correct
  if (enteredPassword !== 'poweroverwhelming') {
    alert('Incorrect password. Access denied.');
    passwordInput.value = '';
    passwordInput.focus();
    return;
  }
  
  // Password is correct, proceed with clearing
  window.reviewData = {};
  localStorage.removeItem('reviewData');
  
  // Clear highlights from current page
  clearReviewHighlights();
  
  // Update UI
  if (window.reviewMode) {
    addReviewToolbar();
  }
  
  // Update side cart if open
  const sideCart = document.getElementById('commentsSideCart');
  if (sideCart && sideCart.classList.contains('open')) {
    updateCommentsSideCart();
  }
  
  // Close password dialog
  closePasswordDialog();
  
  alert('All review data has been cleared successfully.');
}

// Function to show welcome screen
function showWelcomeScreen() {
  contentTitleEl.textContent = 'Documentation';
  document.title = 'Documentation';

  contentEl.innerHTML = `
    <div class="welcome-screen">
      <h2>Welcome to Documentation</h2>
      <p>Please select a topic from the navigation menu or use the search bar.</p>
      <p><strong>Review Mode:</strong> Click "Review Mode" to enable collaborative commenting and suggestions.</p>
      <p><strong>Comments Side Cart:</strong> View all comments and suggestions in an organized panel with image previews and download options.</p>
    </div>
  `;

  document.body.classList.remove('loading');
}

// Render the navigation menu with hierarchy
function renderNavigation(items, parentEl = navigationEl) {
  const ul = document.createElement('ul');
  ul.setAttribute('role', 'menu');

  items.forEach(item => {
    const li = document.createElement('li');
    li.setAttribute('role', 'presentation');

    if (item.children && item.children.length > 0) {
      li.classList.add('has-children');

      const toggle = document.createElement('span');
      toggle.className = 'toggle-arrow';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.toggle('expanded');
      });
      li.appendChild(toggle);
    }

    const a = document.createElement('a');
    a.setAttribute('role', 'menuitem');
    a.textContent = item.title;
    a.setAttribute('data-id', item.id);
    a.href = `#${item.id}`;

    a.addEventListener('click', (e) => {
      e.preventDefault();

      if (item.children && item.children.length > 0) {
        li.classList.toggle('expanded');
      }

      navigateToPage(item.id);
      if (searchResultsEl) searchResultsEl.innerHTML = '';
      if (searchInput) searchInput.value = '';
    });

    li.appendChild(a);

    if (item.children && item.children.length > 0) {
      renderNavigation(item.children, li);
    }

    ul.appendChild(li);
  });

  parentEl.appendChild(ul);
}

// Expand navigation path to the current page
function expandNavigationTo(pageId) {
  function findPageInNavigation(items, id, path = []) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const currentPath = [...path, item];

      if (item.id === id) {
        return currentPath;
      }

      if (item.children && item.children.length > 0) {
        const result = findPageInNavigation(item.children, id, currentPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  const path = findPageInNavigation(navigationConfig, pageId);
  if (!path) return;

  for (let i = 0; i < path.length - 1; i++) {
    const item = path[i];
    const li = document.querySelector(`.sidebar li a[data-id="${item.id}"]`).parentElement;
    li.classList.add('expanded');
  }
}

// Navigate to a specific page
function navigateToPage(pageId, pushState = true) {
  debug('Navigating to page:', pageId);
  
  if (!pageId) {
    console.error('Invalid pageId - cannot navigate to undefined page');
    showErrorContent('undefined');
    return;
  }

  updateActiveNavItem(pageId);
  expandNavigationTo(pageId);

  if (pushState) {
    history.pushState({ pageId }, '', `#${pageId}`);
  }

  document.body.classList.add('loading');
  window.currentPage = pageId;

  let contentFileName = pageId;
  if (window.contentIdMap && contentIdMap[pageId] && contentIdMap[pageId].filename) {
    contentFileName = contentIdMap[pageId].filename;
    debug('Using filename from contentIdMap:', contentFileName);
  } else {
    debug('No contentIdMap entry found for:', pageId);
  }

  loadContent(pageId)
    .then(content => {
      const title = getPageTitle(pageId);
      contentTitleEl.textContent = title;
      document.title = title;

      contentEl.innerHTML = content;
      enhanceTables();
      
      // Only initialize review features if in review mode
      if (window.reviewMode) {
        initializeReviewForContent();
        loadReviewDataForPage(pageId);
      }
      
      document.body.classList.remove('loading');
      debug('Content loaded successfully for:', pageId);
    })
    .catch(error => {
      debug('Error loading with ID, trying original filename:', contentFileName);
      if (contentFileName !== pageId) {
        loadContent(contentFileName)
          .then(content => {
            contentTitleEl.textContent = getPageTitle(pageId);
            document.title = getPageTitle(pageId);
            contentEl.innerHTML = content;
            enhanceTables();
            
            if (window.reviewMode) {
              initializeReviewForContent();
              loadReviewDataForPage(pageId);
            }
            
            document.body.classList.remove('loading');
            debug('Content loaded from original filename:', contentFileName);
          })
          .catch(altError => {
            if (pageId.includes('-')) {
              const underscoreId = pageId.replace(/-/g, '_');
              debug('Trying with underscore version:', underscoreId);
              loadContent(underscoreId)
                .then(content => {
                  contentTitleEl.textContent = getPageTitle(pageId);
                  document.title = getPageTitle(pageId);
                  contentEl.innerHTML = content;
                  enhanceTables();
                  
                  if (window.reviewMode) {
                    initializeReviewForContent();
                    loadReviewDataForPage(pageId);
                  }
                  
                  document.body.classList.remove('loading');
                  debug('Content loaded with underscore version');
                })
                .catch(finalError => {
                  showErrorContent(pageId);
                });
            } else {
              showErrorContent(pageId);
            }
          });
      } else {
        showErrorContent(pageId);
      }
    });
}

// Review System Functions
function toggleReviewMode() {
  window.reviewMode = !window.reviewMode;
  
  if (window.reviewMode) {
    document.body.classList.add('review-mode');
    debug('Review mode activated');
    
    if (window.currentPage) {
      initializeReviewForContent();
      loadReviewDataForPage(window.currentPage);
    }
  } else {
    document.body.classList.remove('review-mode');
    // Clear any visible highlights from main view
    clearReviewHighlights();
    // Close side cart if open
    closeCommentsSideCart();
    debug('Review mode deactivated');
  }
  
  updateReviewButtons();
}

function clearReviewHighlights() {
  // Remove all comment highlights and image markers from the current view
  const elements = document.querySelectorAll('[data-comment-id]');
  elements.forEach(element => {
    const parent = element.parentNode;
    if (parent) {
      if (element.classList.contains('image-comment-marker')) {
        // Remove image markers
        parent.removeChild(element);
      } else {
        // Remove text highlights
        parent.insertBefore(document.createTextNode(element.textContent), element);
        parent.removeChild(element);
      }
    }
  });
  
  // Hide tooltip if visible
  hideTooltip();
}

function startReviewSession() {
  if (!window.currentPage) {
    alert('Please select a document to review first.');
    return;
  }
  
  if (!window.reviewMode) {
    toggleReviewMode();
  }
  
  alert(`Review session started for "${getPageTitle(window.currentPage)}". You can now:\n\n• Select text to add comments or suggestions\n• Click on images to add annotations\n• View all comments in the side cart with image previews\n• Download images attached to comments`);
}

function updateReviewButtons() {
  if (reviewToggleBtn) {
    reviewToggleBtn.textContent = window.reviewMode ? 'Exit Review' : 'Review Mode';
    reviewToggleBtn.classList.toggle('active', window.reviewMode);
  }
  
  const reviewControls = document.querySelectorAll('.review-btn:not(#reviewToggle)');
  reviewControls.forEach(btn => {
    btn.style.display = window.reviewMode ? 'block' : 'none';
  });
}

function initializeReviewForContent() {
  if (!window.reviewMode) return;
  
  // Make all text elements selectable and add event listeners
  const textElements = contentEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th');
  
  textElements.forEach(element => {
    element.classList.add('reviewable-text');
    
    // Add mouseup event for text selection
    element.addEventListener('mouseup', handleTextSelection);
  });
  
  // Make images commentable
  const images = contentEl.querySelectorAll('img');
  images.forEach(image => {
    image.classList.add('reviewable-image');
    
    // Wrap image in container for positioning markers
    if (!image.parentElement.classList.contains('image-comment-container')) {
      const container = document.createElement('div');
      container.className = 'image-comment-container';
      image.parentNode.insertBefore(container, image);
      container.appendChild(image);
    }
    
    // Add click event for image commenting
    image.addEventListener('click', handleImageComment);
  });
  
  // Add review toolbar
  addReviewToolbar();
}

function addReviewToolbar() {
  const existingToolbar = document.querySelector('.review-toolbar');
  if (existingToolbar) {
    existingToolbar.remove();
  }
  
  const toolbar = document.createElement('div');
  toolbar.className = 'review-toolbar';
  toolbar.innerHTML = `
    <h3>Review Mode: ${getPageTitle(window.currentPage)}</h3>
    <div class="review-toolbar-actions">
      <button class="review-toolbar-btn" onclick="showCommentsCount()">
        Comments (${getCommentsForPage(window.currentPage).length})
      </button>
      <button class="review-toolbar-btn" onclick="openPrintSnapshotWindow()">Print Snapshot</button>
    </div>
  `;
  
  contentEl.insertBefore(toolbar, contentEl.firstChild);
}

// Modified showCommentsCount to open side cart instead of alert (MODIFIED)
function showCommentsCount() {
  openCommentsSideCart();
}

function handleTextSelection(event) {
  if (!window.reviewMode) return;
  
  const selection = window.getSelection();
  if (selection.toString().trim().length === 0) return;
  
  const selectedText = selection.toString().trim();
  const range = selection.getRangeAt(0);
  
  // Store selection data for comment creation
  window.currentSelection = {
    type: 'text',
    text: selectedText,
    element: event.target,
    range: range.cloneRange()
  };
  
  // Show comment dialog
  setTimeout(() => showCommentDialog(), 100);
}

function handleImageComment(event) {
  if (!window.reviewMode) return;
  
  event.preventDefault();
  
  const image = event.target;
  const rect = image.getBoundingClientRect();
  
  // Calculate click position relative to image
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  
  // Store image selection data
  window.currentSelection = {
    type: 'image',
    element: image,
    position: { x: x, y: y },
    imageSrc: image.src,
    imageAlt: image.alt || 'Image'
  };
  
  // Show comment dialog
  showCommentDialog();
}

function showCommentDialog() {
  const dialog = document.getElementById('commentDialog');
  const overlay = document.getElementById('dialogOverlay');
  
  dialog.classList.add('show');
  overlay.classList.add('show');
  
  // Focus on textarea
  document.getElementById('commentText').focus();
}

function closeCommentDialog() {
  const dialog = document.getElementById('commentDialog');
  const overlay = document.getElementById('dialogOverlay');
  
  dialog.classList.remove('show');
  overlay.classList.remove('show');
  
  // Clear form
  document.getElementById('commentText').value = '';
  document.querySelector('input[name="commentType"]:checked').checked = false;
  document.querySelector('input[name="commentType"][value="comment"]').checked = true;
  
  // Clear uploaded images
  window.currentCommentImages = [];
  const imagePreview = document.getElementById('imagePreview');
  if (imagePreview) {
    imagePreview.innerHTML = '';
  }
  const imageUpload = document.getElementById('imageUpload');
  if (imageUpload) {
    imageUpload.value = '';
  }
  
  // Clear selection
  window.getSelection().removeAllRanges();
  window.currentSelection = null;
}

function saveComment() {
  if (!window.currentSelection) {
    closeCommentDialog();
    return;
  }
  
  const commentText = document.getElementById('commentText').value.trim();
  const commentType = document.querySelector('input[name="commentType"]:checked').value;
  
  if (!commentText && (!window.currentCommentImages || window.currentCommentImages.length === 0)) {
    alert('Please enter a comment or add at least one image.');
    return;
  }
  
  // Create comment object
  const comment = {
    id: generateCommentId(),
    pageId: window.currentPage,
    type: commentType,
    text: commentText,
    timestamp: new Date().toISOString(),
    resolved: false,
    selectionType: window.currentSelection.type,
    uploadedImages: window.currentCommentImages ? [...window.currentCommentImages] : []
  };
  
  if (window.currentSelection.type === 'text') {
    comment.selectedText = window.currentSelection.text;
  } else if (window.currentSelection.type === 'image') {
    comment.imageSrc = window.currentSelection.imageSrc;
    comment.imageAlt = window.currentSelection.imageAlt;
    comment.position = window.currentSelection.position;
    comment.selectedText = `Image: ${window.currentSelection.imageAlt}`;
  }
  
  // Store comment
  if (!window.reviewData[window.currentPage]) {
    window.reviewData[window.currentPage] = {
      comments: [],
      lastModified: new Date().toISOString()
    };
  }
  
  window.reviewData[window.currentPage].comments.push(comment);
  window.reviewData[window.currentPage].lastModified = new Date().toISOString();
  
  // Persist to localStorage
  localStorage.setItem('reviewData', JSON.stringify(window.reviewData));
  
  // Add visual indicator to document
  if (window.currentSelection.type === 'text') {
    highlightTextInDocument(window.currentSelection, comment);
  } else if (window.currentSelection.type === 'image') {
    addImageCommentMarker(window.currentSelection, comment);
  }
  
  // Update toolbar
  addReviewToolbar();
  
  // Update side cart if open
  const sideCart = document.getElementById('commentsSideCart');
  if (sideCart && sideCart.classList.contains('open')) {
    updateCommentsSideCart();
  }
  
  closeCommentDialog();
  
  debug('Comment saved with images:', comment);
}

function highlightTextInDocument(selection, comment) {
  const span = document.createElement('span');
  span.className = comment.type === 'suggestion' ? 'review-suggestion-highlight' : 'review-comment-highlight';
  span.setAttribute('data-comment-id', comment.id);
  
  // Add hover events for tooltip
  span.addEventListener('mouseenter', (e) => showTooltip(e, comment));
  span.addEventListener('mouseleave', hideTooltip);
  
  try {
    selection.range.surroundContents(span);
  } catch (e) {
    // Fallback for complex selections
    span.textContent = selection.text;
    selection.range.deleteContents();
    selection.range.insertNode(span);
  }
}

function addImageCommentMarker(selection, comment) {
  const image = selection.element;
  const container = image.parentElement;
  
  // Create marker element
  const marker = document.createElement('div');
  marker.className = `image-comment-marker ${comment.type}`;
  marker.setAttribute('data-comment-id', comment.id);
  marker.innerHTML = '💬';
  
  // Position marker based on click coordinates
  marker.style.left = selection.position.x + '%';
  marker.style.top = selection.position.y + '%';
  marker.style.transform = 'translate(-50%, -50%)';
  
  // Add hover events for tooltip
  marker.addEventListener('mouseenter', (e) => showTooltip(e, comment));
  marker.addEventListener('mouseleave', hideTooltip);
  
  // Add marker to container
  container.appendChild(marker);
}

// Hover Tooltip Functions
function showTooltip(event, comment) {
  if (!window.reviewMode) return;
  
  const tooltip = document.getElementById('commentTooltip');
  if (!tooltip) return;
  
  // Set tooltip content
  tooltip.className = `comment-tooltip ${comment.type} show`;
  tooltip.innerHTML = `
    <div class="tooltip-header">${comment.type.toUpperCase()}</div>
    <div class="tooltip-text">${comment.text}</div>
    <div class="tooltip-meta">
      Selected: "${comment.selectedText}"<br>
      ${new Date(comment.timestamp).toLocaleString()}
      ${comment.resolved ? '<br>✓ Resolved' : ''}
      ${comment.uploadedImages && comment.uploadedImages.length > 0 ? `<br>📎 ${comment.uploadedImages.length} image(s)` : ''}
    </div>
  `;
  
  // Position tooltip
  positionTooltip(tooltip, event.target);
}

function hideTooltip() {
  const tooltip = document.getElementById('commentTooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
  }
}

function positionTooltip(tooltip, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // Position above the highlighted text
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left;
  
  // Adjust if tooltip would go off screen
  if (top < 10) {
    top = rect.bottom + 10; // Position below instead
  }
  
  if (left + tooltipRect.width > window.innerWidth - 20) {
    left = window.innerWidth - tooltipRect.width - 20;
  }
  
  if (left < 10) {
    left = 10;
  }
  
  tooltip.style.top = top + window.scrollY + 'px';
  tooltip.style.left = left + 'px';
}

function generateCommentId() {
  return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCommentsForPage(pageId) {
  return window.reviewData[pageId] ? window.reviewData[pageId].comments : [];
}

function loadReviewDataForPage(pageId) {
  const comments = getCommentsForPage(pageId);
  
  // Clear existing highlights
  const existingHighlights = document.querySelectorAll('[data-comment-id]');
  existingHighlights.forEach(highlight => {
    if (highlight.classList.contains('image-comment-marker')) {
      highlight.remove();
    } else {
      const parent = highlight.parentNode;
      if (parent) {
        parent.insertBefore(document.createTextNode(highlight.textContent), highlight);
        parent.removeChild(highlight);
      }
    }
  });
  
  // Re-apply highlights (simplified version)
  comments.forEach(comment => {
    if (comment.selectionType === 'text') {
      const textNodes = getAllTextNodes(contentEl);
      textNodes.forEach(node => {
        if (node.textContent.includes(comment.selectedText)) {
          const parent = node.parentNode;
          const index = node.textContent.indexOf(comment.selectedText);
          
          if (index !== -1) {
            const beforeText = node.textContent.substring(0, index);
            const selectedText = comment.selectedText;
            const afterText = node.textContent.substring(index + selectedText.length);
            
            const span = document.createElement('span');
            span.className = comment.type === 'suggestion' ? 'review-suggestion-highlight' : 'review-comment-highlight';
            span.setAttribute('data-comment-id', comment.id);
            span.textContent = selectedText;
            span.addEventListener('mouseenter', (e) => showTooltip(e, comment));
            span.addEventListener('mouseleave', hideTooltip);
            
            if (comment.resolved) {
              span.style.opacity = '0.5';
            }
            
            // Replace the text node
            parent.removeChild(node);
            if (beforeText) parent.appendChild(document.createTextNode(beforeText));
            parent.appendChild(span);
            if (afterText) parent.appendChild(document.createTextNode(afterText));
            
            return; // Only highlight first occurrence
          }
        }
      });
    } else if (comment.selectionType === 'image') {
      // Re-add image markers
      const images = contentEl.querySelectorAll('img');
      images.forEach(img => {
        if (img.src.includes(comment.imageSrc.split('/').pop())) {
          const container = img.parentElement;
          
          const marker = document.createElement('div');
          marker.className = `image-comment-marker ${comment.type}`;
          marker.setAttribute('data-comment-id', comment.id);
          marker.innerHTML = '💬';
          marker.style.left = comment.position.x + '%';
          marker.style.top = comment.position.y + '%';
          marker.style.transform = 'translate(-50%, -50%)';
          marker.addEventListener('mouseenter', (e) => showTooltip(e, comment));
          marker.addEventListener('mouseleave', hideTooltip);
          
          if (comment.resolved) {
            marker.style.opacity = '0.5';
          }
          
          container.appendChild(marker);
        }
      });
    }
  });
}

function getAllTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim()) {
      textNodes.push(node);
    }
  }
  
  return textNodes;
}

// Print Snapshot Functions (kept for compatibility)
function openPrintSnapshotWindow() {
  if (!window.currentPage) {
    alert('No page selected for snapshot.');
    return;
  }
  
  const comments = getCommentsForPage(window.currentPage);
  const pageTitle = getPageTitle(window.currentPage);
  
  // For now, just open the comments side cart
  // This can be enhanced later with a full print view
  openCommentsSideCart();
  
  if (comments.length === 0) {
    alert('No comments to display. Add some comments first using review mode.');
  }
}

// Make functions available globally
window.toggleReviewMode = toggleReviewMode;
window.startReviewSession = startReviewSession;
window.promptClearReviewData = promptClearReviewData;
window.confirmClearReviewData = confirmClearReviewData;
window.closePasswordDialog = closePasswordDialog;
window.openCommentsSideCart = openCommentsSideCart;
window.closeCommentsSideCart = closeCommentsSideCart;
window.openPrintSnapshotWindow = openPrintSnapshotWindow;
window.showCommentsCount = showCommentsCount;
window.closeCommentDialog = closeCommentDialog;
window.saveComment = saveComment;
window.showTooltip = showTooltip;
window.hideTooltip = hideTooltip;
window.removeImageFromComment = removeImageFromComment;
window.showImageModal = showImageModal;
window.closeImageModal = closeImageModal;
window.showImageHoverPreview = showImageHoverPreview;
window.hideImageHoverPreview = hideImageHoverPreview;
window.downloadCommentImage = downloadCommentImage;
window.toggleCommentResolved = toggleCommentResolved;

// Enhance tables with OxygenXML-like styling
function enhanceTables() {
  const tables = document.querySelectorAll('#content table');
  tables.forEach(table => {
    if (!table.className.includes('table')) {
      table.classList.add('table');
    }
    
    if (!table.parentElement.className.includes('table-container')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-container';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}

// Show error content when page cannot be loaded
function showErrorContent(pageId) {
  console.error('Failed to load content:', pageId);
  contentEl.innerHTML = `
    <div class="error">
      <h2>Content Not Found</h2>
      <p>The requested content "${pageId}" could not be loaded.</p>
      <p>Please select another topic from the navigation menu.</p>
    </div>
  `;
  document.body.classList.remove('loading');
}

// Load content for a page
async function loadContent(pageId) {
  const contentPath = `${basePath}/content/${pageId}.html`;
  debug('Fetching from URL:', contentPath);

  try {
    const response = await fetch(contentPath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${contentPath}`);
    }
    return await response.text();
  } catch (error) {
    debug('Content fetch error:', error.message);
    throw error;
  }
}

// Update active state in navigation
function updateActiveNavItem(pageId) {
  const allNavItems = document.querySelectorAll('.sidebar a');
  allNavItems.forEach(item => item.classList.remove('active'));

  const activeItem = document.querySelector(`.sidebar a[data-id="${pageId}"]`);
  if (activeItem) {
    activeItem.classList.add('active');

    let parent = activeItem.parentElement;
    while (parent && !parent.classList.contains('sidebar')) {
      if (parent.classList.contains('has-children')) {
        parent.classList.add('expanded');
      }
      parent = parent.parentElement;
    }
  }
}

// Handle popstate event (browser back/forward)
function handlePopState(event) {
  const pageId = event.state?.pageId || getPageIdFromUrl() || navigationConfig[0].id;
  debug('Popstate event, loading page:', pageId);
  navigateToPage(pageId, false);
}

// Get page ID from URL hash
function getPageIdFromUrl() {
  return window.location.hash.substring(1) || null;
}

// Get page title from content manifest
function getPageTitle(pageId) {
  if (window.contentIdMap && contentIdMap[pageId]) {
    return contentIdMap[pageId].title;
  }

  function findTitleInNav(items, id) {
    for (const item of items) {
      if (item.id === id) {
        return item.title;
      }
      if (item.children && item.children.length > 0) {
        const title = findTitleInNav(item.children, id);
        if (title) return title;
      }
    }
    return null;
  }

  const navTitle = findTitleInNav(navigationConfig, pageId);
  if (navTitle) return navTitle;

  return pageId.split(/-|_/).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Search functionality
function performSearch() {
  const query = searchInput.value.toLowerCase().trim();
  searchResultsEl.innerHTML = '';

  if (query.length < 2) {
    if (query.length > 0) {
      searchResultsEl.innerHTML = '<li><p>Please enter at least 2 characters to search.</p></li>';
    }
    return;
  }

  debug('Performing search for:', query);

  const results = [];
  for (const id in contentIdMap) {
    if (contentIdMap.hasOwnProperty(id) && id !== 'default') {
      const item = contentIdMap[id];
      const title = item.title.toLowerCase();
      const content = item.content ? item.content.toLowerCase() : '';

      let snippet = '';
      let matchCount = 0;

      if (title.includes(query)) {
        matchCount += 10;
        snippet = `Found in title: "${highlightMatch(item.title, query)}"`;
      }

      const contentMatches = content.split(query).length - 1;
      if (contentMatches > 0) {
        matchCount += contentMatches;
        const matchIndex = content.indexOf(query);
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(content.length, matchIndex + query.length + 50);
        const context = item.content.substring(start, end);
        snippet += (snippet ? '<br>' : '') + `...${highlightMatch(context, query)}...`;
      }

      if (matchCount > 0) {
        results.push({ id: id, title: item.title, snippet: snippet, score: matchCount });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    searchResultsEl.innerHTML = '<li><p>No results found for your query.</p></li>';
  } else {
    results.forEach(result => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${result.id}`;
      link.textContent = result.title;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        debug('Search result clicked for ID:', result.id);
        
        if (!result.id || !contentIdMap[result.id]) {
          debug('Invalid content ID in search result:', result.id);
          alert('Error: Content not found. Please try another search result.');
          return;
        }
        
        fetch(`${basePath}/content/${result.id}.html`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Content file not found');
            }
            navigateToPage(result.id);
            searchResultsEl.innerHTML = '';
            searchInput.value = '';
          })
          .catch(error => {
            debug('Content not available:', error);
            alert('Error: The selected content could not be loaded. Please try another search result.');
          });
      });
      
      li.appendChild(link);
      if (result.snippet) {
        const p = document.createElement('p');
        p.innerHTML = result.snippet;
        li.appendChild(p);
      }
      searchResultsEl.appendChild(li);
    });
  }
}

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

// Make navigateToPage available globally
window.navigateToPage = navigateToPage;

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
