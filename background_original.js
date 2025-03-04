chrome.runtime.onInstalled.addListener(() => {
    console.log("Bookmark Duplicate Remover Installed");
  
    chrome.bookmarks.getTree((bookmarks) => {
      let bookmarkUrls = new Map();
      let duplicates = [];
  
      function traverseBookmarks(bookmarkNodes) {
        for (let node of bookmarkNodes) {
          if (node.url) {
            if (bookmarkUrls.has(node.url)) {
              duplicates.push(node);
            } else {
              bookmarkUrls.set(node.url, node.id);
            }
          }
          if (node.children) {
            traverseBookmarks(node.children);
          }
        }
      }
  
      traverseBookmarks(bookmarks);
  
      console.log(`Found ${duplicates.length} duplicate(s)`);
      for (let duplicate of duplicates) {
        chrome.bookmarks.remove(duplicate.id, () => {
          console.log(`Deleted duplicate bookmark: ${duplicate.title}`);
        });
      }
    });
  });
  