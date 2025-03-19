let enableDebugLogs = false;

const CurrentViewEnum = {
    HOME: "Home",
    BOOKMARKS: "Bookmarks",
    DUPLICATE_BOOKMARKS: "Duplicate Bookmarks",
    EMPTY_FOLDERS: "Empty Folders",
    SETTINGS: "Settings"
}

const LogLevel = {
    LOG: "log",
    INFO: "info",
    WARNING: "warning",
    ERROR: "error",
    DEBUG: "debug"
}

function addGlobalEventListeners() {
    const closeButton = document.getElementById('close-button');
    closeButton.addEventListener('click', () => window.close());
}

function renderHomePage() {
    document.getElementById('back-button').style.display = 'none';
    document.getElementById('pagination-controls').style.display = "none";
    document.getElementById('settings-modal').style.display = 'none';

    document.getElementById('total-urls').style.display = 'none';
    document.getElementById('total-items').style.display = 'none';
    document.getElementById('total-filtered-items').style.display = 'none';
    document.getElementById('home-buttons').style.display = 'block';
    document.getElementById('home-tab-buttons').style.display = 'block';

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
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), wait);
    };
}

function displayCounts(duplicates, currentView) {
    const totalUrls = duplicates.length;
    document.getElementById('total-urls').style.display = 'block';
    document.getElementById('total-urls').textContent = `Total ${currentView}: ${totalUrls}`;

    if (currentView == CurrentViewEnum.DUPLICATE_BOOKMARKS) {
        const totalDuplicates = new Set(duplicates.map(({ url }) => url)).size;
        document.getElementById('total-items').style.display = 'block';
        document.getElementById('total-items').textContent = `Total Duplicate URL: ${totalDuplicates}`;
    }
}

function applySearchFilter(items) {
    const searchBar = document.getElementById('searchBar'); // Assuming there is a search bar
    const filterText = searchBar?.value?.toLowerCase() ?? "";

    if (filterText == "") return items;

    return items.filter((item) =>
        (item.title?.toLowerCase() || "").includes(filterText) ||
        (item.url?.toLowerCase() || "").includes(filterText) ||
        (item.folderPath?.toLowerCase() || "").includes(filterText)
    );
}

function dumpLogs(logLevel, message) {
    switch (logLevel) {
        case LogLevel.INFO:
            console.info(message);
            break;
        case LogLevel.WARNING:
            console.warn(message);
            break;
        case LogLevel.ERROR:
            console.error(message);
            break;
        case LogLevel.DEBUG:
            if (enableDebugLogs) { console.debug(message) };
            break;
        case LogLevel.LOG:
            if (enableDebugLogs) { console.log(message) };
            break;
    }
}

function showAlert(logLevel, message) {
    dumpLogs(logLevel, message);
    alert(message);
}

export { addGlobalEventListeners, renderHomePage, showLoading, hideLoading, displayError, debounce, displayCounts, applySearchFilter, dumpLogs, showAlert, CurrentViewEnum, LogLevel };