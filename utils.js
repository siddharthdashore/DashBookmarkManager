function addGlobalEventListeners() {
  const closeButton = document.getElementById('close-button');
  closeButton.addEventListener('click', () => window.close());
}

function renderHomePage() {
    document.getElementById('back-button').style.display = 'none';
    document.getElementById('pagination-controls').style.display = "none";
    document.getElementById('total-urls').style.display = 'none';
    document.getElementById('total-duplicates').style.display = 'none';
    document.getElementById('home-buttons').style.display = 'block';
    document.getElementById('result').innerHTML = '';
    const searchBar = document.getElementById('searchBar');
    searchBar.style.display = 'none';
    searchBar.value = '';
  }

function showLoading() {
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

export { addGlobalEventListeners, renderHomePage, showLoading, hideLoading, displayError, debounce};