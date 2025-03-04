chrome.runtime.onInstalled.addListener(() => {
    console.log("Bookmark Duplicate Remover Installed");
  
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "findDuplicates") {
        chrome.bookmarks.getTree((bookmarks) => {
          let bookmarkUrls = new Map();
          let duplicates = [];
  
          function getFolderPath(node, path = []) {
            if (node.parentId) {
              path.unshift(node.title);
              return new Promise((resolve) => {
                chrome.bookmarks.get(node.parentId, (parentNodes) => {
                  resolve(getFolderPath(parentNodes[0], path));
                });
              });
            } else {
              return Promise.resolve(path.join(" -> "));
            }
          }
  
          async function traverseBookmarks(bookmarkNodes) {
            for (let node of bookmarkNodes) {
              if (node.url) {
                if (bookmarkUrls.has(node.url)) {
                  let folderPath = await getFolderPath(node);
                  duplicates.push({ ...node, folderPath });
                } else {
                  bookmarkUrls.set(node.url, node.id);
                }
              }
              if (node.children) {
                await traverseBookmarks(node.children);
              }
            }
          }
  
          traverseBookmarks(bookmarks).then(() => {
            sendResponse({ duplicates });
          });
        });
        return true;
      }
    });
  });
  