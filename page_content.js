// page_content.js
// This script runs on every page and listens for messages from popup.js

let features = [
  {
    id: "feature-1",
    name: "Video Element",
    description: "HTML5 video element support",
    group: "html",
    element: "video",
    status: "widely",
    browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
  },
  {
    id: "feature-2",
    name: "CSS Grid",
    description: "Modern CSS grid layout",
    group: "css",
    element: "div",
    status: "widely",
    browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
  },
  {
    id: "feature-3",
    name: "ES6 Arrow Functions",
    description: "JavaScript arrow function support",
    group: "js",
    element: "() => {}",
    status: "widely",
    browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
  }
];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getFeatures") {
    sendResponse({ features });
  } else if (msg.action === "analyze") {
    // Simulate async analysis
    setTimeout(() => {
      sendResponse({ features });
    }, 500);
    return true; // Keep the messaging channel open for async
  } else if (msg.action === "toggleExtension") {
    console.log("Extension toggled by popup");
  }
});
