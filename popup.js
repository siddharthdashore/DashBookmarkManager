import { showLoading, hideLoading, renderHomePage, displayError, addGlobalEventListeners, debounce } from './utils.js';

const itemsPerPage = 10;
let currentPage = 1;
let totalPages = 1;
let duplicates = [];
let filteredDuplicates = []; // Holds filtered results for the search bar
let selectedBookmarks = new Set();
let currentView = ''; // Add a new variable to keep track of the current view

document.addEventListener('DOMContentLoaded', () => {
    addGlobalEventListeners();
});

document.getElementById('deleteAll').addEventListener('click', () => {
    deleteSelectedBookmarks();
});

function loadDuplicates() {
    try {
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
            duplicates = response.duplicates || [];
            filteredDuplicates = duplicates; // Initialize filtered duplicates
            updateCounts();
            totalPages = Math.ceil(filteredDuplicates.length / itemsPerPage);
            renderPage(currentPage); // Render immediately on load
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        displayError("Unexpected error occurred.");
    }
}

function filterDuplicatesBySearchTerm(searchTerm) {
    const searchTermLower = searchTerm.toLowerCase();
    filteredDuplicates = duplicates.filter(
        ({ title, url, folderPath }) =>
            (title && title.toLowerCase().includes(searchTermLower)) ||
            (url && url.toLowerCase().includes(searchTermLower)) ||
            (folderPath && folderPath.toLowerCase().includes(searchTermLower))
    );
    currentPage = 1;
    totalPages = Math.ceil(filteredDuplicates.length / itemsPerPage);
    renderPage(currentPage);
    updateDeleteAllButton();
}

function updateCounts() {
    const totalUrls = filteredDuplicates.length;
    const totalDuplicates = new Set(filteredDuplicates.map(({ url }) => url)).size;

    document.getElementById('total-urls').textContent = `Total URLs: ${totalUrls}`;
    document.getElementById('total-duplicates').textContent = `Total Duplicates: ${totalDuplicates}`;
}

function updateDeleteAllButton() {
    const deleteAllButton = document.getElementById('deleteAll');
    deleteAllButton.style.display = selectedBookmarks.size <= 1 ? 'none' : 'block';
}

document.getElementById('back-button').addEventListener('click', () => {
    currentView = '';
    renderPage(currentPage);
});

// Add event listeners to the buttons
document.getElementById('bookmarks-button').addEventListener('click', () => {
    currentView = 'bookmarks';
    renderBookmarksPage(currentView);
});
document.getElementById('duplicates-button').addEventListener('click', () => {
    currentView = 'duplicates';
    renderDuplicatesPage(currentView);
});
document.getElementById('empty-folders-button').addEventListener('click', () => {
    currentView = 'empty-folders';
    renderEmptyFoldersPage(currentView);
});


function renderPage(pageNumber) {
    switch (currentView) {
        case 'duplicates':
            renderDuplicatesPage(pageNumber);
            break;
        case 'empty-folders':
            renderEmptyFoldersPage(pageNumber);
            break;
        case 'bookmarks':
            renderBookmarksPage(pageNumber);
            break;
        default:
            renderHomePage();
            break;
    }
}

// New function to render the duplicates page
function renderDuplicatesPage(page) {
    // Show the search bar and delete all selected button
    document.getElementById('searchBar').style.display = 'block';
    document.getElementById('total-urls').style.display = 'block';
    document.getElementById('total-duplicates').style.display = 'block';
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-buttons').style.display = 'none';
    updateDeleteAllButton();

    showLoading(); // Show loading message
    loadDuplicates(); // Automatically load duplicates on launch

    const searchInput = document.getElementById('searchBar');
    const performSearch = (query) => {
        filterDuplicatesBySearchTerm(query);
    };

    const debouncedSearch = debounce((event) => performSearch(event.target.value), 300);
    searchInput.addEventListener('input', debouncedSearch);

    const resultDiv = document.getElementById('result');
    const filteredDuplicates = applySearchFilter(duplicates); // Apply the filter to get filtered results

    if (filteredDuplicates.length === 0) {
        resultDiv.innerHTML = "<p class='text-center'>No duplicate bookmarks found.</p>";
        document.getElementById('pagination-controls').style.display = "none"; // Hide pagination
        return;
    }

    document.getElementById('pagination-controls').style.display = "flex"; // Show pagination
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
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
        const isChecked = selectedBookmarks.has(bookmark.id) ? "checked" : "";
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
    updateDeleteAllButton();

    table += `</tbody></table>`;
    resultDiv.innerHTML = table;

    document.getElementById('selectAll').addEventListener('click', (event) => {
        const isChecked = event.target.checked;
        document.querySelectorAll('.select-bookmark').forEach((checkbox) => {
            checkbox.checked = isChecked;
            const bookmarkId = checkbox.dataset.id;
            if (isChecked) {
                selectedBookmarks.add(bookmarkId);
            } else {
                selectedBookmarks.delete(bookmarkId);
            }
        });
        updateDeleteAllButton(); // Update the Delete All button state
    });

    document.querySelectorAll('.select-bookmark').forEach((checkbox) => {
        checkbox.addEventListener('click', (event) => {
            const bookmarkId = event.target.dataset.id;
            if (event.target.checked) {
                selectedBookmarks.add(bookmarkId);
            } else {
                selectedBookmarks.delete(bookmarkId);
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
                loadDuplicates();
            });
        });
    });

    updatePagination();
}

function renderBookmarksPage(page) {
    // TO DO: implement rendering of empty folders page
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-buttons').style.display = 'none';


}

// New function to render the empty folders page
function renderEmptyFoldersPage(page) {
    // TO DO: implement rendering of empty folders page
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-buttons').style.display = 'none';

}

function applySearchFilter(items) {
    const searchBar = document.getElementById('searchBar'); // Assuming there is a search bar
    const filterText = searchBar ? searchBar.value.toLowerCase() : "";

    return items.filter((item) =>
        item.title.toLowerCase().includes(filterText) || item.url.toLowerCase().includes(filterText)
    );
}

function deleteSelectedBookmarks() {
    const bookmarkIds = Array.from(selectedBookmarks);
    let removedCount = 0;

    bookmarkIds.forEach((id) => {
        chrome.bookmarks.remove(id, () => {
            removedCount++;
            if (removedCount === bookmarkIds.length) {
                selectedBookmarks.clear();
                alert('Selected bookmarks deleted!');
                loadDuplicates();
            }
        });
    });
}

function updatePagination() {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        const pageItem = document.createElement('li');
        pageItem.classList.add('page-item');

        if (pageNumber === currentPage) {
            pageItem.classList.add('active');
        }

        pageItem.innerHTML = `<a class="page-link" href="#">${pageNumber}</a>`;
        pageItem.addEventListener('click', () => {
            currentPage = pageNumber;
            renderPage(currentPage);
        });

        paginationControls.appendChild(pageItem);
    }
}
