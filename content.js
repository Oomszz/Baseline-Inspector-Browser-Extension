(function () {
  'use strict';

  console.log('🔍 Baseline Inspector: Enhanced Content Script Initialized');

  if (window.baselineInspectorLoaded) {
    console.log('Content script already loaded, skipping...');
    return;
  }
  window.baselineInspectorLoaded = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    if (request.action === 'analyze') {
      (async () => {
        try {
          const results = await analyzeCurrentPage();
          console.log('✅ Full Analysis Complete:', results);
          sendResponse({ success: true, features: results });
        } catch (error) {
          console.error('❌ Analysis error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    if (request.action === 'getFeatures') {
      (async () => {
        try {
          const results = await analyzeCurrentPage();
          sendResponse({ features: results });
        } catch (error) {
          sendResponse({ features: [] });
        }
      })();
      return true;
    }
  });

  async function analyzeCurrentPage() {
    console.log('Starting full page analysis...');

    const cssFeatures = analyzeCSSFeatures();
    const htmlFeatures = analyzeHTMLFeatures();
    const jsFeatures = await analyzeJSFeatures();

    const combined = [...cssFeatures, ...htmlFeatures, ...jsFeatures];
    console.log(`📊 Combined Feature Count: ${combined.length}`);

    return combined;
  }

  // -------------------- 🧩 CSS ANALYSIS (Existing) --------------------
  function analyzeCSSFeatures() {
    const featureDatabase = {
      'display: grid': {
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
      'var(--': {
        name: 'CSS Custom Properties',
        status: 'widely',
        group: 'css',
        description: 'CSS variables for reusable values',
        element: 'custom-property',
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
      'backdrop-filter': {
        name: 'Backdrop Filter',
        status: 'limited',
        group: 'css',
        description: 'Apply filters to backdrop',
        element: 'backdrop-filter',
        browserSupport: { chrome: true, firefox: false, safari: true, edge: true }
      }
    };

    const foundFeatures = [];
    const seenFeatures = new Set();

    try {
      const stylesheets = Array.from(document.styleSheets);
      stylesheets.forEach((sheet, index) => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            const cssText = rule.cssText.toLowerCase();
            Object.entries(featureDatabase).forEach(([pattern, featureData]) => {
              if (cssText.includes(pattern)) {
                const id = featureData.name.toLowerCase().replace(/\s+/g, '-');
                if (!seenFeatures.has(id)) {
                  foundFeatures.push({ id, ...featureData });
                  seenFeatures.add(id);
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

    // Inline styles
    try {
      const elements = document.querySelectorAll('[style]');
      elements.forEach(el => {
        const style = el.getAttribute('style').toLowerCase();
        Object.entries(featureDatabase).forEach(([pattern, featureData]) => {
          if (style.includes(pattern)) {
            const id = featureData.name.toLowerCase().replace(/\s+/g, '-');
            if (!seenFeatures.has(id)) {
              foundFeatures.push({ id, ...featureData });
              seenFeatures.add(id);
            }
          }
        });
      });
    } catch (e) {
      console.error('Error analyzing inline styles:', e);
    }

    console.log(`🎨 CSS features found: ${foundFeatures.length}`);
    return foundFeatures;
  }

  // -------------------- 🧱 HTML ANALYSIS --------------------
  function analyzeHTMLFeatures() {
    const htmlFeatures = [];
    const seen = new Set();

    const allElements = Array.from(document.querySelectorAll('*'));
    const uniqueTags = [...new Set(allElements.map(el => el.tagName.toLowerCase()))];

    const tagCategory = {
      widely: ['div', 'span', 'a', 'p', 'input', 'button', 'img'],
      newly: ['dialog', 'template', 'slot', 'picture', 'video', 'audio'],
      limited: ['marquee', 'blink']
    };

    uniqueTags.forEach(tag => {
      let status = 'widely';
      if (tagCategory.newly.includes(tag)) status = 'newly';
      if (tagCategory.limited.includes(tag)) status = 'limited';

      const id = `html-${tag}`;
      if (!seen.has(id)) {
        htmlFeatures.push({
          id,
          name: `<${tag}> element`,
          status,
          group: 'html',
          description: `HTML ${tag} element`,
          element: tag,
          browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
        });
        seen.add(id);
      }
    });

    console.log(`🧩 HTML features found: ${htmlFeatures.length}`);
    return htmlFeatures;
  }

  // -------------------- ⚙️ JS ANALYSIS --------------------
  async function analyzeJSFeatures() {
    const jsResults = [];
    const seen = new Set();
    const scripts = Array.from(document.querySelectorAll('script'));

    for (const script of scripts) {
      let code = '';
      try {
        if (script.src) {
          const res = await fetch(script.src);
          code = await res.text();
        } else {
          code = script.textContent;
        }

        const checks = [
          { pattern: 'fetch(', name: 'Fetch API', status: 'widely' },
          { pattern: 'Promise', name: 'Promises', status: 'widely' },
          { pattern: 'async ', name: 'Async/Await', status: 'newly' },
          { pattern: 'navigator.serviceWorker', name: 'Service Workers', status: 'newly' },
          { pattern: 'BigInt', name: 'BigInt', status: 'limited' },
          { pattern: 'WebSocket', name: 'WebSockets', status: 'widely' }
        ];

        for (const { pattern, name, status } of checks) {
          if (code.includes(pattern) && !seen.has(name)) {
            jsResults.push({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name,
              status,
              group: 'js',
              description: `${name} feature detected in script`,
              element: 'script',
              browserSupport: { chrome: true, firefox: true, safari: true, edge: true }
            });
            seen.add(name);
          }
        }
      } catch (err) {
        console.warn('⚠️ JS analysis failed for', script.src || 'inline script', err.message);
      }
    }

    console.log(`🧠 JS features found: ${jsResults.length}`);
    return jsResults;
  }

  console.log('✅ Baseline Inspector Content Script Ready');
})();
