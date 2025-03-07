const itemsPerPage = 10;
let currentPage = 1;
let totalPages = 1;
let duplicates = [];
let filteredDuplicates = []; // Holds filtered results for the search bar
let selectedBookmarks = new Set();

document.addEventListener('DOMContentLoaded', () => {
    showLoading(); // Show loading message
    loadDuplicates(); // Automatically load duplicates on launch

    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    filterDuplicates(searchTerm);
    });
});

function showLoading() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<p class="text-center text-primary">Loading...</p>`;
    }
    
    function hideLoading() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = ""; // Clear the loading message
    }

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

function filterDuplicates(searchTerm) {
  filteredDuplicates = duplicates.filter((bookmark) => {
    return (
      (bookmark.title && bookmark.title.toLowerCase().includes(searchTerm)) ||
      (bookmark.url && bookmark.url.toLowerCase().includes(searchTerm)) ||
      (bookmark.folderPath && bookmark.folderPath.toLowerCase().includes(searchTerm))
    );
  });
  currentPage = 1; // Reset to the first page
  totalPages = Math.ceil(filteredDuplicates.length / itemsPerPage);
  renderPage(currentPage);
  updateDeleteAllButton();

}

function updateCounts() {
  const totalUrlsElement = document.getElementById('total-urls');
  const totalDuplicatesElement = document.getElementById('total-duplicates');
  const totalUrls = duplicates.length;
  const totalDuplicates = duplicates.filter((bookmark, index, self) =>
    index === self.findIndex((t) => t.url === bookmark.url)
  ).length;

  totalUrlsElement.textContent = `Total URLs: ${totalUrls}`;
  totalDuplicatesElement.textContent = `Total Duplicates: ${totalDuplicates}`;
}

function updateDeleteAllButton() {
    const deleteAllButton = document.getElementById('deleteAll');
    //   deleteAllButton.disabled = selectedBookmarks.size === 0; // Disable if none are selected
    deleteAllButton.style.display = selectedBookmarks.size <= 1 ? 'none' : 'block';

}

function displayError(message) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `<p class='text-center text-danger'>Error: ${message}</p>`;
}

document.getElementById('back-button').addEventListener('click', () => {
    currentView = '';
    renderPage(currentPage);
  });

// Add a new variable to keep track of the current view
let currentView = '';

// Modify the renderPage function to conditionally render the table
function renderPage(page) {
  const resultDiv = document.getElementById('result');
  document.getElementById('back-button').style.display = 'none';
  document.getElementById('pagination-controls').style.display = "none";
  document.getElementById('searchBar').style.display = 'none';
  document.getElementById('total-urls').style.display = 'none';
  document.getElementById('total-duplicates').style.display = 'none';
  
  // Render the buttons
  const buttonsHtml = `
      <div style="text-align: center;">
      Find:
      <button id="search-button" class="btn btn-dark">Bookmarks</button>
      <button id="duplicates-button" class="btn btn-dark">Duplicate Bookmarks</button>
      <button id="empty-folders-button" class="btn btn-dark">Empty Folders</button>
    </div>
  `;
  resultDiv.innerHTML = buttonsHtml;
  
  // Add event listeners to the buttons
  document.getElementById('duplicates-button').addEventListener('click', () => {
    currentView = 'duplicates';
    renderDuplicatesPage(page);
  });
  document.getElementById('empty-folders-button').addEventListener('click', () => {
    currentView = 'empty-folders';
    renderEmptyFoldersPage(page);
  });
  
  // Render the initial view
  if (currentView === 'duplicates') {
    renderDuplicatesPage(page);
  }
}

// New function to render the duplicates page
function renderDuplicatesPage(page) {
  // Show the search bar and delete all selected button
  document.getElementById('searchBar').style.display = 'block';
  document.getElementById('deleteAll').style.display = 'block';
  document.getElementById('total-urls').style.display = 'block';
  document.getElementById('total-duplicates').style.display = 'block';
  document.getElementById('back-button').style.display = 'block';

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
        <td><input type="checkbox" class="select-bookmark" data-id="${bookmark.id}" ${isChecked}></td>
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
      const bookmarkId = event.target.dataset.id;
      chrome.bookmarks.remove(bookmarkId, () => {
        alert('Bookmark deleted!');
        loadDuplicates();
      });
      });
  });

  updatePagination();
}

// New function to render the empty folders page
function renderEmptyFoldersPage(page) {
  // TO DO: implement rendering of empty folders page
  document.getElementById('back-button').style.display = 'block';

}

function applySearchFilter(items) {
    const searchBar = document.getElementById('searchBar'); // Assuming there is a search bar
    const filterText = searchBar ? searchBar.value.toLowerCase() : "";
    
    return items.filter((item) =>
        item.title.toLowerCase().includes(filterText) || item.url.toLowerCase().includes(filterText)
    );
    }

function deleteSelectedBookmarks() {
  const bookmarkIdsArray = Array.from(selectedBookmarks);
  let deletionsCount = 0;

  bookmarkIdsArray.forEach((bookmarkId) => {
    chrome.bookmarks.remove(bookmarkId, () => {
      deletionsCount++;
      if (deletionsCount === bookmarkIdsArray.length) {
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

  for (let i = 1; i <= totalPages; i++) {
    const pageItem = document.createElement('li');
    pageItem.classList.add('page-item');
    if (i === currentPage) {
      pageItem.classList.add('active');
    }
    pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    pageItem.addEventListener('click', () => {
      currentPage = i;
      renderPage(currentPage);
    });
    paginationControls.appendChild(pageItem);
  }
}

document.getElementById('close-button').addEventListener('click', () => {
    window.close();
  });