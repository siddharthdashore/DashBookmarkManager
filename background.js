// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Dash Bookmark Manager Installed");
});

// Message listener should be at the top level
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   if (request.action === "findDuplicates") {
    chrome.bookmarks.getTree(async (bookmarks) => {
      const bookmarkUrls = new Map();
      const duplicates = [];

      const getFolderPath = async (node) => {
        const path = [];
        while (node.parentId) {
          const parentNodes = await new Promise((resolve) => {
            chrome.bookmarks.get(node.parentId, resolve);
          });
          if (chrome.runtime.lastError) {
            console.error("Error getting parent node:", chrome.runtime.lastError);
            return;
          }
          path.unshift(parentNodes[0].title);
          node = parentNodes[0];
        }
        return path.join(" -> ");
      };

      const traverseBookmarks = async (bookmarkNodes, visitedNodes = new Set()) => {
        for (const node of bookmarkNodes) {
          if (node.url) {
            try {
              const folderPath = await getFolderPath(node);
              const nodesWithUrl = bookmarkUrls.get(node.url) || [];
              bookmarkUrls.set(node.url, [...nodesWithUrl, { ...node, folderPath }]);
            } catch (error) {
              console.error("Error traversing bookmark:", error);
            }
          }

          if (node.children && !visitedNodes.has(node.id)) {
            try {
              visitedNodes.add(node.id);
              await traverseBookmarks(node.children, visitedNodes);
            } catch (error) {
              console.error("Error traversing bookmark children:", error);
            }
          }
        }
      };

      try {
        await traverseBookmarks(bookmarks);
        // Collect duplicates
        for (const [url, nodes] of bookmarkUrls) {
          if (nodes.length > 1) {
            duplicates.push(...nodes);
          }
        }
        sendResponse({ duplicates });
      } catch (error) {
        console.error("Error processing bookmarks:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "findEmptyFolders") {
    chrome.bookmarks.getTree(async (bookmarks) => {
      const emptyFolders = [];

      const getFolderPath = async (node) => {
        const path = [];
        while (node.parentId) {
          const parentNodes = await new Promise((resolve) => {
            chrome.bookmarks.get(node.parentId, resolve);
          });
          if (chrome.runtime.lastError) {
            console.error("Error getting parent node:", chrome.runtime.lastError);
            return;
          }
          path.unshift(parentNodes[0].title);
          node = parentNodes[0];
        }
        return path.join(" -> ") || node.title; // Return node.title if path is empty
      };

      const traverseBookmarks = async (bookmarkNodes, visitedNodes = new Set()) => {
        for (const node of bookmarkNodes) {
          if (node.children && node.children.length === 0) {
            try {
              const folderPath = await getFolderPath(node);
              emptyFolders.push({
                id: node.id,
                title: node.title,
                url: '',
                folderPath: folderPath || '',
              });
            } catch (error) {
              console.error("Error getting folder path:", error);
            }
          }

          if (node.children && !visitedNodes.has(node.id)) {
            try {
              visitedNodes.add(node.id);
              await traverseBookmarks(node.children, visitedNodes);
            } catch (error) {
              console.error("Error traversing bookmark children:", error);
            }
          }
        }
      };

      try {
        await traverseBookmarks(bookmarks);
        sendResponse({ emptyFolders });
      } catch (error) {
        console.error("Error processing bookmarks:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});
