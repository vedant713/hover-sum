/**
 * Side Panel Script for YouTube Video Summarizer
 * This runs in the extension context, NOT as a content script
 * So it completely bypasses content script injection issues!
 */

// Store for recent summaries
let recentSummaries = [];

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('Side panel initialized');

    // Load any recent summaries from storage
    await loadHistory();

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Side panel received message:', message);

        if (message.action === 'showSummary') {
            showSummary(message.data);
        }

        if (message.action === 'showLoading') {
            showLoading(message.title);
        }

        if (message.action === 'showError') {
            showError(message.error);
        }
    });
}

/**
 * Show loading state
 */
function showLoading(title) {
    updateStatus('loading', 'Generating...');

    const container = document.getElementById('summaryContainer');
    const emptyState = document.getElementById('emptyState');

    emptyState.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = `
    <div class="video-card">
      <div class="video-title">${escapeHtml(title || 'Loading video...')}</div>
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-text">AI is analyzing the video...</div>
      </div>
    </div>
  `;
}

/**
 * Show summary result
 */
function showSummary(data) {
    updateStatus('ready', 'Summary Ready');

    const container = document.getElementById('summaryContainer');
    const emptyState = document.getElementById('emptyState');

    emptyState.style.display = 'none';
    container.style.display = 'block';

    const providerEmoji = {
        'gemini': '🤖',
        'deepseek': '🧠',
        'local': '💻'
    };
    const emoji = providerEmoji[data.provider?.toLowerCase()] || '✨';

    // Format summary - handle both string and array
    let summaryText = data.summary;
    if (Array.isArray(summaryText)) {
        summaryText = summaryText.join('\n\n');
    }

    container.innerHTML = `
    <div class="video-card">
      <div class="video-title">${escapeHtml(data.metadata?.title || 'Video Summary')}</div>
      ${data.metadata?.channel ? `<div class="video-channel">${escapeHtml(data.metadata.channel)}</div>` : ''}
      
      <div class="provider-badge">
        ${emoji} ${(data.provider || 'AI').toUpperCase()}
        ${data.fromCache ? ' • Cached' : ''}
      </div>
      
      <div class="summary-section">
        <div class="section-title">Summary</div>
        <div class="summary-text">${escapeHtml(summaryText)}</div>
      </div>
      
      <button class="copy-btn" onclick="copySummary()">
        📋 Copy Summary
      </button>
    </div>
  `;

    // Add to history
    addToHistory(data);
}

/**
 * Show error state
 */
function showError(error) {
    updateStatus('error', 'Error');

    const container = document.getElementById('summaryContainer');
    const emptyState = document.getElementById('emptyState');

    emptyState.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = `
    <div class="video-card" style="border-color: rgba(244, 67, 54, 0.3);">
      <div class="section-title" style="color: #ff8a80;">Error</div>
      <div class="summary-text" style="border-color: #f44336; color: #ff8a80;">
        ${escapeHtml(error)}
      </div>
      <p style="margin-top: 12px; font-size: 12px; color: rgba(255,255,255,0.5);">
        Make sure you have configured at least one AI provider in the extension settings.
      </p>
    </div>
  `;
}

/**
 * Update status badge
 */
function updateStatus(type, text) {
    const badge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');

    badge.className = 'status-badge ' + type;
    statusText.textContent = text;
}

/**
 * Copy summary to clipboard
 */
async function copySummary() {
    const summaryText = document.querySelector('.summary-text')?.textContent;
    if (summaryText) {
        await navigator.clipboard.writeText(summaryText);

        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }
}

/**
 * Add summary to history
 */
async function addToHistory(data) {
    recentSummaries.unshift({
        ...data,
        timestamp: Date.now()
    });

    // Keep only last 10
    recentSummaries = recentSummaries.slice(0, 10);

    // Save to storage
    await chrome.storage.local.set({ recentSummaries });

    // Update UI
    renderHistory();
}

/**
 * Load history from storage
 */
async function loadHistory() {
    try {
        const result = await chrome.storage.local.get('recentSummaries');
        recentSummaries = result.recentSummaries || [];
        renderHistory();
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

/**
 * Render history list
 */
function renderHistory() {
    const section = document.getElementById('historySection');
    const list = document.getElementById('historyList');

    if (recentSummaries.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    list.innerHTML = recentSummaries.map((item, index) => `
    <div class="history-item" onclick="showHistoryItem(${index})">
      <div class="history-title">${escapeHtml(item.metadata?.title || 'Unknown Video')}</div>
      <div class="history-meta">${formatTime(item.timestamp)} • ${item.provider || 'AI'}</div>
    </div>
  `).join('');
}

/**
 * Show a history item
 */
function showHistoryItem(index) {
    const item = recentSummaries[index];
    if (item) {
        showSummary(item);
    }
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.copySummary = copySummary;
window.showHistoryItem = showHistoryItem;
