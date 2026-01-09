/**
 * Popup script for YouTube Video Summarizer v2.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    await checkStatus();
    await loadCacheStats();
    setupButtons();
});

/**
 * Set up button handlers
 */
function setupButtons() {
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Open Side Panel button
    document.getElementById('openPanelBtn').addEventListener('click', async () => {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab) {
            // Open side panel
            await chrome.sidePanel.open({ tabId: tab.id });
            // Close popup
            window.close();
        }
    });
}

/**
 * Check extension status - checks for any configured provider
 */
async function checkStatus() {
    try {
        const result = await chrome.storage.sync.get(['apiKey', 'deepSeekApiKey', 'ollamaUrl']);
        const statusEl = document.getElementById('status');
        const messageEl = document.getElementById('statusMessage');

        const hasProvider = result.apiKey || result.deepSeekApiKey || result.ollamaUrl;

        if (hasProvider) {
            statusEl.textContent = 'Ready ✓';
            statusEl.style.color = '#81c784';
            messageEl.textContent = 'Right-click on video thumbnails to summarize!';
            messageEl.className = 'status ready';
        } else {
            statusEl.textContent = 'Not configured';
            statusEl.style.color = '#ffb74d';
            messageEl.textContent = 'Configure an API key in settings';
            messageEl.className = 'status not-ready';
        }
    } catch (error) {
        console.error('Failed to check status:', error);
    }
}

/**
 * Load cache statistics
 */
async function loadCacheStats() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getCacheStats'
        });

        if (response && !response.error) {
            document.getElementById('cacheCount').textContent = response.valid || 0;
        } else {
            document.getElementById('cacheCount').textContent = '0';
        }
    } catch (error) {
        console.error('Failed to load cache stats:', error);
        document.getElementById('cacheCount').textContent = '0';
    }
}
