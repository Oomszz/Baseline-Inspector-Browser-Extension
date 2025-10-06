console.log('Popup script loading...');

class BaselineInspectorPopup {
  constructor() {
    this.currentFilter = 'all';
    this.features = [];
    this.isEnabled = true;
    this.init();
  }

  init() {
    console.log('Popup initializing...');
    this.bindEvents();
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({ isEnabled: true });
      this.isEnabled = result.isEnabled;
      this.updateToggleState();
    } catch (error) {
      console.log('Could not load settings:', error);
    }
  }

  updateToggleState() {
    const toggle = document.getElementById('extensionToggle');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (toggle) toggle.checked = this.isEnabled;
    
    if (statusDot && statusText) {
      if (this.isEnabled) {
        statusDot.className = 'status-dot status-enabled';
        statusText.textContent = 'Extension Enabled';
      } else {
        statusDot.className = 'status-dot status-disabled';
        statusText.textContent = 'Extension Disabled';
      }
    }
  }

  bindEvents() {
    // Extension toggle
    const toggle = document.getElementById('extensionToggle');
    if (toggle) {
      toggle.addEventListener('change', async (e) => {
        this.isEnabled = e.target.checked;
        try {
          await chrome.storage.sync.set({ isEnabled: this.isEnabled });
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
        this.updateToggleState();
      });
    }

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderFeatures();
      });
    });

    // Analyze button - FIXED ID
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeCurrentPage());
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportReport());
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
      });
    }
  }

  async analyzeCurrentPage() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"></path>
        </svg>
        Analyzing...
      `;
      analyzeBtn.disabled = true;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Analyzing tab:', tab.url);

      // Check valid URL
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        alert('Cannot analyze browser internal pages. Try on a regular webpage.');
        this.resetAnalyzeButton();
        return;
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'analyze' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not responding, injecting...');
          this.injectAndAnalyze(tab.id);
        } else {
          console.log('Response:', response);
          if (response && response.success && response.features) {
            this.features = response.features;
            this.renderFeatures();
            this.updateCounts();
          } else {
            this.showEmptyState();
          }
          this.resetAnalyzeButton();
        }
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      this.showEmptyState();
      this.resetAnalyzeButton();
    }
  }

  async injectAndAnalyze(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'analyze' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Still no response:', chrome.runtime.lastError);
            this.showEmptyState();
          } else if (response && response.success && response.features) {
            this.features = response.features;
            this.renderFeatures();
            this.updateCounts();
          } else {
            this.showEmptyState();
          }
          this.resetAnalyzeButton();
        });
      }, 500);
    } catch (error) {
      console.error('Injection failed:', error);
      this.showEmptyState();
      this.resetAnalyzeButton();
    }
  }

  resetAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        Analyze Current Page
      `;
      analyzeBtn.disabled = false;
    }
  }

  renderFeatures() {
    const container = document.getElementById('featureList');
    const emptyState = document.getElementById('emptyState');
    
    if (!container || !emptyState) return;
    
    let filteredFeatures = this.features;
    
    if (this.currentFilter !== 'all') {
      filteredFeatures = this.features.filter(f => f.group === this.currentFilter);
    }

    if (filteredFeatures.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    
    container.innerHTML = filteredFeatures.map(feature => `
      <div class="feature-card ${feature.status}" data-feature="${feature.id}">
        <div class="feature-header">
          <div class="feature-info">
            <h3 class="feature-name">${feature.name}</h3>
            <p class="feature-description">${feature.description}</p>
            <div class="feature-meta">
              <span class="feature-group">${feature.group.toUpperCase()}</span>
              <span class="feature-element">${feature.element}</span>
            </div>
          </div>
          <div class="feature-status">
            <div class="status-indicator ${feature.status}"></div>
          </div>
        </div>
        
        <div class="browser-support">
          <span class="support-label">Browser Support:</span>
          <div class="browser-icons">
            ${this.renderBrowserSupport(feature.browserSupport)}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderBrowserSupport(support) {
    const browsers = [
      { name: 'chrome', label: 'Chrome' },
      { name: 'firefox', label: 'Firefox' },
      { name: 'safari', label: 'Safari' },
      { name: 'edge', label: 'Edge' }
    ];
    
    return browsers.map(browser => {
      const isSupported = support && support[browser.name];
      const icon = isSupported ? '✓' : '✗';
      const statusClass = isSupported ? 'supported' : 'unsupported';
      return `<span class="browser-support ${statusClass}" title="${browser.label}">${icon}</span>`;
    }).join('');
  }

  updateCounts() {
    const counts = this.features.reduce((acc, feature) => {
      acc[feature.status] = (acc[feature.status] || 0) + 1;
      return acc;
    }, {});

    const widelyCount = document.getElementById('widelyCount');
    const newlyCount = document.getElementById('newlyCount');
    const limitedCount = document.getElementById('limitedCount');

    if (widelyCount) widelyCount.textContent = counts.widely || 0;
    if (newlyCount) newlyCount.textContent = counts.newly || 0;
    if (limitedCount) limitedCount.textContent = counts.limited || 0;
  }

  exportReport() {
    if (this.features.length === 0) {
      alert('No features to export. Please analyze a page first.');
      return;
    }

    const report = {
      url: 'Current page',
      timestamp: new Date().toISOString(),
      summary: {
        total: this.features.length,
        widely: this.features.filter(f => f.status === 'widely').length,
        newly: this.features.filter(f => f.status === 'newly').length,
        limited: this.features.filter(f => f.status === 'limited').length
      },
      features: this.features
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `baseline-report-${Date.now()}.json`,
      saveAs: true
    });
  }

  showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const featureList = document.getElementById('featureList');
    
    if (emptyState) emptyState.style.display = 'flex';
    if (featureList) featureList.innerHTML = '';
    
    this.updateCounts();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded, initializing...');
  new BaselineInspectorPopup();
});

console.log('Popup script loaded successfully');