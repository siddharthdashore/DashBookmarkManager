// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Dash Bookmark Manager Installed");
});

// Message listener should be at the top level
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findDuplicates") {
    chrome.bookmarks.getTree((bookmarks) => {
      let bookmarkUrls = new Map();
      let duplicates = [];

      function getFolderPath(node, path = []) {
        return new Promise((resolve, reject) => {
          if (node.parentId) {
            chrome.bookmarks.get(node.parentId, (parentNodes) => {
              if (chrome.runtime.lastError) {
                console.error("Error getting parent node:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
              }
              if (parentNodes.length > 0) {
                path.unshift(parentNodes[0].title);
                resolve(getFolderPath(parentNodes[0], path));
              } else {
                resolve(path.join(" -> "));
              }
            });
          } else {
            resolve(path.join(" -> "));
          }
        });
      }

      async function traverseBookmarks(bookmarkNodes, visitedNodes = new Set()) {
        for (const node of bookmarkNodes) {
          if (node && node.url) {
            try {
              const folderPath = await getFolderPath(node);
              const nodesWithUrl = bookmarkUrls.get(node.url) || [];
              bookmarkUrls.set(node.url, [...nodesWithUrl, { ...node, folderPath }]);
            } catch (error) {
              console.error("Error traversing bookmark:", error);
            }
          }

          if (node && node.children && !visitedNodes.has(node.id)) {
            try {
              visitedNodes.add(node.id);
              await traverseBookmarks(node.children, visitedNodes);
            } catch (error) {
              console.error("Error traversing bookmark children:", error);
            }
          }
        }
      }

      traverseBookmarks(bookmarks).then(() => {
        // Collect duplicates
        bookmarkUrls.forEach((nodes, url) => {
          if (nodes.length > 1) {
            duplicates = duplicates.concat(nodes);
          }
        });
        sendResponse({ duplicates });
      }).catch((error) => {
        console.error("Error processing bookmarks:", error);
        sendResponse({ error: error.message });
      });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});