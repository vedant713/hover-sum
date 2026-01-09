/**
 * Content script for YouTube Video Summarizer
 * Detects hover on video thumbnails and shows summaries
 */

// State management
let tooltip = null;
let hoverTimer = null;
let currentVideoId = null;
let lastMousePosition = { x: 0, y: 0 };

// Configuration
const HOVER_DELAY_MS = 500;

/**
 * Initialize the extension
 */
function init() {
    console.log('YouTube Video Summarizer: Initializing...');

    // Initialize tooltip - check both global and window scope
    try {
        const TooltipClass = window.SummaryTooltip || (typeof SummaryTooltip !== 'undefined' ? SummaryTooltip : null);

        if (!TooltipClass) {
            console.error('YouTube Video Summarizer: SummaryTooltip class not available');
            // Retry after a short delay
            setTimeout(init, 500);
            return;
        }

        tooltip = new TooltipClass();
        console.log('YouTube Video Summarizer: Tooltip initialized successfully');
    } catch (error) {
        console.error('YouTube Video Summarizer: Failed to initialize tooltip:', error);
        return;
    }

    // Observe DOM changes for dynamically loaded content
    observeDOMChanges();

    // Attach event listeners to existing thumbnails
    attachListeners();

    console.log('YouTube Video Summarizer: Ready!');
}

/**
 * Observe DOM changes to detect new thumbnails
 */
function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
        // Debounce attachment to avoid excessive processing
        if (hoverTimer === null) {
            setTimeout(attachListeners, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Attach event listeners to video thumbnails
 */
function attachListeners() {
    // Find all video thumbnail links
    const thumbnails = findVideoThumbnails();

    thumbnails.forEach(thumbnail => {
        // Skip if already has listener
        if (thumbnail.dataset.ytSummarizerAttached) {
            return;
        }

        thumbnail.dataset.ytSummarizerAttached = 'true';

        thumbnail.addEventListener('mouseenter', handleMouseEnter);
        thumbnail.addEventListener('mouseleave', handleMouseLeave);
        thumbnail.addEventListener('mousemove', handleMouseMove);
    });
}

/**
 * Find all video thumbnail elements on the page
 */
function findVideoThumbnails() {
    const selectors = [
        'a#thumbnail.ytd-thumbnail',                    // Standard thumbnails
        'a.ytd-thumbnail',                              // General thumbnails
        'a#thumbnail.ytd-video-preview',                // Preview thumbnails
        'ytd-playlist-thumbnail a',                     // Playlist thumbnails
        'a.ytd-grid-video-renderer',                    // Grid view
        'a.ytd-compact-video-renderer',                 // Compact view
        'ytd-rich-item-renderer a#thumbnail'            // Rich grid (home page)
    ];

    const elements = [];
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            // Only include elements with video links
            if (el.href && (el.href.includes('/watch?v=') || el.href.includes('/shorts/'))) {
                elements.push(el);
            }
        });
    });

    return elements;
}

/**
 * Extract video ID from thumbnail link
 */
function extractVideoId(element) {
    const href = element.href;

    if (!href) {
        return null;
    }

    // Match /watch?v=VIDEO_ID
    let match = href.match(/[?&]v=([^&]+)/);
    if (match) {
        return match[1];
    }

    // Match /shorts/VIDEO_ID
    match = href.match(/\/shorts\/([^?&]+)/);
    if (match) {
        return match[1];
    }

    return null;
}

/**
 * Handle mouse enter on thumbnail
 */
function handleMouseEnter(event) {
    const element = event.currentTarget;
    const videoId = extractVideoId(element);

    if (!videoId) {
        return;
    }

    // Cancel any existing timer
    if (hoverTimer) {
        clearTimeout(hoverTimer);
    }

    // Start new hover timer
    hoverTimer = setTimeout(() => {
        showSummary(videoId, lastMousePosition.x, lastMousePosition.y);
    }, HOVER_DELAY_MS);
}

/**
 * Handle mouse leave from thumbnail
 */
function handleMouseLeave(event) {
    // Cancel hover timer
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }

    // Hide tooltip
    if (tooltip) {
        tooltip.hide();
    }
    currentVideoId = null;
}

/**
 * Handle mouse move to track position
 */
function handleMouseMove(event) {
    lastMousePosition = {
        x: event.clientX,
        y: event.clientY
    };

    // Update tooltip position if visible
    if (tooltip && tooltip.isVisible) {
        tooltip.position(event.clientX, event.clientY);
    }
}

/**
 * Show summary for video
 */
async function showSummary(videoId, x, y) {
    // Safety check
    if (!tooltip) {
        return;
    }

    // Check if already showing this video
    if (currentVideoId === videoId && tooltip.isVisible) {
        return;
    }

    currentVideoId = videoId;

    // Show loading state
    tooltip.showLoading('Loading summary...', null);
    tooltip.position(x, y);

    try {
        // Request summary from background script
        const response = await chrome.runtime.sendMessage({
            action: 'getSummary',
            videoId: videoId
        });

        // Check if user moved away while loading
        if (currentVideoId !== videoId) {
            return;
        }

        if (response.error) {
            tooltip.showError(response.error, response.needsSetup);
            tooltip.position(x, y);
            return;
        }

        if (response.success) {
            // Add provider badge to show which AI generated the summary
            const provider = response.provider || 'unknown';
            const providerInfo = ` <span style="font-size: 10px; opacity: 0.7; margin-left: 8px;">(${provider.toUpperCase()})</span>`;

            // Modify data to include provider badge in metadata
            const dataWithProvider = {
                ...response.data,
                providerInfo
            };

            tooltip.showSummary(dataWithProvider, response.fromCache);
            tooltip.position(x, y);
        }

    } catch (error) {
        console.error('Failed to get summary:', error);

        if (currentVideoId === videoId) {
            tooltip.showError('Failed to load summary. Please try again.');
            tooltip.position(x, y);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
