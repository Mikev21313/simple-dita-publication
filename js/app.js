// Complete Fixed SPA Application with Archive System

// === INITIALIZATION AND STATE ===
const DEBUG_MODE = true;
const debug = (message, data) => {
  if (DEBUG_MODE) console.log(`[DITA-SPA] ${message}`, data || '');
};

// DOM Elements - Safe initialization
let contentEl, contentTitleEl, navigationEl, searchInput, searchButton, searchResultsEl;

// Initialize DOM elements safely
function initializeDOMElements() {
  contentEl = document.getElementById('content');
  contentTitleEl = document.getElementById('content-title');
  navigationEl = document.getElementById('navigation');
  searchInput = document.getElementById('searchInput');
  searchButton = document.getElementById('searchButton');
  searchResultsEl = document.getElementById('searchResults');
  
  debug('DOM elements initialized');
}

// Application State
const getBasePath = () => {
  if (location.hostname.includes('github.io')) {
    const pathSegments = location.pathname.split('/');
    if (pathSegments.length > 1) return '/' + pathSegments[1];
  }
  return '';
};

window.currentPage = null;
window.reviewMode = false;
window.currentSelection = null;
window.feedback = {};
window.archives = {};
const basePath = getBasePath();
let connectionStatus = 'connecting';
let reviewWindow = null;

// === CONNECTION MANAGEMENT ===
function createConnectionStatus() {
  const statusEl = document.createElement('div');
  statusEl.id = 'connectionStatus';
  statusEl.className = 'connection-status connecting';
  statusEl.innerHTML = '🔄 Connecting...';
  statusEl.title = 'Click to test connection';
  statusEl.addEventListener('click', testConnection);
  document.body.appendChild(statusEl);
  debug('Connection status indicator created');
  return statusEl;
}

function updateConnectionStatus(connected, message) {
  let statusEl = document.getElementById('connectionStatus');
  if (!statusEl) statusEl = createConnectionStatus();
  
  if (connected) {
    statusEl.className = 'connection-status connected';
    statusEl.innerHTML = '🟢 Database Connected';
    statusEl.title = 'Database connection active - Click to refresh';
    connectionStatus = 'connected';
    debug('Connection status: Connected');
  } else {
    statusEl.className = 'connection-status disconnected';
    statusEl.innerHTML = '🔴 Database Offline';
    statusEl.title = 'Database connection failed - Click to retry';
    connectionStatus = 'disconnected';
    debug('Connection status: Disconnected');
  }
}

async function testConnection() {
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    statusEl.className = 'connection-status connecting';
    statusEl.innerHTML = '🔄 Testing...';
  }
  
  try {
    const connected = await window.supabaseClient.testConnection();
    updateConnectionStatus(connected);
    return connected;
  } catch (error) {
    debug('Connection test error:', error);
    updateConnectionStatus(false);
    return false;
  }
}

// === ACTION BUTTONS CONTAINER ===
function createActionButtons() {
  const container = document.createElement('div');
  container.className = 'action-buttons';
  container.id = 'actionButtons';
  
  // Review Mode Button
  const reviewBtn = document.createElement('button');
  reviewBtn.className = 'action-btn review-window-btn';
  reviewBtn.id = 'openReviewWindow';
  reviewBtn.innerHTML = '🔍 Review Mode';
  reviewBtn.title = 'Open dedicated review window for this document';
  reviewBtn.addEventListener('click', openReviewWindow);
  
  // Archive Viewer Button
  const archiveBtn = document.createElement('button');
  archiveBtn.className = 'action-btn archive-viewer-btn';
  archiveBtn.id = 'openArchiveViewer';
  archiveBtn.innerHTML = '📁 View Archives';
  archiveBtn.title = 'View all archived document versions';
  archiveBtn.addEventListener('click', openArchiveViewer);
  
  container.appendChild(reviewBtn);
  container.appendChild(archiveBtn);
  document.body.appendChild(container);
  
  debug('Action buttons created');
  return container;
}

// === FIXED REVIEW WINDOW SYSTEM ===
async function openReviewWindow() {
  if (!window.currentPage) {
    alert('Please select a document first before opening review mode.');
    return;
  }

  if (reviewWindow && !reviewWindow.closed) {
    reviewWindow.focus();
    return;
  }

  debug(`Opening review window for page: ${window.currentPage}`);

  try {
    // Get current content
    const currentContent = contentEl ? contentEl.innerHTML : '';
    const currentTitle = contentTitleEl ? contentTitleEl.textContent : 'Document';
    
    // Load feedback and archives for this page
    const feedback = await window.supabaseClient.getComments(window.currentPage);
    const archives = await window.supabaseClient.getArchives(window.currentPage);

    // Open review window
    reviewWindow = window.open('', 'ReviewWindow', 
      'width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!reviewWindow) {
      alert('Please allow popups to open the review window.');
      return;
    }

    // Create review window content
    reviewWindow.document.write(createReviewWindowHTML(currentTitle, currentContent, feedback, archives));
    reviewWindow.document.close();

    // Initialize review window functionality - FIXED
    initializeReviewWindowFixed(reviewWindow, feedback, archives);

    debug('Review window opened successfully');

  } catch (error) {
    debug('Error opening review window:', error);
    alert('Failed to open review window. Error: ' + error.message);
  }
}

function createReviewWindowHTML(title, content, feedback, archives) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Review: ${title}</title>
      <link rel="stylesheet" href="${basePath}/css/review-window.css">
      <script src="${basePath}/js/supabase-config.js"></script>
    </head>
    <body>
      <div class="review-header">
        <div class="review-title">Review Mode: ${title}</div>
        <div class="review-actions">
          <button class="review-btn success" onclick="completeReview()">✅ Complete Review</button>
          <button class="review-btn danger" onclick="clearAllReview()">🗑️ Clear All</button>
          <button class="review-btn close" onclick="window.close()">✕ Close</button>
        </div>
      </div>

      <div class="review-layout">
        <div class="document-panel">
          <div class="document-content" id="documentContent">
            ${content}
          </div>
        </div>

        <div class="feedback-panel">
          <h3>💬 Document Feedback</h3>
          <div class="feedback-list" id="feedbackList">
            <div class="no-feedback">
              <p>No feedback yet.</p>
              <p>Select text in the document to leave feedback.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Feedback Dialog -->
      <div class="dialog-overlay" id="dialogOverlay"></div>
      <div class="feedback-dialog" id="feedbackDialog">
        <h3>📝 Leave Feedback</h3>
        <div style="margin: 15px 0;">
          <textarea id="feedbackText" placeholder="Enter your feedback about the selected text..."></textarea>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn secondary" onclick="closeFeedbackDialog()">Cancel</button>
          <button class="dialog-btn primary" onclick="saveFeedback()">Save Feedback</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

// FIXED Review Window Initialization
function initializeReviewWindowFixed(reviewWin, feedback, archives) {
  debug('Initializing review window with fixed event handling');
  
  // Wait for window to be fully loaded
  if (reviewWin.document.readyState === 'loading') {
    reviewWin.document.addEventListener('DOMContentLoaded', function() {
      setupReviewWindowFunctionality(reviewWin, feedback, archives);
    });
  } else {
    setupReviewWindowFunctionality(reviewWin, feedback, archives);
  }
}

function setupReviewWindowFunctionality(reviewWin, feedback, archives) {
  // Pass comprehensive initialization script to review window
  reviewWin.eval(`
    // Enhanced Review Window Initialization Script - FIXED
    const DEBUG_MODE = true;
    const debug = (message, data) => {
      if (DEBUG_MODE) console.log('[Review Window] ' + message, data || '');
    };

    // Global variables
    window.currentPage = '${window.currentPage}';
    window.currentSelection = null;
    window.parentWindow = window.opener;
    window.feedbackHighlights = new Map();

    // Initialize review functionality - FIXED
    function initializeReviewWindow() {
      debug('Initializing enhanced review window functionality');
      
      try {
        // Make all text elements reviewable
        const contentEl = document.getElementById('documentContent');
        if (!contentEl) {
          debug('Document content element not found');
          return;
        }
        
        const textElements = contentEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, div');
        
        textElements.forEach(element => {
          if (element.children.length === 0 || element.textContent.trim()) {
            element.classList.add('reviewable-text');
            element.addEventListener('mouseup', handleTextSelection);
          }
        });

        // Load existing feedback and create highlights
        loadFeedback();
        
        // Setup dialog overlay click handler
        const dialogOverlay = document.getElementById('dialogOverlay');
        if (dialogOverlay) {
          dialogOverlay.addEventListener('click', closeFeedbackDialog);
        }
        
        debug('Review window initialization complete');
      } catch (error) {
        debug('Error in review window initialization:', error);
      }
    }

    function handleTextSelection(event) {
      try {
        const selection = window.getSelection();
        if (selection.toString().trim().length === 0) return;
        
        const selectedText = selection.toString().trim();
        if (selectedText.length < 3) return;
        
        debug('Text selected in review window:', selectedText);
        
        window.currentSelection = {
          type: 'text',
          text: selectedText,
          element: event.target
        };
        
        showFeedbackDialog();
      } catch (error) {
        debug('Error handling text selection:', error);
      }
    }

    function showFeedbackDialog() {
      try {
        const dialog = document.getElementById('feedbackDialog');
        const overlay = document.getElementById('dialogOverlay');
        
        if (dialog && overlay) {
          dialog.classList.add('show');
          overlay.classList.add('show');
          
          const selectedText = window.currentSelection?.text || '';
          if (selectedText) {
            const textArea = document.getElementById('feedbackText');
            if (textArea) {
              textArea.placeholder = 'Leave feedback about: "' + selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : '') + '"';
              textArea.focus();
            }
          }
        }
      } catch (error) {
        debug('Error showing feedback dialog:', error);
      }
    }

    function closeFeedbackDialog() {
      try {
        const dialog = document.getElementById('feedbackDialog');
        const overlay = document.getElementById('dialogOverlay');
        
        if (dialog && overlay) {
          dialog.classList.remove('show');
          overlay.classList.remove('show');
          
          const textArea = document.getElementById('feedbackText');
          if (textArea) {
            textArea.value = '';
            textArea.placeholder = 'Enter your feedback about the selected text...';
          }
        }
        
        window.getSelection().removeAllRanges();
        window.currentSelection = null;
      } catch (error) {
        debug('Error closing feedback dialog:', error);
      }
    }

    async function saveFeedback() {
      if (!window.currentSelection) {
        closeFeedbackDialog();
        return;
      }
      
      try {
        const feedbackTextEl = document.getElementById('feedbackText');
        if (!feedbackTextEl) return;
        
        const feedbackText = feedbackTextEl.value.trim();
        
        if (!feedbackText) {
          alert('Please enter your feedback.');
          return;
        }
        
        const feedbackData = {
          page_id: window.currentPage,
          comment_text: feedbackText,
          selected_text: window.currentSelection.text,
          selection_type: 'text',
          createArchive: true,
          contentHtml: document.getElementById('documentContent').innerHTML
        };
        
        debug('Saving feedback from review window:', feedbackData);
        
        const result = await window.supabaseClient.saveFeedback(feedbackData);
        debug('Feedback saved successfully:', result);
        
        const saveBtn = document.querySelector('.dialog-btn.primary');
        if (saveBtn) {
          const originalText = saveBtn.textContent;
          saveBtn.textContent = '✓ Saved!';
          saveBtn.style.background = '#4caf50';
          
          setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
            closeFeedbackDialog();
            loadFeedback(); // Refresh feedback display
          }, 1000);
        }
        
      } catch (error) {
        debug('Error saving feedback:', error);
        alert('Failed to save feedback. Error: ' + error.message);
      }
    }

    async function loadFeedback() {
      try {
        debug('Loading feedback for review window');
        const feedback = await window.supabaseClient.getComments(window.currentPage);
        displayFeedback(feedback);
        createTextHighlights(feedback);
      } catch (error) {
        debug('Failed to load feedback:', error);
      }
    }

    function createTextHighlights(feedbackItems) {
      if (!feedbackItems || feedbackItems.length === 0) return;

      const contentEl = document.getElementById('documentContent');
      if (!contentEl) return;
      
      feedbackItems.forEach(item => {
        if (item.selected_text && item.selected_text.trim()) {
          highlightTextInDocument(contentEl, item.selected_text, item);
        }
      });
    }

    function highlightTextInDocument(container, selectedText, feedbackItem) {
      try {
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent;
          const index = text.toLowerCase().indexOf(selectedText.toLowerCase());
          
          if (index !== -1 && !node.parentNode.classList.contains('review-feedback-highlight')) {
            const parent = node.parentNode;
            const beforeText = text.substring(0, index);
            const actualText = text.substring(index, index + selectedText.length);
            const afterText = text.substring(index + selectedText.length);
            
            // Create highlight span
            const span = document.createElement('span');
            span.className = 'review-feedback-highlight';
            span.setAttribute('data-feedback-id', feedbackItem.id);
            span.textContent = actualText;
            
            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'feedback-tooltip';
            tooltip.textContent = feedbackItem.comment_text.substring(0, 100) + 
              (feedbackItem.comment_text.length > 100 ? '...' : '');
            span.appendChild(tooltip);
            
            // Replace text node
            parent.removeChild(node);
            if (beforeText) parent.appendChild(document.createTextNode(beforeText));
            parent.appendChild(span);
            if (afterText) parent.appendChild(document.createTextNode(afterText));
            
            // Store highlight reference
            window.feedbackHighlights.set(feedbackItem.id, span);
            
            break;
          }
        }
      } catch (error) {
        debug('Error highlighting text:', error);
      }
    }

    function displayFeedback(feedbackItems) {
      try {
        const feedbackListEl = document.getElementById('feedbackList');
        if (!feedbackListEl) return;
        
        if (!feedbackItems || feedbackItems.length === 0) {
          feedbackListEl.innerHTML = '<div class="no-feedback"><p>No feedback yet.</p><p>Select text in the document to leave feedback.</p></div>';
          return;
        }
        
        // Group feedback by selected text
        const groupedFeedback = {};
        feedbackItems.forEach(item => {
          if (!item || !item.comment_text) return;
          
          const key = item.selected_text && item.selected_text.trim() ? 
                     item.selected_text.trim() : 'General';
          if (!groupedFeedback[key]) {
            groupedFeedback[key] = [];
          }
          groupedFeedback[key].push(item);
        });
        
        let feedbackHtml = '';
        
        Object.keys(groupedFeedback).forEach(selectedText => {
          const feedbackGroup = groupedFeedback[selectedText];
          
          feedbackHtml += '<div class="feedback-group" onclick="scrollToHighlight(' + feedbackGroup[0].id + ')">';
          
          if (selectedText !== 'General') {
            feedbackHtml += '<div class="selected-text-header">📝 Selected Text:<div class="selected-text-content">"' + escapeHtml(selectedText) + '"</div></div>';
          }
          
          feedbackGroup.forEach(item => {
            feedbackHtml += '<div class="feedback-details">';
            feedbackHtml += '<div class="feedback-meta">';
            feedbackHtml += '<span class="feedback-type-badge">💬 feedback</span>';
            feedbackHtml += '<span class="feedback-date">' + formatDate(item.created_at) + '</span>';
            feedbackHtml += '</div>';
            feedbackHtml += '<div class="feedback-text">' + escapeHtml(item.comment_text) + '</div>';
            feedbackHtml += '<div class="feedback-actions">';
            feedbackHtml += '<button class="feedback-btn delete" onclick="event.stopPropagation(); deleteFeedback(' + item.id + ')">🗑️ Delete</button>';
            feedbackHtml += '</div>';
            feedbackHtml += '</div>';
          });
          
          feedbackHtml += '</div>';
        });
        
        feedbackListEl.innerHTML = feedbackHtml;
      } catch (error) {
        debug('Error displaying feedback:', error);
      }
    }

    // Click-to-scroll functionality
    function scrollToHighlight(feedbackId) {
      try {
        debug('Scrolling to highlight for feedback ID:', feedbackId);
        const highlight = window.feedbackHighlights.get(feedbackId);
        
        if (highlight) {
          // Scroll to the highlight
          highlight.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          });
          
          // Temporarily emphasize the highlight
          highlight.style.backgroundColor = '#ffeb3b';
          highlight.style.borderLeft = '3px solid #f57c00';
          highlight.style.transform = 'scale(1.05)';
          
          setTimeout(() => {
            highlight.style.backgroundColor = '#e3f2fd';
            highlight.style.borderLeft = '2px solid #2196f3';
            highlight.style.transform = 'scale(1)';
          }, 2000);
        } else {
          debug('Highlight not found for feedback ID:', feedbackId);
          // Try to find any highlight with the same feedback ID
          const highlightElement = document.querySelector('[data-feedback-id="' + feedbackId + '"]');
          if (highlightElement) {
            highlightElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
      } catch (error) {
        debug('Error scrolling to highlight:', error);
      }
    }

    async function deleteFeedback(feedbackId) {
      if (!confirm('Are you sure you want to delete this feedback?')) return;
      
      try {
        debug('Deleting feedback from review window:', feedbackId);
        await window.supabaseClient.deleteFeedback(feedbackId);
        
        // Remove highlight from document
        const highlight = window.feedbackHighlights.get(feedbackId);
        if (highlight) {
          const parent = highlight.parentNode;
          parent.insertBefore(document.createTextNode(highlight.textContent), highlight);
          parent.removeChild(highlight);
          window.feedbackHighlights.delete(feedbackId);
        }
        
        await loadFeedback();
      } catch (error) {
        debug('Delete feedback error:', error);
        alert('Failed to delete feedback. Error: ' + error.message);
      }
    }

    async function completeReview() {
      const resolutionNotes = prompt('Enter resolution notes (optional):') || '';
      
      try {
        debug('Marking review complete from review window');
        await window.supabaseClient.markReviewComplete(window.currentPage, resolutionNotes);
        alert('Review marked as complete! All feedback has been resolved and archived.');
        if (window.parentWindow) {
          window.parentWindow.postMessage({ type: 'reviewCompleted', pageId: window.currentPage }, '*');
        }
      } catch (error) {
        debug('Error completing review:', error);
        alert('Failed to complete review. Error: ' + error.message);
      }
    }

    async function clearAllReview() {
      if (!confirm('Are you sure you want to clear ALL feedback for this document? This cannot be undone.')) return;
      
      try {
        debug('Clearing all review data from review window');
        await window.supabaseClient.clearAllFeedback();
        
        // Clear all highlights
        window.feedbackHighlights.forEach((highlight, id) => {
          const parent = highlight.parentNode;
          parent.insertBefore(document.createTextNode(highlight.textContent), highlight);
          parent.removeChild(highlight);
        });
        window.feedbackHighlights.clear();
        
        await loadFeedback();
        alert('All feedback has been cleared successfully.');
      } catch (error) {
        debug('Error clearing review data:', error);
        alert('Failed to clear review data. Error: ' + error.message);
      }
    }

    // Utility functions
    function formatDate(dateString) {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } catch (error) {
        return dateString;
      }
    }

    function escapeHtml(text) {
      if (!text) return '';
      try {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      } catch (error) {
        return text;
      }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeReviewWindow);
    } else {
      initializeReviewWindow();
    }
  `);
}

// === FIXED ARCHIVE VIEWER SYSTEM ===
async function openArchiveViewer() {
  debug('Opening archive viewer');
  
  try {
    // Get all archives from database
    const archives = await window.supabaseClient.getAllArchives();
    debug('Retrieved archives:', archives);
    
    // Group archives by page_id (handle null/undefined case)
    const groupedArchives = groupArchivesByPage(archives || []);
    
    // Create archive viewer window
    const archiveWindow = window.open('', 'ArchiveViewer', 
      'width=1200,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (!archiveWindow) {
      alert('Please allow popups to open the archive viewer.');
      return;
    }
    
    // Create archive viewer HTML
    archiveWindow.document.write(createArchiveViewerHTML(groupedArchives));
    archiveWindow.document.close();
    
    // Initialize archive viewer functionality - FIXED
    initializeArchiveViewerFixed(archiveWindow, groupedArchives);
    
  } catch (error) {
    debug('Error opening archive viewer:', error);
    alert('Failed to load archives. Error: ' + error.message + '\\n\\nPlease check your connection and try again.');
  }
}

function groupArchivesByPage(archives) {
  if (!archives || !Array.isArray(archives)) {
    debug('No archives provided or invalid format');
    return {};
  }
  
  const grouped = {};
  archives.forEach(archive => {
    if (archive && archive.page_id) {
      if (!grouped[archive.page_id]) {
        grouped[archive.page_id] = [];
      }
      grouped[archive.page_id].push(archive);
    }
  });
  
  // Sort each group by created date (newest first)
  Object.keys(grouped).forEach(pageId => {
    grouped[pageId].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });
  
  return grouped;
}

function createArchiveViewerHTML(groupedArchives) {
  const pageCount = Object.keys(groupedArchives).length;
  const totalArchives = Object.values(groupedArchives).reduce((sum, archives) => sum + archives.length, 0);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Archive Viewer - Document History</title>
      <link rel="stylesheet" href="${basePath}/css/archive-viewer.css">
      <script src="${basePath}/js/supabase-config.js"></script>
    </head>
    <body>
      <div class="archive-header">
        <div class="archive-title">Document Archive Viewer</div>
        <div class="archive-stats">
          ${pageCount} documents • ${totalArchives} archived versions
        </div>
        <div class="archive-controls">
          <button class="archive-btn" onclick="refreshArchives()">🔄 Refresh</button>
          <button class="archive-btn" onclick="exportAllData()">📤 Export All</button>
          <button class="archive-btn" onclick="window.close()">✕ Close</button>
        </div>
      </div>
      
      <div class="archive-content">
        <div class="search-archives">
          <input type="text" id="archiveSearch" placeholder="Search archives by document name...">
          <button onclick="searchArchives()">🔍 Search</button>
        </div>
        
        <div id="archiveList">
          ${createArchiveListHTML(groupedArchives)}
        </div>
      </div>
    </body>
    </html>
  `;
}

function createArchiveListHTML(groupedArchives) {
  if (!groupedArchives || Object.keys(groupedArchives).length === 0) {
    return `
      <div class="no-archives">
        <h3>📁 No archived documents found</h3>
        <p>Archives are created automatically when you:</p>
        <ul style="text-align: left; margin-top: 10px;">
          <li>Open Review Mode on any document</li>
          <li>Add feedback to any document</li>
          <li>Complete a document review</li>
        </ul>
        <p style="margin-top: 15px;"><strong>To get started:</strong></p>
        <ol style="text-align: left; margin-top: 10px;">
          <li>Go back to the main application</li>
          <li>Select any document</li>
          <li>Click the blue "🔍 Review Mode" button</li>
          <li>Select text and add a comment</li>
          <li>Return here to see your first archive!</li>
        </ol>
      </div>
    `;
  }
  
  let html = '';
  
  Object.keys(groupedArchives).forEach(pageId => {
    const archives = groupedArchives[pageId];
    const pageTitle = pageId.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    
    html += `
      <div class="page-group">
        <div class="page-header">
          <div class="page-title">${pageTitle}</div>
          <div class="page-stats">${archives.length} version${archives.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="archive-list">
    `;
    
    archives.forEach(archive => {
      const createdDate = new Date(archive.created_at).toLocaleString();
      const isResolved = archive.resolution_status === 'resolved';
      
      html += `
        <div class="archive-item">
          <div class="archive-info">
            <div class="archive-version">Version ${archive.archive_version}</div>
            <div class="archive-meta">
              <span>📅 ${createdDate}</span>
              <span class="archive-status ${isResolved ? 'status-resolved' : 'status-active'}">
                ${isResolved ? 'Resolved' : 'Active'}
              </span>
              ${archive.session_id ? `<span>🔗 ${archive.session_id.substring(0, 8)}...</span>` : ''}
            </div>
          </div>
          <div class="archive-actions">
            <button class="action-btn view" onclick="viewArchive(${archive.id})" title="View archived document">
              👁️ View
            </button>
            <button class="action-btn download" onclick="downloadArchive(${archive.id})" title="Download HTML file">
              💾 HTML
            </button>
            <button class="action-btn download-with-comments" onclick="downloadArchiveWithComments(${archive.id})" title="Download HTML with embedded comments">
              📄 HTML+Comments
            </button>
            <button class="action-btn download-comments" onclick="downloadCommentsOnly('${archive.page_id}')" title="Download comments as JSON">
              💬 Comments
            </button>
            <button class="action-btn delete" onclick="deleteArchive(${archive.id})" title="Delete this archive version">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  return html;
}

// Fixed Archive Viewer Initialization
function initializeArchiveViewerFixed(archiveWindow, groupedArchives) {
  debug('Initializing archive viewer with fixed event handling');
  
  // Wait for window to be fully loaded
  if (archiveWindow.document.readyState === 'loading') {
    archiveWindow.document.addEventListener('DOMContentLoaded', function() {
      setupArchiveViewerFunctionality(archiveWindow, groupedArchives);
    });
  } else {
    setupArchiveViewerFunctionality(archiveWindow, groupedArchives);
  }
}

function setupArchiveViewerFunctionality(archiveWindow, groupedArchives) {
  // Pass complete functionality to archive window
  archiveWindow.eval(`
    // Archive Viewer Functionality (Fixed)
    const DEBUG_MODE = true;
    const debug = (message, data) => {
      if (DEBUG_MODE) console.log('[Archive Viewer] ' + message, data || '');
    };
    
    // Global variables
    window.parentWindow = window.opener;
    window.allArchives = ${JSON.stringify(groupedArchives)};

    // Initialize functionality
    function initializeArchiveFunctionality() {
      debug('Initializing archive functionality');
      
      try {
        // Add event listeners safely
        const searchInput = document.getElementById('archiveSearch');
        if (searchInput) {
          searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchArchives();
          });
        }
        
        debug('Archive functionality initialized successfully');
      } catch (error) {
        debug('Error initializing archive functionality:', error);
      }
    }
    
    async function viewArchive(archiveId) {
      debug('Viewing archive:', archiveId);
      
      try {
        // Find the archive data
        let archive = null;
        Object.values(window.allArchives).forEach(archives => {
          const found = archives.find(a => a.id === archiveId);
          if (found) archive = found;
        });
        
        if (!archive) {
          alert('Archive not found');
          return;
        }
        
        // Open archive in new window
        const viewWindow = window.open('', 'ArchiveView_' + archiveId, 
          'width=1000,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!viewWindow) {
          alert('Please allow popups to view the archive.');
          return;
        }
        
        // Create archive view HTML
        const archiveHTML = createArchiveViewHTML(archive);
        viewWindow.document.write(archiveHTML);
        viewWindow.document.close();
        
      } catch (error) {
        debug('Error viewing archive:', error);
        alert('Failed to view archive: ' + error.message);
      }
    }
    
    function createArchiveViewHTML(archive) {
      const title = archive.page_id.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
      
      return \`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Archive: \${title} - \${archive.archive_version}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; margin: 0; padding: 20px; background: #fff; 
            }
            .archive-header { 
              background: #f8f9fa; padding: 15px; border-radius: 8px; 
              margin-bottom: 20px; border-left: 4px solid #673ab7; 
            }
            .archive-title { font-size: 1.3em; font-weight: 600; color: #333; }
            .archive-info { font-size: 0.9em; color: #666; margin-top: 5px; }
            .archive-content { max-width: 800px; }
            .archive-content h1, .archive-content h2, .archive-content h3 {
              color: #333; margin-top: 1.5em; margin-bottom: 0.8em;
            }
            .archive-content p { margin-bottom: 1em; }
            .archive-content ul, .archive-content ol { margin-bottom: 1em; padding-left: 2em; }
            .archive-content img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="archive-header">
            <div class="archive-title">📁 \${title}</div>
            <div class="archive-info">
              Version: \${archive.archive_version} • 
              Created: \${new Date(archive.created_at).toLocaleString()} • 
              Status: \${archive.resolution_status}
            </div>
          </div>
          <div class="archive-content">
            \${archive.content_html}
          </div>
        </body>
        </html>
      \`;
    }
    
    async function downloadArchive(archiveId) {
      debug('Downloading archive:', archiveId);
      
      try {
        if (window.parentWindow && window.parentWindow.supabaseClient) {
          const archive = await window.parentWindow.supabaseClient.getArchiveById(archiveId);
          if (archive) {
            window.parentWindow.supabaseClient.downloadArchive(archive);
            debug('Archive downloaded successfully');
          } else {
            alert('Archive not found');
          }
        } else {
          alert('Cannot download archive - connection lost.');
        }
      } catch (error) {
        debug('Error downloading archive:', error);
        alert('Failed to download archive: ' + error.message);
      }
    }

    async function downloadArchiveWithComments(archiveId) {
      debug('Downloading archive with comments:', archiveId);
      
      try {
        if (window.parentWindow && window.parentWindow.supabaseClient) {
          await window.parentWindow.supabaseClient.downloadArchiveWithComments(archiveId);
          debug('Archive with comments downloaded successfully');
        } else {
          alert('Cannot download archive - connection lost.');
        }
      } catch (error) {
        debug('Error downloading archive with comments:', error);
        alert('Failed to download archive with comments: ' + error.message);
      }
    }

    async function downloadCommentsOnly(pageId) {
      debug('Downloading comments only for page:', pageId);
      
      try {
        if (window.parentWindow && window.parentWindow.supabaseClient) {
          await window.parentWindow.supabaseClient.downloadCommentsOnly(pageId);
          debug('Comments downloaded successfully');
        } else {
          alert('Cannot download comments - connection lost.');
        }
      } catch (error) {
        debug('Error downloading comments:', error);
        if (error.message.includes('No comments found')) {
          alert('No comments found for this document. Add some feedback in Review Mode first!');
        } else {
          alert('Failed to download comments: ' + error.message);
        }
      }
    }
    
    async function deleteArchive(archiveId) {
      if (!confirm('Are you sure you want to delete this archive? This cannot be undone.')) return;
      
      debug('Deleting archive:', archiveId);
      
      try {
        if (window.parentWindow && window.parentWindow.supabaseClient) {
          await window.parentWindow.supabaseClient.deleteArchive(archiveId);
          alert('Archive deleted successfully.');
          refreshArchives();
        } else {
          alert('Cannot delete archive - connection lost.');
        }
      } catch (error) {
        debug('Error deleting archive:', error);
        alert('Failed to delete archive: ' + error.message);
      }
    }
    
    async function refreshArchives() {
      debug('Refreshing archives');
      window.location.reload();
    }
    
    async function exportAllData() {
      debug('Exporting all data');
      
      try {
        if (window.parentWindow && window.parentWindow.supabaseClient) {
          await window.parentWindow.supabaseClient.exportAllData();
          debug('All data exported successfully');
        } else {
          alert('Cannot export data - connection lost.');
        }
      } catch (error) {
        debug('Error exporting all data:', error);
        alert('Failed to export data: ' + error.message);
      }
    }
    
    function searchArchives() {
      try {
        const searchInput = document.getElementById('archiveSearch');
        if (!searchInput) return;
        
        const query = searchInput.value.toLowerCase();
        const archiveItems = document.querySelectorAll('.page-group');
        
        archiveItems.forEach(item => {
          const pageTitle = item.querySelector('.page-title');
          if (pageTitle) {
            const titleText = pageTitle.textContent.toLowerCase();
            if (titleText.includes(query) || query === '') {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
          }
        });
      } catch (error) {
        debug('Error searching archives:', error);
      }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeArchiveFunctionality);
    } else {
      initializeArchiveFunctionality();
    }
  `);
}

// === NAVIGATION SYSTEM ===
function renderNavigation(items, parentEl = navigationEl) {
  if (!parentEl) return;
  
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

function navigateToPage(pageId, pushState = true) {
  debug(`Navigating to page: ${pageId}`);
  
  if (!pageId) {
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

  loadContent(pageId)
    .then(content => {
      const title = getPageTitle(pageId);
      if (contentTitleEl) contentTitleEl.textContent = title;
      document.title = title;
      if (contentEl) contentEl.innerHTML = content;
      
      document.body.classList.remove('loading');
      debug(`Content loaded successfully for: ${pageId}`);
    })
    .catch(error => {
      debug(`Content load error for ${pageId}:`, error);
      showErrorContent(pageId);
    });
}

async function loadContent(pageId) {
  const contentPath = `${basePath}/content/${pageId}.html`;
  debug(`Fetching content from: ${contentPath}`);

  try {
    const response = await fetch(contentPath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    debug(`Content fetch error: ${error.message}`);
    throw error;
  }
}

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

function expandNavigationTo(pageId) {
  function findPageInNavigation(items, id, path = []) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const currentPath = [...path, item];
      if (item.id === id) return currentPath;
      if (item.children && item.children.length > 0) {
        const result = findPageInNavigation(item.children, id, currentPath);
        if (result) return result;
      }
    }
    return null;
  }

  const path = findPageInNavigation(navigationConfig, pageId);
  if (!path) return;

  for (let i = 0; i < path.length - 1; i++) {
    const item = path[i];
    const li = document.querySelector(`.sidebar li a[data-id="${item.id}"]`)?.parentElement;
    if (li) li.classList.add('expanded');
  }
}

function handlePopState(event) {
  const pageId = event.state?.pageId || getPageIdFromUrl() || navigationConfig[0]?.id;
  debug(`Popstate event, loading page: ${pageId}`);
  navigateToPage(pageId, false);
}

function getPageIdFromUrl() {
  return window.location.hash.substring(1) || null;
}

function getPageTitle(pageId) {
  if (window.contentIdMap && contentIdMap[pageId]) {
    return contentIdMap[pageId].title;
  }

  function findTitleInNav(items, id) {
    for (const item of items) {
      if (item.id === id) return item.title;
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

function showErrorContent(pageId) {
  debug(`Showing error content for: ${pageId}`);
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="error">
        <h2>Content Not Found</h2>
        <p>The requested content "${pageId}" could not be loaded.</p>
        <p>Please select another topic from the navigation menu.</p>
      </div>
    `;
  }
  document.body.classList.remove('loading');
}

function showWelcomeScreen() {
  if (contentTitleEl) contentTitleEl.textContent = 'Automotive Documentation';
  document.title = 'Automotive Documentation';
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="welcome-screen">
        <h2>🚗 Complete Automotive Documentation System</h2>
        <p>Select a topic from the navigation menu to begin exploring our comprehensive automotive guide.</p>
        
        <div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #2196f3;">
          <h3>🔍 Complete Review & Archive System Features:</h3>
          <ul style="text-align: left; margin-top: 15px; line-height: 1.8;">
            <li><strong>📁 Archive Viewer:</strong> View all archived document versions with complete history</li>
            <li><strong>🔍 Review Mode:</strong> Dedicated side-by-side review interface with space optimization</li>
            <li><strong>💾 Multiple Downloads:</strong> HTML only, HTML with comments, or comments JSON</li>
            <li><strong>💬 Enhanced Comments:</strong> Hover tooltips and click-to-scroll navigation</li>
            <li><strong>📤 Data Export:</strong> Complete database export functionality</li>
            <li><strong>🎯 Space Optimized:</strong> 35% more reading space in review mode</li>
            <li><strong>⚡ Real-time Sync:</strong> All changes sync across windows and sessions</li>
            <li><strong>🔄 Auto-Archive:</strong> Automatic snapshots when feedback is first added</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #4caf50;">
          <h4>🚀 How to Use the Archive System:</h4>
          <ul style="text-align: left; margin-top: 10px; font-size: 0.95em;">
            <li><strong>Start Review:</strong> Click blue "🔍 Review Mode" button (top-right)</li>
            <li><strong>Add Feedback:</strong> Select text and leave comments - archive created automatically</li>
            <li><strong>View Archives:</strong> Click purple "📁 View Archives" button</li>
            <li><strong>Download:</strong> Get HTML files, comments, or combined versions</li>
            <li><strong>Track Status:</strong> Monitor connection in bottom-left corner</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px; font-size: 0.9em; color: #666; padding: 15px; background: #fff3e0; border-radius: 8px;">
          <p>🎯 <strong>Archive System Status:</strong> Ready for document review and archiving</p>
          <p>💡 <strong>Tip:</strong> Archives are created automatically when you first add feedback to any document</p>
        </div>
      </div>
    `;
  }
  document.body.classList.remove('loading');
}

// === SEARCH FUNCTIONALITY ===
function performSearch() {
  if (!searchInput || !searchResultsEl) return;
  
  const query = searchInput.value.toLowerCase().trim();
  searchResultsEl.innerHTML = '';

  if (query.length < 2) {
    if (query.length > 0) {
      searchResultsEl.innerHTML = '<li><p>Please enter at least 2 characters to search.</p></li>';
    }
    return;
  }

  debug(`Performing search for: ${query}`);
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
        navigateToPage(result.id);
        searchResultsEl.innerHTML = '';
        searchInput.value = '';
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
  return text.replace(regex, '<span style="background: yellow;">$1</span>');
}

// === EVENT LISTENERS ===
function setupEventListeners() {
  window.addEventListener('popstate', handlePopState);
  
  // Supabase event listeners
  window.addEventListener('supabaseConnectionChange', (e) => {
    updateConnectionStatus(e.detail.connected);
  });

  // Message handling for review window communication
  window.addEventListener('message', (event) => {
    if (event.data.type === 'reviewCompleted') {
      debug('Review completed message received from review window');
    }
  });
  
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  const printBtn = document.querySelector('.wh_print_link button');
  if (printBtn) {
    printBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.print();
    });
  }
}

// === INITIALIZATION ===
function initApp() {
  debug('Initializing complete fixed SPA with archive system');
  
  try {
    // Initialize DOM elements first
    initializeDOMElements();
    
    // Create UI elements
    createConnectionStatus();
    createActionButtons();
    
    // Setup event listeners
    setupEventListeners();
    
    // Render navigation if available
    if (typeof navigationConfig !== 'undefined' && navigationConfig) {
      renderNavigation(navigationConfig);
    }

    // Test connection and initialize
    testConnection().then(() => {
      const initialPageId = getPageIdFromUrl();
      if (initialPageId) {
        navigateToPage(initialPageId, false);
      } else {
        showWelcomeScreen();
      }
    });
    
    debug('SPA initialization complete');
  } catch (error) {
    debug('Error during initialization:', error);
  }
}

// === APPLICATION START ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
