// SPA Application with hierarchical navigation and arrow toggling

// DOM Elements
const contentEl = document.getElementById('content');
const contentTitleEl = document.getElementById('content-title');
const navigationEl = document.getElementById('navigation');

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
let currentPage = null;
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
  
  // Load initial page based on URL or default
  const initialPageId = getPageIdFromUrl() || navigationConfig[0].id;
  debug('Initial page ID:', initialPageId);
  navigateToPage(initialPageId, false);
}

// Render the navigation menu with hierarchy
function renderNavigation(items, parentEl = navigationEl) {
  const ul = document.createElement('ul');
  
  items.forEach(item => {
    const li = document.createElement('li');
    
    // Add class if item has children
    if (item.children && item.children.length > 0) {
      li.classList.add('has-children');
      
      // Create a toggle arrow element
      const toggle = document.createElement('span');
      toggle.className = 'toggle-arrow';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.toggle('expanded');
      });
      li.appendChild(toggle);
    }
    
    const a = document.createElement('a');
    a.textContent = item.title;
    a.setAttribute('data-id', item.id);
    a.href = `#${item.id}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPage(item.id);
    });
    
    li.appendChild(a);
    
    // Recursively render children if any
    if (item.children && item.children.length > 0) {
      renderNavigation(item.children, li);
    }
    
    ul.appendChild(li);
  });
  
  parentEl.appendChild(ul);
}

// Expand navigation path to the current page
function expandNavigationTo(pageId) {
  // Helper to search for a page in the navigation tree
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
  
  // Find the path to the page
  const path = findPageInNavigation(navigationConfig, pageId);
  if (!path) return;
  
  // Expand all parent items in the path
  for (let i = 0; i < path.length - 1; i++) {
    const item = path[i];
    const li = document.querySelector(`.sidebar li a[data-id="${item.id}"]`).parentElement;
    li.classList.add('expanded');
  }
}

// Navigate to a specific page
function navigateToPage(pageId, pushState = true) {
  debug('Navigating to page:', pageId);
  
  // Update active state in navigation
  updateActiveNavItem(pageId);
  
  // Expand navigation to show the current page
  expandNavigationTo(pageId);
  
  // Update the URL
  if (pushState) {
    history.pushState({ pageId }, '', `#${pageId}`);
  }
  
  // Show loading indicator
  document.body.classList.add('loading');
  
  // Update current page
  currentPage = pageId;
  
  // Get alternate ID (convert underscores to hyphens)
  const altPageId = pageId.replace(/_/g, '-');
  
  // Load content
  loadContent(pageId)
    .then(content => {
      // Update title
      const title = getPageTitle(pageId);
      contentTitleEl.textContent = title;
      document.title = title;
      
      // Fix for duplicate headings
      if (content.includes(`<h1>${title}</h1>`)) {
        content = content.replace(`<h1>${title}</h1>`, '');
      }
      
      // Update content
      contentEl.innerHTML = content;
      
      // Hide loading indicator
      document.body.classList.remove('loading');
      debug('Content loaded successfully');
    })
    .catch(error => {
      debug('Error loading content:', error.message);
      // Try alternate ID
      loadContent(altPageId)
        .then(content => {
          contentTitleEl.textContent = getPageTitle(pageId);
          document.title = getPageTitle(pageId);
          contentEl.innerHTML = content;
          document.body.classList.remove('loading');
          debug('Content loaded from alternate ID');
        })
        .catch(altError => {
          console.error('Failed to load content:', altError);
          contentEl.innerHTML = `
            <div class="error">
              <h2>Content Not Found</h2>
              <p>The requested content "${pageId}" could not be loaded.</p>
              <p>Please select another topic from the navigation menu.</p>
            </div>
          `;
          document.body.classList.remove('loading');
        });
    });
}

// Load content for a page
async function loadContent(pageId) {
  const contentPath = `${basePath}/content/${pageId}.html`;
  debug('Fetching from URL:', contentPath);
  
  const response = await fetch(contentPath);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.text();
}

// Update active state in navigation
function updateActiveNavItem(pageId) {
  // Remove active class from all nav items
  const allNavItems = document.querySelectorAll('.sidebar a');
  allNavItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to current page nav item
  const activeItem = document.querySelector(`.sidebar a[data-id="${pageId}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
    
    // Make sure the parents are expanded
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
  if (!contentManifest[pageId]) {
    return pageId.split(/-|_/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  return contentManifest[pageId].title;
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
