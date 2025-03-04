document.getElementById('findDuplicates').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "findDuplicates" }, (response) => {
      const resultDiv = document.getElementById('result');
      if (response.duplicates.length === 0) {
        resultDiv.innerHTML = "<p class='text-center'>No duplicate bookmarks found.</p>";
      } else {
        let table = `
          <table class="table table-bordered table-striped">
            <thead class="thead-dark">
              <tr>
                <th>Title</th>
                <th>URL</th>
                <th>Folder Path</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
        `;
        response.duplicates.forEach((bookmark) => {
          table += `
            <tr>
              <td>${bookmark.title}</td>
              <td><a href="${bookmark.url}" target="_blank">${bookmark.url}</a></td>
              <td>${bookmark.folderPath}</td>
              <td><button class="delete-btn" data-id="${bookmark.id}">Delete</button></td>
            </tr>
          `;
        });
        table += `</tbody></table>`;
        resultDiv.innerHTML = table;
  
        document.querySelectorAll('.delete-btn').forEach((button) => {
          button.addEventListener('click', (event) => {
            const bookmarkId = event.target.dataset.id;
            chrome.bookmarks.remove(bookmarkId, () => {
              alert('Bookmark deleted!');
              event.target.closest('tr').remove();
            });
          });
        });
      }
    });
  });
  