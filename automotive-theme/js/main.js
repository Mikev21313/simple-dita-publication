// Category Definitions - Edit these to match your DITA structure
const categories = [
    {
        id: 'automotive-theories',
        title: 'Automotive Theories',
        icon: 'images/icons/theories.svg',
        url: 'automotive-theories.html'
    },
    {
        id: 'basic-maintenance',
        title: 'Basic Maintenance',
        icon: 'images/icons/basic-maintenance.svg',
        url: 'basic-maintenance.html'
    },
    {
        id: 'vehicle-maintenance',
        title: 'Vehicle Maintenance',
        icon: 'images/icons/vehicle-maintenance.svg',
        url: 'vehicle-maintenance.html'
    },
    {
        id: 'emergency-repairs',
        title: 'Emergency Repairs',
        icon: 'images/icons/emergency.svg',
        url: 'emergency-repairs.html'
    },
    {
        id: 'vehicle-components',
        title: 'Vehicle Components',
        icon: 'images/icons/components.svg',
        url: 'vehicle-components.html'
    },
    {
        id: 'electrical-systems',
        title: 'Electrical Systems',
        icon: 'images/icons/electrical.svg',
        url: 'electrical-systems.html'
    }
    // Add more categories as needed
];

// Function to generate category tiles
function generateCategoryTiles() {
    const categoriesContainer = document.querySelector('.categories');
    if (!categoriesContainer) return;
    
    categories.forEach(category => {
        const tile = document.createElement('a');
        tile.href = category.url;
        tile.className = 'category-tile';
        tile.id = category.id;
        
        const icon = document.createElement('img');
        icon.src = category.icon;
        icon.alt = category.title;
        icon.className = 'category-icon';
        
        const title = document.createElement('h3');
        title.className = 'category-title';
        title.textContent = category.title;
        
        tile.appendChild(icon);
        tile.appendChild(title);
        categoriesContainer.appendChild(tile);
    });
}

// Initialize search functionality
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (!searchInput || !searchButton) return;
    
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            // Implement search functionality or redirect to search page
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    generateCategoryTiles();
    initSearch();
});