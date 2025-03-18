import { showLoading, hideLoading, renderHomePage, displayError, addGlobalEventListeners, debounce, displayCounts, applySearchFilter, CurrentViewEnum } from './utils.js';

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
        // Toggle the dark mode class on the body
        document.body.classList.toggle('dark-mode');
        // Update the button text
        const themeToggle = document.getElementById('theme-toggle');
        if (document.body.classList.contains('dark-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        themeToggle.blur();
    });

      document.getElementById('save-settings-button').addEventListener('click', () => {
        saveSettings();
      });
});

function updateTheme(theme) {
    if (theme === 'light') {
      document.body.classList.remove('dark-mode');
    } else if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    }
    CurrentTheme = theme;
  }
  
  function updateItemsPerPage(itemsPerPage) {
    ItemsPerPage = itemsPerPage;
    renderPage();
  }

  function renderSettingsPage() {
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-buttons').style.display = 'none';
    document.getElementById('settings-modal').style.display = 'block';

    document.getElementById('theme-select').value = CurrentTheme;
    document.getElementById('items-per-page-input').value = ItemsPerPage;
  }

  function saveSettings() {
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
  }

function renderPage() {
    SelectedItems.clear();
    updateDeleteAllButton();

    if(CurrentView == CurrentViewEnum.BOOKMARKS || CurrentView == CurrentViewEnum.DUPLICATE_BOOKMARKS || CurrentView == CurrentViewEnum.EMPTY_FOLDERS){
        showLoading(); // Show loading message, making UI a bit busy
        document.getElementById('back-button').style.display = 'block';
        document.getElementById('home-buttons').style.display = 'none';
        document.getElementById('searchBar').style.display = 'block';
    }

    const actionStrings = {
        [CurrentViewEnum.BOOKMARKS]: actionStrAllBookmark,
        [CurrentViewEnum.DUPLICATE_BOOKMARKS]: actionStrDuplicateBookmark,
        [CurrentViewEnum.EMPTY_FOLDERS]: actionStrEmptyFolder,
      };
      
      const actionString = actionStrings[CurrentView];

    if(CurrentView == CurrentViewEnum.HOME){
        CurrentPage = 1;
        TotalPages = 1;
        renderHomePage();
        return;
    } else if(CurrentView == CurrentViewEnum.SETTINGS){
        renderSettingsPage();
        return;
    }

    const resultDiv = document.getElementById('result');

    loadItems(actionString).then(() => {
        const filteredItems = applySearchFilter(ItemsList); // Apply the filter to get filtered results
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
            if(filteredItems.length == ItemsList.length){
                document.getElementById('total-filtered-items').style.display = 'none';
            }
            else{
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
                        alert(`Selected ${CurrentView} deleted!`);
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

function loadItems(actionString) {
    return new Promise((resolve, reject) => {
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            chrome.runtime.sendMessage({ action: actionString }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    displayError("Error finding duplicates: " + chrome.runtime.lastError.message);
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
                resolve();
            });
        } catch (error) {
            console.error("Unexpected error:", error);
            displayError("Unexpected error occurred.");
            reject(error);
        }
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
                        alert(`Selected ${CurrentView} deleted!`);
                        renderPage();
                    }
                });
            } else {
                // If the bookmark is not a folder, remove it with remove
                chrome.bookmarks.remove(id, () => {
                    removedCount++;
                    if (removedCount === bookmarkIds.length) {
                        SelectedItems.clear();
                        alert(`Selected ${CurrentView} deleted!`);
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
  }
