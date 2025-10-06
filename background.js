// Baseline Inspector Background Service Worker
console.log('Background script starting...');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  // Create context menus with error handling
  try {
    if (chrome.contextMenus) {
      chrome.contextMenus.create({
        id: 'analyze-page',
        title: 'Analyze page for Baseline features',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'clear-highlights',
        title: 'Clear feature highlights',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'toggle-highlights',
        title: 'Toggle feature highlights',
        contexts: ['page']
      });
    }
  } catch (error) {
    console.log('Context menus not available:', error);
  }

  if (details.reason === 'install') {
    // Set badge for new installation
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 5000);
  }
});

// Handle context menu clicks
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      switch (info.menuItemId) {
        case 'analyze-page':
          await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
          break;
        case 'clear-highlights':
          await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
          break;
        case 'toggle-highlights':
          await chrome.tabs.sendMessage(tab.id, { action: 'toggleHighlights' });
          break;
      }
    } catch (error) {
      console.error('Context menu action failed:', error);
      // Try to inject content script if it's not loaded
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Retry the action
        await chrome.tabs.sendMessage(tab.id, { 
          action: info.menuItemId === 'analyze-page' ? 'analyze' : 
                  info.menuItemId === 'clear-highlights' ? 'clearHighlights' : 'toggleHighlights'
        });
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
      }
    }
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.action === "toggleExtension") {
        // your toggle logic here
        sendResponse({status: "success"});
    }
    return true; // important for async responses
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge' && sender.tab) {
    const count = request.count || 0;
    if (count > 0) {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: count.toString()
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#3B82F6'
      });
    } else {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: ''
      });
    }
  }
  return true;
});

console.log('Background script initialized successfully');