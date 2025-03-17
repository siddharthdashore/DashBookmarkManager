import { showLoading, hideLoading, renderHomePage, displayError, addGlobalEventListeners, debounce, displayCounts, applySearchFilter, CurrentViewEnum } from './utils.js';

const ItemsPerPage = 6;
let CurrentView = CurrentViewEnum.HOME; // Add a new variable to keep track of the current view
let CurrentPage = 1;
let TotalPages = 1;
let ItemsList = [];
let FilteredItems = []; // Holds filtered results for the search bar
let SelectedItems = new Set();

document.addEventListener('DOMContentLoaded', () => {
    addGlobalEventListeners();
    renderPage();

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
});

function renderPage() {
    SelectedItems.clear();
    updateDeleteAllButton();

    if(CurrentView != CurrentViewEnum.HOME ){
        showLoading(); // Show loading message, making UI a bit busy
        document.getElementById('back-button').style.display = 'block';
        document.getElementById('home-buttons').style.display = 'none';
        document.getElementById('searchBar').style.display = 'block';
    }

    switch (CurrentView) {
        case CurrentViewEnum.BOOKMARKS:
            renderBookmarksPage();
            break;
        case CurrentViewEnum.DUPLICATE_BOOKMARKS:
            renderDuplicatesBookmarksPage();
            break;
        case CurrentViewEnum.EMPTY_FOLDERS:
            renderEmptyFoldersPage();
            break;
        case CurrentViewEnum.HOME:
            CurrentPage = 1;
            TotalPages = 1;
            renderHomePage();
            break;
    }
}

function renderBookmarksPage() {
    // TO DO: implement rendering of empty folders page
}

// New function to render the duplicates page
function renderDuplicatesBookmarksPage() {
    const resultDiv = document.getElementById('result');

    loadDuplicates().then(() => {
        const filteredDuplicates = applySearchFilter(ItemsList); // Apply the filter to get filtered results
        searchInputListener();

        FilteredItems = filteredDuplicates; // Update FilteredItems array
        TotalPages = Math.ceil(FilteredItems.length / ItemsPerPage); // Update TotalPages
        CurrentPage = Math.min(CurrentPage, TotalPages);
        updatePagination(); // Call Update Pagination after updating FilteredItems and TotalPages

        if (filteredDuplicates.length === 0) {
            resultDiv.innerHTML = "<p class='text-center'>No duplicate bookmarks found.</p>";
            document.getElementById('pagination-controls').style.display = "none"; // Hide pagination
            return;
        }
        else {
            if(filteredDuplicates.length == ItemsList.length){
                document.getElementById('total-filtered-items').style.display = 'none';
            }
            else{
                document.getElementById('total-filtered-items').style.display = 'block';
                document.getElementById('total-filtered-items').textContent = `Total Filtered URLs: ${filteredDuplicates.length}`;
            }

            document.getElementById('pagination-controls').style.display = "flex"; // Show pagination
            const start = (CurrentPage - 1) * ItemsPerPage;
            const end = start + ItemsPerPage;
            const pageItems = filteredDuplicates.slice(start, end);

            let table = `
            <table class="table table-bordered table-striped">
            <thead class="thead-dark">
                <tr>
                <th><input type="checkbox" id="selectAll" style="display: none;"></th>
                <th>Title</th>
                <th class="break-word">URL</th>
                <th>Folder Path</th>
                <th>Delete</th>
                </tr>
            </thead>
            <tbody>
            `;
            pageItems.forEach((bookmark) => {
                const isChecked = SelectedItems.has(bookmark.id) ? "checked" : "";
                table += `
            <tr>
                <td><input id="checkbox-${bookmark.id}" type="checkbox" class="select-bookmark" data-id="${bookmark.id}" ${isChecked}></td>
                <td>${bookmark.title}</td>
                <td class="break-word"><a href="${bookmark.url}" target="_blank">${bookmark.url}</a></td>
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
                        alert('Bookmark deleted!');
                        renderPage();
                    });
                });
            });

            document.getElementById('deleteAll').addEventListener('click', () => {
                deleteSelectedBookmarks();
            });
        }
    });
}

const searchInputListener = () => {
    const performSearch = (query) => {
      filterDuplicatesBySearchTerm(query);
    };
    const debouncedSearch = debounce((event) => performSearch(event.target.value), 300);
    const searchInput = document.getElementById('searchBar');
    searchInput.addEventListener('input', debouncedSearch);
  };

function loadDuplicates() {
    return new Promise((resolve, reject) => {
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            chrome.runtime.sendMessage({ action: "findDuplicates" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    displayError("Error finding duplicates: " + chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.error) {
                    displayError(response.error);
                    return;
                }
                ItemsList = response.duplicates || [];
                displayCounts(ItemsList, CurrentView);
                TotalPages = Math.ceil(ItemsList.length / ItemsPerPage);
                FilteredItems = ItemsList; // Initialize filtered duplicates
                resolve();
            });
        } catch (error) {
            console.error("Unexpected error:", error);
            displayError("Unexpected error occurred.");
            reject(error);
        }
    });
}

// New function to render the empty folders page
function renderEmptyFoldersPage() {
    const resultDiv = document.getElementById('result');

    loadEmptyFolders().then(() => {
        const filteredEmptyFolders = applySearchFilter(ItemsList); // Apply the filter to get filtered results
        searchInputListener();

        FilteredItems = filteredEmptyFolders; // Update FilteredItems array
        TotalPages = Math.ceil(FilteredItems.length / ItemsPerPage); // Update TotalPages
        CurrentPage = Math.min(CurrentPage, TotalPages);
        updatePagination(); // Call Update Pagination after updating FilteredItems and TotalPages

        if (filteredEmptyFolders.length === 0) {
            resultDiv.innerHTML = "<p class='text-center'>No empty folders found.</p>";
            document.getElementById('pagination-controls').style.display = "none"; // Hide pagination
            return;
        } else {
            if(filteredEmptyFolders.length == ItemsList.length){
                document.getElementById('total-filtered-items').style.display = 'none';
            }
            else{
                document.getElementById('total-filtered-items').style.display = 'block';
                document.getElementById('total-filtered-items').textContent = `Total Filtered Empty Folders: ${filteredEmptyFolders.length}`;
            }

            document.getElementById('pagination-controls').style.display = "flex"; // Show pagination

            const start = (CurrentPage - 1) * ItemsPerPage;
            const end = start + ItemsPerPage;
            const pageItems = filteredEmptyFolders.slice(start, end);

            let table = `
            <table class="table table-bordered table-striped">
            <thead class="thead-dark">
                <tr>
                    <th><input type="checkbox" id="selectAll" style="display: none;"></th>
                    <th>Title</th>
                    <th class="break-word">Folder Path</th>
                    <th>Delete</th>
                </tr>
            </thead>
            <tbody>
            `;
            pageItems.forEach((folder) => {
                const isChecked = SelectedItems.has(folder.id) ? "checked" : "";
                table += `
            <tr>
                <td><input id="checkbox-${folder.id}" type="checkbox" class="select-bookmark" data-id="${folder.id}" ${isChecked}></td>
                <td>${folder.title}</td>
                <td>${folder.folderPath}</td>
                <td><button class="delete-btn" data-id="${folder.id}"><i class="fas fa-trash"></i></button></td>
            </tr>
            `;
            });
            table += `
            </tbody>
            </table>
            `;
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
                        alert('Selected bookmarks deleted!');
                        renderPage();
                    });
                });
            });

            document.getElementById('deleteAll').addEventListener('click', () => {
                deleteSelectedBookmarks();
            });
        }
    });
}

function loadEmptyFolders() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "findEmptyFolders" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
          displayError("Error finding empty folders: " + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.error) {
          displayError(response.error);
          return;
        }
        const emptyFolders = response.emptyFolders || [];
        const formattedEmptyFolders = emptyFolders.map((folder) => {
          return {
            id: folder.id,
            title: folder.title,
            folderPath: folder.folderPath || '',
          };
        });
        ItemsList = formattedEmptyFolders;
        displayCounts(ItemsList, CurrentView);
        resolve();
      });
    });
  }

function filterDuplicatesBySearchTerm(searchTerm) {
    const searchTermLower = searchTerm.toLowerCase();
    FilteredItems = ItemsList.filter(
        ({ title, url, folderPath }) =>
            (title && title.toLowerCase().includes(searchTermLower)) ||
            (url && url.toLowerCase().includes(searchTermLower)) ||
            (folderPath && folderPath.toLowerCase().includes(searchTermLower))
    );
    TotalPages = Math.ceil(FilteredItems.length / ItemsPerPage);
    CurrentPage = 1; // Reset CurrentPage to 1
    renderPage();
    updateDeleteAllButton();
}

function updateDeleteAllButton() {
    const deleteAllButton = document.getElementById('deleteAll');
    deleteAllButton.style.display = SelectedItems.size <= 1 ? 'none' : 'block';
}

document.getElementById('back-button').addEventListener('click', () => {
    CurrentView = CurrentViewEnum.HOME;
    renderPage();
});

let previousSelectedBookmarks = new Set();
function deleteSelectedBookmarks() {
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
                        alert('Selected bookmark folder deleted!');
                        renderPage();
                    }
                });
            } else {
                // If the bookmark is not a folder, remove it with remove
                chrome.bookmarks.remove(id, () => {
                    removedCount++;
                    if (removedCount === bookmarkIds.length) {
                        SelectedItems.clear();
                        alert('Selected bookmarks deleted!');
                        renderPage();
                    }
                });
            }
        });
    });
}

function updatePagination() {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    for (let pageNumber = 1; pageNumber <= TotalPages; pageNumber++) {
        const pageItem = document.createElement('li');
        pageItem.classList.add('page-item');

        if (pageNumber === CurrentPage) {
            pageItem.classList.add('active');
        }

        pageItem.innerHTML = `<a class="page-link" href="#">${pageNumber}</a>`;
        pageItem.addEventListener('click', () => {
            CurrentPage = pageNumber;
            renderPage();
        });

        paginationControls.appendChild(pageItem);
    }
}
