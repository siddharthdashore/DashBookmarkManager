import { showLoading, hideLoading, renderHomePage, displayError, addGlobalEventListeners, debounce, displayCounts, applySearchFilter, dumpLogs, showAlert, CurrentViewEnum, LogLevel } from './utils.js';

let ItemsPerPage = 4;
let CurrentView = CurrentViewEnum.HOME; // Add a new variable to keep track of the current view
let CurrentPage = 1;
let CurrentTheme = 'light';
let TotalPages = 1;
let ItemsList = [];
let FilteredItems = []; // Holds filtered results for the search bar
let SelectedItems = new Set();
let actionStrAllBookmark = "findAllBookmarks"
let actionStrDuplicateBookmark = "findDuplicates"
let actionStrEmptyFolder = "findEmptyFolders"
let actionStrPendingTabsCleanup = "pendingTabsCleanup"
let isTabsCleanupInProgress = false;
let searchInputListenerAdded = false;
let debouncedSearch = null;

document.addEventListener('DOMContentLoaded', () => {
    addGlobalEventListeners();
    renderPage();

    const theme = localStorage.getItem('theme');
    const itemsPerPage = parseInt(localStorage.getItem('itemsPerPage'));

    if (theme) {
        updateTheme(theme);
    }

    if (itemsPerPage) {
        updateItemsPerPage(itemsPerPage);
    }

    // Add event listeners to home buttons
    document.getElementById('bookmarks-button').addEventListener('click', () => {
        CurrentView = CurrentViewEnum.BOOKMARKS;
        renderPage();
    });

    document.getElementById('duplicates-button').addEventListener('click', () => {
        CurrentView = CurrentViewEnum.DUPLICATE_BOOKMARKS;
        renderPage();
    });

    document.getElementById('empty-folders-button').addEventListener('click', () => {
        CurrentView = CurrentViewEnum.EMPTY_FOLDERS;
        renderPage();
    });

    document.getElementById('back-button').addEventListener('click', () => {
        CurrentView = CurrentViewEnum.HOME;
        renderPage();
    });

    document.getElementById('settings-button').addEventListener('click', () => {
        CurrentView = CurrentViewEnum.SETTINGS;
        renderPage();
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        CurrentView = CurrentViewEnum.SETTINGS;
        if (document.body.classList.contains('dark-mode')) {
            CurrentTheme = "light";

        } else {
            CurrentTheme = "dark";
        }
        document.getElementById('theme-select').value = CurrentTheme;
        CurrentView = CurrentViewEnum.HOME;
        saveSettings();
    });

    document.getElementById('save-settings-button').addEventListener('click', () => {
        saveSettings();
    });

    document.getElementById('tab-cleanup-button').addEventListener('click', () => {
        performTabsCleanup();
    });
});

function performTabsCleanup() {
    if (isTabsCleanupInProgress) {
        dumpLogs(LogLevel.WARNING, "Tabs cleanup is already in progress. Skipping...");
        return Promise.resolve(); // Return a resolved promise to avoid breaking the chain
    }

    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `performTabsCleanup() started at ${startTime}`);
    isTabsCleanupInProgress = true;

    return new Promise((resolve, reject) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        chrome.runtime.sendMessage({ action: actionStrPendingTabsCleanup })
            .then((response) => {
                if (chrome.runtime.lastError) {
                    dumpLogs(LogLevel.ERROR, "Error sending message:", chrome.runtime.lastError.message);
                    displayError("Error finding duplicates: " + chrome.runtime.lastError.message);
                    reject(chrome.runtime.lastError);
                    return;
                }
                if (response && response.error) {
                    displayError(response.error);
                    reject(response.error);
                    return;
                }
                showAlert(LogLevel.INFO, "Pending tabs saved to path: " + response.timestampFolderPath);
                resolve();
            })
            .catch((error) => {
                dumpLogs(LogLevel.ERROR, "Unexpected error:", error);
                displayError("Unexpected error occurred.");
                reject(error);
            })
            .finally(() => {
                isTabsCleanupInProgress = false;
                dumpLogs(LogLevel.LOG, `performTabsCleanup() call completed in ${(Date.now() - startTime) / 1000}ms`);
            });
    });
}

function updateTheme(theme) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `updateTheme() started at ${startTime}`);

    const themeToggle = document.getElementById('theme-toggle');
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    themeToggle.blur();
    CurrentTheme = theme;
    dumpLogs(LogLevel.LOG, `updateTheme() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function updateItemsPerPage(itemsPerPage) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `updateItemsPerPage() started at ${startTime}`);
    ItemsPerPage = itemsPerPage;
    renderPage();
    dumpLogs(LogLevel.LOG, `updateItemsPerPage() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function renderSettingsPage() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `renderSettingsPage() started at ${startTime}`);
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-buttons').style.display = 'none';
    document.getElementById('home-tab-buttons').style.display = 'none';
    document.getElementById('settings-modal').style.display = 'block';

    document.getElementById('theme-select').value = CurrentTheme;
    document.getElementById('items-per-page-input').value = ItemsPerPage;
    dumpLogs(LogLevel.LOG, `renderSettingsPage() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function saveSettings() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `saveSettings() started at ${startTime}`);
    const themeSelect = document.getElementById('theme-select');
    const itemsPerPageInput = document.getElementById('items-per-page-input');
    const theme = themeSelect.value;
    const itemsPerPage = parseInt(itemsPerPageInput.value);

    // Save the new settings
    localStorage.setItem('theme', theme);
    localStorage.setItem('itemsPerPage', itemsPerPage);

    // Update the theme and items per page
    updateTheme(theme);
    updateItemsPerPage(itemsPerPage);

    // Close the settings modal
    const settingsModal = document.getElementById('settings-modal');
    settingsModal.style.display = 'none';
    localStorage.setItem('itemsPerPage', itemsPerPage);
    dumpLogs(LogLevel.LOG, `saveSettings() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function renderPage() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `renderPage() started at ${startTime}`);

    try {
        SelectedItems.clear();
        updateDeleteAllButton();

        if (CurrentView == CurrentViewEnum.BOOKMARKS || CurrentView == CurrentViewEnum.DUPLICATE_BOOKMARKS || CurrentView == CurrentViewEnum.EMPTY_FOLDERS) {
            showLoading(); // Show loading message, making UI a bit busy
            document.getElementById('back-button').style.display = 'block';
            document.getElementById('home-buttons').style.display = 'none';
            document.getElementById('home-tab-buttons').style.display = 'none';
            document.getElementById('searchBar').style.display = 'block';
        }
        else if (CurrentView == CurrentViewEnum.HOME) {
            CurrentPage = 1;
            TotalPages = 1;
            renderHomePage();
            return;
        } else if (CurrentView == CurrentViewEnum.SETTINGS) {
            renderSettingsPage();
            return;
        }

        const resultDiv = document.getElementById('result');
        const actionStrings = {
            [CurrentViewEnum.BOOKMARKS]: actionStrAllBookmark,
            [CurrentViewEnum.DUPLICATE_BOOKMARKS]: actionStrDuplicateBookmark,
            [CurrentViewEnum.EMPTY_FOLDERS]: actionStrEmptyFolder,
        };

        const actionString = actionStrings[CurrentView];

        loadItems(actionString).then(() => {
            const filteredItems = applySearchFilter(ItemsList); // Apply the filter to get filtered results

            searchInputListenerClose();
            searchInputListener();

            FilteredItems = filteredItems; // Update FilteredItems array
            TotalPages = Math.ceil(FilteredItems.length / ItemsPerPage); // Update TotalPages
            CurrentPage = Math.min(CurrentPage, TotalPages);
            updatePagination(); // Call Update Pagination after updating FilteredItems and TotalPages

            if (filteredItems.length === 0) {
                resultDiv.innerHTML = `<p class='text-center'>No ${CurrentView} found.</p>`;
                document.getElementById('pagination-controls').style.display = "none"; // Hide pagination
                return;
            } else {
                if (filteredItems.length == ItemsList.length) {
                    document.getElementById('total-filtered-items').style.display = 'none';
                }
                else {
                    document.getElementById('total-filtered-items').style.display = 'block';
                    document.getElementById('total-filtered-items').textContent = `Total Filtered ${CurrentView}: ${filteredItems.length}`;
                }

                document.getElementById('pagination-controls').style.display = "flex"; // Show pagination
                const start = (CurrentPage - 1) * ItemsPerPage;
                const end = start + ItemsPerPage;
                const pageItems = filteredItems.slice(start, end);

                let table = `
            <table>
            <thead class="thead-dark">
                <tr>
                    <th><input type="checkbox" id="selectAll" style="display: none;"></th>
                    <th style="text-align: center;">Title</th>
                    ${CurrentView === CurrentViewEnum.EMPTY_FOLDERS ? '' : '<th style="text-align: center;" class="break-word">URL</th>'}
                    <th style="text-align: center;">Folder Path</th>
                    <th style="text-align: center;">Delete</th>
                </tr>
            </thead>
            <tbody>
            `;

                if (CurrentView !== CurrentViewEnum.EMPTY_FOLDERS) {
                    table = table.replace('<table', '<table class="table-with-url"');
                }

                pageItems.forEach((bookmark) => {
                    const isChecked = SelectedItems.has(bookmark.id) ? "checked" : "";
                    table += `
            <tr>
                <td><input id="checkbox-${bookmark.id}" type="checkbox" class="select-bookmark" data-id="${bookmark.id}" ${isChecked}></td>
                <td>${bookmark.title}</td>
                ${CurrentView === CurrentViewEnum.EMPTY_FOLDERS ? '' : `<td class="break-word"><a href="${bookmark.url}" target="_blank">${bookmark.url}</a></td>`}
                <td>${bookmark.folderPath}</td>
                <td><button class="delete-btn" data-id="${bookmark.id}"><i class="fas fa-trash"></i></button></td>
            </tr>
            `;
                });

                table += `</tbody></table>`;
                resultDiv.innerHTML = table;

                document.getElementById('selectAll').addEventListener('click', (event) => {
                    const isChecked = event.target.checked;
                    document.querySelectorAll('.select-bookmark').forEach((checkbox) => {
                        checkbox.checked = isChecked;
                        const bookmarkId = checkbox.dataset.id;
                        if (isChecked) {
                            SelectedItems.add(bookmarkId);
                        } else {
                            SelectedItems.delete(bookmarkId);
                        }
                    });
                    updateDeleteAllButton(); // Update the Delete All button state
                });

                document.querySelectorAll('.select-bookmark').forEach((checkbox) => {
                    checkbox.addEventListener('click', (event) => {
                        const bookmarkId = event.target.dataset.id;
                        if (event.target.checked) {
                            SelectedItems.add(bookmarkId);
                        } else {
                            SelectedItems.delete(bookmarkId);
                        }
                        updateDeleteAllButton(); // Update the Delete All button state
                    });
                });

                document.querySelectorAll('.delete-btn').forEach((button) => {
                    button.addEventListener('click', (event) => {
                        const buttonElement = event.target.closest('.delete-btn');
                        const bookmarkId = buttonElement.dataset.id;
                        chrome.bookmarks.remove(bookmarkId, () => {
                            showAlert(LogLevel.INFO, `Selected ${CurrentView} deleted!`);
                            renderPage();
                        });
                    });
                });

                document.getElementById('deleteAll').addEventListener('click', () => {
                    deleteSelectedBookmarks();
                });
            }
        });
    } finally {
        dumpLogs(LogLevel.LOG, `renderPage() call completed in ${(Date.now() - startTime) / 1000}ms`);
    }
}

const searchInputListenerClose = () => {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `searchInputListenerClose() started at ${startTime}`);

    const searchInput = document.getElementById('searchBar');
    if (debouncedSearch != null) {
        searchInput.removeEventListener('input', debouncedSearch);
        searchInputListenerAdded = false;
    }

    dumpLogs(LogLevel.LOG, `searchInputListenerClose() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

const searchInputListener = () => {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `searchInputListener() started at ${startTime}`);

    const searchInput = document.getElementById('searchBar');
    if (!searchInputListenerAdded) { // Check if the event listener has already been added
        searchInputListenerAdded = true;
        debouncedSearch = debounce((event) => performSearch(event.target.value), 300);
        searchInput.addEventListener('input', debouncedSearch);
    }
    dumpLogs(LogLevel.LOG, `searchInputListener() call completed in ${(Date.now() - startTime) / 1000}ms`);
};

const performSearch = (query) => {
    const startTimePerformSearch = Date.now();
    dumpLogs(LogLevel.LOG, `performSearch() started at ${startTimePerformSearch}`);
    filterBySearchTerm(query);
    searchInputListenerAdded = false;
    dumpLogs(LogLevel.LOG, `performSearch() call completed in ${(Date.now() - startTimePerformSearch) / 1000}ms`);
};

function loadItems(actionString) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `loadItems() started at ${startTime}`);

    return new Promise((resolve, reject) => {
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            chrome.runtime.sendMessage({ action: actionString }, (response) => {
                if (chrome.runtime.lastError) {
                    dumpLogs(LogLevel.ERROR, `Error sending message: ${chrome.runtime.lastError.message}`);
                    displayError(`Error finding duplicates: ${chrome.runtime.lastError.message}`);
                    return;
                }
                if (response && response.error) {
                    displayError(response.error);
                    return;
                }
                ItemsList = response.fetchedBookmarks || [];
                displayCounts(ItemsList, CurrentView);
                TotalPages = Math.ceil(ItemsList.length / ItemsPerPage);
                FilteredItems = ItemsList; // Initialize filtered duplicates
                // dumpLogs(LogLevel.LOG, `loadItems() received response: ${JSON.stringify(response)}`);
                resolve();
            });
        } catch (error) {
            dumpLogs(LogLevel.ERROR, `Unexpected error: ${error}`);
            displayError("Unexpected error occurred.");
            reject(error);
        }
    }).finally(() => {
        dumpLogs(LogLevel.LOG, `loadItems() call completed in ${(Date.now() - startTime) / 1000}ms`);
    });
}

function filterBySearchTerm(searchTerm) {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `filterBySearchTerm() started at ${startTime}`);
    dumpLogs(LogLevel.ERROR, 'searchTerm:', searchTerm);
    const searchTermLower = searchTerm.replace(/"/g, '').toLowerCase();
    dumpLogs(LogLevel.ERROR, 'searchTermLower:', searchTermLower);

    FilteredItems = ItemsList.filter(
        ({ title, url, folderPath }) =>
            (title && title.toLowerCase().includes(searchTermLower)) ||
            (url && url.toLowerCase().includes(searchTermLower)) ||
            (folderPath && folderPath.toLowerCase().includes(searchTermLower))
    );
    TotalPages = Math.ceil(FilteredItems.length / ItemsPerPage);
    CurrentPage = 1; // Reset CurrentPage to 1
    renderPage();
    dumpLogs(LogLevel.LOG, `filterBySearchTerm() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function updateDeleteAllButton() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `updateDeleteAllButton() started at ${startTime}`);
    const deleteAllButton = document.getElementById('deleteAll');
    deleteAllButton.style.display = SelectedItems.size <= 1 ? 'none' : 'block';
    dumpLogs(LogLevel.LOG, `updateDeleteAllButton() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

let previousSelectedBookmarks = new Set();
function deleteSelectedBookmarks() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `deleteSelectedBookmarks() started at ${startTime}`);
    if (SelectedItems.size === previousSelectedBookmarks.size && [...SelectedItems].every((value, index) => value === [...previousSelectedBookmarks][index])) {
        return;
    }
    previousSelectedBookmarks = new Set(SelectedItems);

    const bookmarkIds = Array.from(SelectedItems);
    let removedCount = 0;

    bookmarkIds.forEach((id) => {
        chrome.bookmarks.get(id, (bookmark) => {
            if (bookmark[0].children) {
                // If the bookmark is a folder, remove it with removeTree
                chrome.bookmarks.removeTree(id, () => {
                    removedCount++;
                    if (removedCount === bookmarkIds.length) {
                        SelectedItems.clear();
                        showAlert(LogLevel.INFO, `Selected ${CurrentView} deleted!`);
                        renderPage();
                    }
                });
            } else {
                // If the bookmark is not a folder, remove it with remove
                chrome.bookmarks.remove(id, () => {
                    removedCount++;
                    if (removedCount === bookmarkIds.length) {
                        SelectedItems.clear();
                        showAlert(LogLevel.INFO, `Selected ${CurrentView} deleted!`);
                        renderPage();
                    }
                });
            }
        });
    });
    dumpLogs(LogLevel.LOG, `deleteSelectedBookmarks() call completed in ${(Date.now() - startTime) / 1000}ms`);
}

function updatePagination() {
    const startTime = Date.now();
    dumpLogs(LogLevel.LOG, `updatePagination() started at ${startTime}`);
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    const totalPages = TotalPages;
    const currentPage = CurrentPage;
    const pageWidth = 5;

    if (totalPages <= pageWidth) {
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
            const pageItem = document.createElement('li');
            pageItem.classList.add('page-item');

            if (pageNumber === currentPage) {
                pageItem.classList.add('active');
            }

            pageItem.innerHTML = `<a class="page-link" href="#">${pageNumber}</a>`;
            pageItem.addEventListener('click', () => {
                CurrentPage = pageNumber;
                renderPage();
            });

            paginationControls.appendChild(pageItem);
        }
    } else {
        const startPage = Math.max(1, currentPage - Math.floor(pageWidth / 2));
        const endPage = Math.min(totalPages, currentPage + Math.floor(pageWidth / 2));

        if (startPage > 1) {
            const prevPageItem = document.createElement('li');
            prevPageItem.classList.add('page-item');
            prevPageItem.innerHTML = '<a class="page-link" href="#">1</a>';
            prevPageItem.addEventListener('click', () => {
                CurrentPage = 1;
                renderPage();
            });
            paginationControls.appendChild(prevPageItem);

            const ellipsisItem = document.createElement('li');
            ellipsisItem.classList.add('page-item');
            ellipsisItem.innerHTML = '<a class="page-link" href="#">...</a>';
            paginationControls.appendChild(ellipsisItem);
        }

        for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
            const pageItem = document.createElement('li');
            pageItem.classList.add('page-item');

            if (pageNumber === currentPage) {
                pageItem.classList.add('active');
            }

            pageItem.innerHTML = `<a class="page-link" href="#">${pageNumber}</a>`;
            pageItem.addEventListener('click', () => {
                CurrentPage = pageNumber;
                renderPage();
            });

            paginationControls.appendChild(pageItem);
        }

        if (endPage < totalPages) {
            const ellipsisItem = document.createElement('li');
            ellipsisItem.classList.add('page-item');
            ellipsisItem.innerHTML = '<a class="page-link" href="#">...</a>';
            paginationControls.appendChild(ellipsisItem);

            const nextPageItem = document.createElement('li');
            nextPageItem.classList.add('page-item');
            nextPageItem.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
            nextPageItem.addEventListener('click', () => {
                CurrentPage = totalPages;
                renderPage();
            });
            paginationControls.appendChild(nextPageItem);
        }
    }

    dumpLogs(LogLevel.LOG, `updatePagination() call completed in ${(Date.now() - startTime) / 1000}ms`);
}
