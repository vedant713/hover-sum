/**
 * Background service worker for YouTube Video Summarizer v2.0
 * Uses Side Panel + Context Menu for reliable summaries!
 */

// Import dependencies with error handling
try {
    importScripts('cache.js', 'transcript-fetcher.js', 'api-manager.js');
    console.log('YouTube Video Summarizer: Dependencies loaded');
} catch (error) {
    console.error('YouTube Video Summarizer: Failed to load dependencies:', error);
}

// Initialize managers
let cache, transcriptFetcher, apiManager;

try {
    cache = new SummaryCache();
    transcriptFetcher = new TranscriptFetcher();
    apiManager = new APIManager();
    console.log('YouTube Video Summarizer: Managers initialized');
} catch (error) {
    console.error('YouTube Video Summarizer: Failed to initialize:', error);
}

// Track the video from context menu
let contextMenuVideoId = null;
let contextMenuVideoTitle = null;

// ==================== Context Menu Setup ====================

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    // Create the context menu item
    chrome.contextMenus.create({
        id: 'summarizeVideo',
        title: '✨ Summarize Video',
        contexts: ['link', 'image', 'video'],
        documentUrlPatterns: ['https://www.youtube.com/*', 'https://m.youtube.com/*']
    });

    console.log('YouTube Video Summarizer: Context menu created');

    // Set side panel options
    chrome.sidePanel.setOptions({
        enabled: true
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'summarizeVideo') {
        let videoId = null;
        let title = contextMenuVideoTitle || 'YouTube Video';

        // Try to extract video ID from link URL
        if (info.linkUrl) {
            videoId = extractVideoId(info.linkUrl);
        }

        // Fallback to the tracked context menu video
        if (!videoId && contextMenuVideoId) {
            videoId = contextMenuVideoId;
        }

        if (videoId) {
            console.log('Summarizing video:', videoId, title);

            // Open side panel
            await chrome.sidePanel.open({ tabId: tab.id });

            // Short delay to ensure panel is ready
            await new Promise(resolve => setTimeout(resolve, 300));

            // Send loading state
            chrome.runtime.sendMessage({
                action: 'showLoading',
                title: title
            }).catch(() => { });

            // Generate summary
            await generateAndShowSummary(videoId, title);
        } else {
            // Notify no video found
            chrome.runtime.sendMessage({
                action: 'showError',
                error: 'Could not detect video. Try right-clicking directly on a video thumbnail.'
            }).catch(() => { });
        }
    }
});

// ==================== Message Handlers ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);

    // Track video from content script
    if (request.action === 'setContextMenuVideo') {
        contextMenuVideoId = request.videoId;
        contextMenuVideoTitle = request.title;
        sendResponse({ ok: true });
        return false;
    }

    // Get summary (for backward compatibility)
    if (request.action === 'getSummary') {
        handleGetSummary(request.videoId)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    // Test providers
    if (request.action === 'testProviders') {
        apiManager.testProviders()
            .then(results => sendResponse({ results }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    // Clear cache
    if (request.action === 'clearCache') {
        cache.clear()
            .then(count => sendResponse({ cleared: count }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    // Get cache stats
    if (request.action === 'getCacheStats') {
        cache.getStats()
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    // Ping/status check
    if (request.action === 'ping' || request.action === 'getStatus') {
        sendResponse({ status: 'ok', version: '2.0.0' });
        return false;
    }

    // Unknown action
    sendResponse({ error: 'Unknown action' });
    return false;
});

// ==================== Summary Generation ====================

/**
 * Generate summary and send to side panel
 */
async function generateAndShowSummary(videoId, title) {
    try {
        // Check for API configuration
        const hasProvider = await checkProviderConfig();
        if (!hasProvider) {
            chrome.runtime.sendMessage({
                action: 'showError',
                error: 'No AI provider configured. Please set up Gemini, DeepSeek, or Ollama in extension settings.'
            }).catch(() => { });
            return;
        }

        // Check cache first
        const cached = await cache.get(videoId);
        if (cached) {
            chrome.runtime.sendMessage({
                action: 'showSummary',
                data: {
                    ...cached,
                    fromCache: true
                }
            }).catch(() => { });
            return;
        }

        // Fetch transcript and metadata
        const [transcriptResult, metadata] = await Promise.all([
            transcriptFetcher.fetchTranscript(videoId),
            transcriptFetcher.fetchMetadata(videoId)
        ]);

        // Build content for AI - use transcript if available, otherwise use title + description
        let contentForAI;
        if (transcriptResult.text && transcriptResult.available) {
            contentForAI = transcriptResult.text;
            console.log('Using transcript for summary');
        } else {
            // Fallback: use title and description
            const videoTitle = metadata.title || title || 'Unknown video';
            const videoDescription = metadata.description || '';
            const channel = metadata.channel || '';

            contentForAI = `VIDEO TITLE: ${videoTitle}\n` +
                `CHANNEL: ${channel}\n` +
                `DESCRIPTION: ${videoDescription}\n\n` +
                `Note: No transcript was available for this video. Please provide a summary based on the title and description above.`;
            console.log('No transcript available, using title/description');
        }

        // Generate summary
        const { summary, provider } = await apiManager.generateSummary(contentForAI);

        // Build result
        const result = {
            summary,
            provider,
            metadata: {
                title: metadata.title || title,
                channel: metadata.channel,
                hasTranscript: transcriptResult.available
            },
            fromCache: false
        };

        // Cache it
        await cache.set(videoId, result);

        // Send to side panel
        chrome.runtime.sendMessage({
            action: 'showSummary',
            data: result
        }).catch(() => { });

    } catch (error) {
        console.error('Summary generation error:', error);
        chrome.runtime.sendMessage({
            action: 'showError',
            error: error.message
        }).catch(() => { });
    }
}

/**
 * Legacy handler for getSummary (popup compatibility)
 */
async function handleGetSummary(videoId) {
    try {
        const hasProvider = await checkProviderConfig();
        if (!hasProvider) {
            return { error: 'No API providers configured', needsSetup: true };
        }

        const cached = await cache.get(videoId);
        if (cached) {
            return { success: true, data: cached, fromCache: true, provider: cached.provider };
        }

        const [transcriptResult, metadata] = await Promise.all([
            transcriptFetcher.fetchTranscript(videoId),
            transcriptFetcher.fetchMetadata(videoId)
        ]);

        const { summary, provider } = await apiManager.generateSummary(transcriptResult.text);

        const result = {
            summary,
            provider,
            metadata: { title: metadata.title, channel: metadata.channel, hasTranscript: transcriptResult.available }
        };

        await cache.set(videoId, result);

        return { success: true, data: result, fromCache: false, provider };

    } catch (error) {
        return { error: error.message };
    }
}

// ==================== Utilities ====================

/**
 * Check if any provider is configured
 */
async function checkProviderConfig() {
    const storage = await chrome.storage.sync.get(['apiKey', 'openRouterApiKey', 'deepSeekApiKey', 'ollamaUrl']);
    return !!(storage.apiKey || storage.openRouterApiKey || storage.deepSeekApiKey || storage.ollamaUrl);
}

/**
 * Extract video ID from URL
 */
function extractVideoId(url) {
    if (!url) return null;

    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    match = url.match(/\/shorts\/([^?&]+)/);
    if (match) return match[1];

    match = url.match(/youtu\.be\/([^?&]+)/);
    if (match) return match[1];

    return null;
}

// ==================== Extension Icon Click ====================

// Open side panel when clicking extension icon
chrome.action.onClicked.addListener(async (tab) => {
    await chrome.sidePanel.open({ tabId: tab.id });
});

console.log('YouTube Video Summarizer v2.0 loaded - Side Panel Edition! 🚀');
