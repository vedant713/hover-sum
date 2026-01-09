/**
 * Options page script for YouTube Video Summarizer
 */

// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadCacheStats();
});

// Save button
document.getElementById('saveBtn').addEventListener('click', saveSettings);

// Test providers button
document.getElementById('testProvidersBtn').addEventListener('click', testProviders);

// Clear cache button
document.getElementById('clearCacheBtn').addEventListener('click', clearCache);

/**
 * Load settings from storage
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get({
            apiKey: '',
            openRouterApiKey: '',
            openRouterModel: '',
            deepSeekApiKey: '',
            ollamaUrl: '',
            ollamaModel: 'llama3.2',
            hoverDelay: 500
        });

        document.getElementById('apiKey').value = result.apiKey;
        document.getElementById('openRouterApiKey').value = result.openRouterApiKey;
        document.getElementById('openRouterModel').value = result.openRouterModel;
        document.getElementById('deepSeekApiKey').value = result.deepSeekApiKey;
        document.getElementById('ollamaUrl').value = result.ollamaUrl;
        document.getElementById('ollamaModel').value = result.ollamaModel;
        document.getElementById('hoverDelay').value = result.hoverDelay;

    } catch (error) {
        console.error('Failed to load settings:', error);
        showStatus('Failed to load settings', 'error');
    }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const openRouterApiKey = document.getElementById('openRouterApiKey').value.trim();
    const openRouterModel = document.getElementById('openRouterModel').value.trim();
    const deepSeekApiKey = document.getElementById('deepSeekApiKey').value.trim();
    const ollamaUrl = document.getElementById('ollamaUrl').value.trim();
    const ollamaModel = document.getElementById('ollamaModel').value.trim() || 'llama3.2';
    const hoverDelay = parseInt(document.getElementById('hoverDelay').value);

    // Validate that at least one provider is configured
    if (!apiKey && !openRouterApiKey && !deepSeekApiKey && !ollamaUrl) {
        showStatus('Please configure at least one AI provider', 'error');
        return;
    }

    // Validate hover delay
    if (isNaN(hoverDelay) || hoverDelay < 100 || hoverDelay > 2000) {
        showStatus('Hover delay must be between 100 and 2000 milliseconds', 'error');
        return;
    }

    try {
        await chrome.storage.sync.set({
            apiKey: apiKey,
            openRouterApiKey: openRouterApiKey,
            openRouterModel: openRouterModel,
            deepSeekApiKey: deepSeekApiKey,
            ollamaUrl: ollamaUrl,
            ollamaModel: ollamaModel,
            hoverDelay: hoverDelay
        });

        showStatus('Settings saved successfully!', 'success');

    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('Failed to save settings', 'error');
    }
}

/**
 * Clear cache
 */
async function clearCache() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'clearCache'
        });

        if (response.error) {
            showStatus('Failed to clear cache', 'error');
        } else {
            showStatus(`Cleared ${response.cleared} cached summaries`, 'success');
            await loadCacheStats();
        }

    } catch (error) {
        console.error('Failed to clear cache:', error);
        showStatus('Failed to clear cache', 'error');
    }
}

/**
 * Test all configured AI providers
 */
async function testProviders() {
    showStatus('Testing providers...', 'success');

    try {
        // First, save current settings
        await saveSettings();

        // Send test request to background script
        const response = await chrome.runtime.sendMessage({
            action: 'testProviders'
        });

        if (response.error) {
            showStatus('Test failed: ' + response.error, 'error');
            return;
        }

        // Display results
        let message = 'Test Results:\n';
        response.results.forEach(result => {
            const status = result.status === 'success' ? '✅' : '❌';
            message += `\n${status} ${result.provider}: ${result.status === 'success' ? 'Working' : result.error}`;
        });

        alert(message);
        showStatus('Provider test complete', 'success');

    } catch (error) {
        console.error('Failed to test providers:', error);
        showStatus('Test failed: ' + error.message, 'error');
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

        if (response.error) {
            document.getElementById('totalCached').textContent = 'Error';
            document.getElementById('validCached').textContent = 'Error';
            document.getElementById('expiredCached').textContent = 'Error';
        } else {
            document.getElementById('totalCached').textContent = response.total;
            document.getElementById('validCached').textContent = response.valid;
            document.getElementById('expiredCached').textContent = response.expired;
        }

    } catch (error) {
        console.error('Failed to load cache stats:', error);
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}
