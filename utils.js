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
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `addGlobalEventListeners() started at ${startTime}`);

    const closeButton = document.getElementById('close-button');
    closeButton.addEventListener('click', () => window.close());

    dumpLogs(LogLevel.LOG, `addGlobalEventListeners() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function renderHomePage() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `renderHomePage() started at ${startTime}`);

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

    dumpLogs(LogLevel.LOG, `renderHomePage() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function showLoading() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `showLoading() started at ${startTime}`);

    document.getElementById('pagination-controls').style.display = "none";
    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = `<p class="text-center text-primary">Loading...</p>`;

    dumpLogs(LogLevel.LOG, `showLoading() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function hideLoading() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `hideLoading() started at ${startTime}`);

    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = ''; // Clear the loading message

    dumpLogs(LogLevel.LOG, `hideLoading() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function displayError(message) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `displayError() started at ${startTime}`);

    const container = document.getElementById('result');
    container.innerHTML = `<p class="text-center text-danger">Error: ${message}</p>`;

    dumpLogs(LogLevel.LOG, `displayError() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function debounce(callback, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), wait);
    };
}

function displayCounts(duplicates, currentView) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `displayCounts() started at ${startTime}`);

    const totalUrls = duplicates.length;
    document.getElementById('total-urls').style.display = 'block';
    document.getElementById('total-urls').textContent = `Total ${currentView}: ${totalUrls}`;

    if (currentView == CurrentViewEnum.DUPLICATE_BOOKMARKS) {
        const totalDuplicates = new Set(duplicates.map(({ url }) => url)).size;
        document.getElementById('total-items').style.display = 'block';
        document.getElementById('total-items').textContent = `Total Duplicate URL: ${totalDuplicates}`;
    }
    dumpLogs(LogLevel.LOG, `displayCounts() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function applySearchFilter(items) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `applySearchFilter() started at ${startTime}`);
    let filteredItems = [];

    try {
        const searchBar = document.getElementById('searchBar'); // Assuming there is a search bar
        const filterText = searchBar?.value?.replace(/["'`]/g, "").toLowerCase() ?? "";

        if (filterText == "") {
            return items;
        }

        filteredItems = items.filter((item) =>
            (item.title?.toLowerCase() || "").includes(filterText) ||
            (item.url?.toLowerCase() || "").includes(filterText) ||
            (item.folderPath?.toLowerCase() || "").includes(filterText)
        );
    } finally {
        dumpLogs(LogLevel.LOG, `applySearchFilter() call completed in ${(Date.now() - startTime) / 1000}ms`);
    }
    return filteredItems;
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