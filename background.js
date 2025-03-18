// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Dash Bookmark Manager Installed");
});

// Message listener should be at the top level
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   if (request.action === "findDuplicates") {
    chrome.bookmarks.getTree(async (bookmarks) => {
      const bookmarkUrls = new Map();
      const fetchedBookmarks = [];

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
            fetchedBookmarks.push(...nodes);
          }
        }
        sendResponse({ fetchedBookmarks });
      } catch (error) {
        console.error("Error processing bookmarks:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "findEmptyFolders") {
    chrome.bookmarks.getTree(async (bookmarks) => {
      const fetchedBookmarks = [];

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
              fetchedBookmarks.push({
                id: node.id,
                title: node.title,
                url: 'NA',
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
        sendResponse({ fetchedBookmarks });
      } catch (error) {
        console.error("Error processing bookmarks:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "findAllBookmarks") {
    chrome.bookmarks.getTree(async (bookmarks) => {
      const bookmarkUrls = new Map();
      const fetchedBookmarks = [];

      const getFolderPath = async (node) => {
        const path = [];
        while (node.parentId) {
          const parentNodes = await new Promise((resolve) => {
            chrome.bookmarks.get(node.parentId, resolve);
          });
          if (chrome.runtime.lastError) {
            console.error(
              "Error getting parent node:",
              chrome.runtime.lastError
            );
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
        // Collect all bookmarks
        for (const [url, nodes] of bookmarkUrls) {
            fetchedBookmarks.push(...nodes);
        }
        sendResponse({ fetchedBookmarks });
      } catch (error) {
        console.error("Error processing bookmarks:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "pendingTabsCleanup") {
    chrome.tabs.query({}, async (tabs) => {
        chrome.bookmarks.search({ title: 'Pending Tabs' }, async (results) => {
          let pendingTabsFolder;
          if (results.length > 0) {
            pendingTabsFolder = results[0];
          } else {
            // Create a new Pending Tabs folder if it's not found
            pendingTabsFolder = await new Promise((resolve) => {
              chrome.bookmarks.create({
                title: 'Pending Tabs'
              }, (result) => {
                resolve(result);
              });
            });
          }
      
          // Create a new timestamp folder inside Pending Tabs
        const date = new Date();
        const month = date.toLocaleString('en-GB', { month: 'short' });
        const timestamp = `${date.getDate().toString().padStart(2, '0')}-${month}-${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

          const timestampFolder = await new Promise((resolve) => {
            chrome.bookmarks.create({
              title: timestamp,
              url: '',
              parentId: pendingTabsFolder.id
            }, resolve);
          });
      
          // Get the path of the timestamp folder
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
            return `Pending Tabs -> ${path.join(" -> ")}${node.title}`;
          };
      
          const timestampFolderPath = await getFolderPath(timestampFolder);
      
          // Create a separate folder for pinned tabs only if there are pinned tabs
          let pinnedFolder;
          if (tabs.some((tab) => tab.pinned)) {
            pinnedFolder = await new Promise((resolve) => {
              chrome.bookmarks.create({
                title: 'Pinned',
                url: '',
                parentId: timestampFolder.id
              }, resolve);
            });
          }
      
          // Loop through all tabs and save them as bookmarks
          tabs.forEach((tab) => {
            if (
                tab.url === 'about:blank' ||
                tab.url === 'about:newtab' ||
                tab.url === 'chrome://newtab/' ||
                tab.url === 'chrome://newtab' ||
                tab.url === '' ||
                tab.url === 'https://www.google.com/' ||
                tab.url === 'https://www.google.com'
              ) {
                console.info(`Skipping empty page/new tab/homepage: ${tab.title}`);
                return;
              }
      
            if (tab.pinned) {
              // Save pinned tabs in the Pinned folder
              chrome.bookmarks.create({
                title: tab.title || tab.id,
                url: tab.url || 'https://google.com',
                parentId: pinnedFolder.id
              });
            } else {
              // Save non-pinned tabs in the timestamp folder
              chrome.bookmarks.create({
                title: tab.title || tab.id,
                url: tab.url || 'https://google.com',
                parentId: timestampFolder.id
              });
            }
          });
      
          // Close all tabs
          tabs.forEach((tab) => {
            chrome.tabs.remove(tab.id);
          });
      
          // Open an empty new tab
          chrome.tabs.create({ url: 'chrome://newtab' });
      
          sendResponse({ timestampFolderPath });
        });
      });
    return true;
  }
});