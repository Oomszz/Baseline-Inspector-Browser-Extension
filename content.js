(function() {
  'use strict';
  
  console.log('🔍 Baseline Inspector: Content script initialized');

  if (window.baselineInspectorLoaded) {
    console.log('Content script already loaded, skipping...');
    return;
  }
  window.baselineInspectorLoaded = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'analyze') {
      try {
        const results = analyzeCurrentPage();
        console.log('Analysis complete:', results);
        sendResponse({ success: true, features: results });
      } catch (error) {
        console.error('Analysis error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === 'getFeatures') {
      try {
        const results = analyzeCurrentPage();
        sendResponse({ features: results });
      } catch (error) {
        sendResponse({ features: [] });
      }
      return true;
    }
  });

  function analyzeCurrentPage() {
    console.log('Starting page analysis...');
    
    const featureDatabase = {
      'display: grid': {
        name: 'CSS Grid Layout',
        status: 'widely',
        group: 'css',
        description: 'Two-dimensional layout system for the web',
        element: 'display',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'display:grid': {
        name: 'CSS Grid Layout',
        status: 'widely',
        group: 'css',
        description: 'Two-dimensional layout system for the web',
        element: 'display',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'display: flex': {
        name: 'Flexbox',
        status: 'widely',
        group: 'css',
        description: 'One-dimensional flexible box layout',
        element: 'display',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'display:flex': {
        name: 'Flexbox',
        status: 'widely',
        group: 'css',
        description: 'One-dimensional flexible box layout',
        element: 'display',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'var(--': {
        name: 'CSS Custom Properties',
        status: 'widely',
        group: 'css',
        description: 'CSS variables for reusable values',
        element: 'custom-property',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'transform:': {
        name: 'CSS Transforms',
        status: 'widely',
        group: 'css',
        description: 'Modify element appearance in 2D/3D space',
        element: 'transform',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      '@container': {
        name: 'Container Queries',
        status: 'newly',
        group: 'css',
        description: 'Style elements based on container size',
        element: '@container',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      ':has(': {
        name: ':has() Selector',
        status: 'newly',
        group: 'css',
        description: 'Parent selector based on children',
        element: ':has()',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'subgrid': {
        name: 'CSS Subgrid',
        status: 'newly',
        group: 'css',
        description: 'Nested grid inheriting parent tracks',
        element: 'grid-template',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: false }
      },
      ':is(': {
        name: ':is() Selector',
        status: 'newly',
        group: 'css',
        description: 'Matches any selector in list',
        element: ':is()',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
      },
      'backdrop-filter': {
        name: 'Backdrop Filter',
        status: 'limited',
        group: 'css',
        description: 'Apply filters to backdrop',
        element: 'backdrop-filter',
        browserSupport: { chrome: true, firefox: false, safari: true, edge: true }
      },
      'color-mix': {
        name: 'color-mix()',
        status: 'limited',
        group: 'css',
        description: 'Mix two colors in CSS',
        element: 'color-mix()',
        browserSupport: { chrome: true, firefox: true, safari: true, edge: false }
      },
      '@starting-style': {
        name: '@starting-style',
        status: 'limited',
        group: 'css',
        description: 'Define starting styles for transitions',
        element: '@starting-style',
        browserSupport: { chrome: true, firefox: false, safari: false, edge: false }
      }
    };

    const foundFeatures = [];
    const seenFeatures = new Set();

    // Analyze stylesheets
    try {
      const stylesheets = Array.from(document.styleSheets);
      console.log(`Analyzing ${stylesheets.length} stylesheets...`);
      
      stylesheets.forEach((sheet, index) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          
          rules.forEach(rule => {
            const cssText = rule.cssText.toLowerCase();
            
            Object.entries(featureDatabase).forEach(([pattern, featureData]) => {
              if (cssText.includes(pattern.toLowerCase())) {
                const featureId = featureData.name.toLowerCase().replace(/\s+/g, '-');
                
                if (!seenFeatures.has(featureId)) {
                  foundFeatures.push({
                    id: featureId,
                    ...featureData
                  });
                  seenFeatures.add(featureId);
                  console.log(`Found: ${featureData.name} (${featureData.status})`);
                }
              }
            });
          });
        } catch (e) {
          console.log(`Could not access stylesheet ${index}:`, e.message);
        }
      });
    } catch (e) {
      console.error('Error analyzing stylesheets:', e);
    }

    // Analyze inline styles
    try {
      const elements = document.querySelectorAll('[style]');
      console.log(`Analyzing ${elements.length} inline styles...`);
      
      elements.forEach(el => {
        const style = el.getAttribute('style').toLowerCase();
        
        Object.entries(featureDatabase).forEach(([pattern, featureData]) => {
          if (style.includes(pattern.toLowerCase())) {
            const featureId = featureData.name.toLowerCase().replace(/\s+/g, '-');
            
            if (!seenFeatures.has(featureId)) {
              foundFeatures.push({
                id: featureId,
                ...featureData
              });
              seenFeatures.add(featureId);
              console.log(`Found in inline: ${featureData.name} (${featureData.status})`);
            }
          }
        });
      });
    } catch (e) {
      console.error('Error analyzing inline styles:', e);
    }

    console.log(`Total features found: ${foundFeatures.length}`, foundFeatures);
    return foundFeatures;
  }

  console.log('Content script ready and listening');

})();