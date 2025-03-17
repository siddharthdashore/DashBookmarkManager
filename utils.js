const CurrentViewEnum = {
    HOME: 1,
    BOOKMARKS: 2,
    DUPLICATE_BOOKMARKS: 3,
    EMPTY_FOLDERS: 4,
    SETTINGS: 5
  }

function addGlobalEventListeners() {
  const closeButton = document.getElementById('close-button');
  closeButton.addEventListener('click', () => window.close());
}

function renderHomePage() {
    document.getElementById('back-button').style.display = 'none';
    document.getElementById('pagination-controls').style.display = "none";

    document.getElementById('total-urls').style.display = 'none';
    document.getElementById('total-duplicates').style.display = 'none';
    document.getElementById('total-filtered-duplicates').style.display = 'none';
    document.getElementById('home-buttons').style.display = 'block';

    document.getElementById('result').innerHTML = '';
    const searchBar = document.getElementById('searchBar');
    searchBar.style.display = 'none';
    searchBar.value = '';
  }

function showLoading() {
    document.getElementById('pagination-controls').style.display = "none";

    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = `<p class="text-center text-primary">Loading...</p>`;
}
    
function hideLoading() {
    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = ''; // Clear the loading message
}

function displayError(message) {
    const container = document.getElementById('result');
    container.innerHTML = `<p class="text-center text-danger">Error: ${message}</p>`;
}

function debounce(callback, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), wait);
    };
}

function displayDuplicateCounts(duplicates, currentView) {
    const totalUrls = duplicates.length;
    const totalDuplicates = new Set(duplicates.map(({ url }) => url)).size;

    document.getElementById('total-urls').style.display = 'block';
    document.getElementById('total-urls').textContent = `Total URLs: ${totalUrls}`;
    document.getElementById('total-duplicates').style.display = 'block';
    document.getElementById('total-duplicates').textContent = `Total Duplicates: ${totalDuplicates}`;
}

function applySearchFilter(items) {
    const searchBar = document.getElementById('searchBar'); // Assuming there is a search bar
    const filterText = searchBar ? searchBar.value.toLowerCase() : "";

    return items.filter((item) =>
        item.title.toLowerCase().includes(filterText) || item.url.toLowerCase().includes(filterText)
    );
}

export { addGlobalEventListeners, renderHomePage, showLoading, hideLoading, displayError, debounce, displayDuplicateCounts, applySearchFilter, CurrentViewEnum};