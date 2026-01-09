/**
 * Context Menu Helper - Minimal content script
 * This is a lightweight script that only helps with context menu video detection
 * The heavy lifting is done in the side panel, avoiding injection issues!
 */

// Track hovered video for context menu
let lastHoveredVideoId = null;
let lastHoveredVideoTitle = null;

// Listen for hover on video thumbnails
document.addEventListener('mouseover', (event) => {
    const thumbnail = findThumbnailAncestor(event.target);

    if (thumbnail) {
        const videoId = extractVideoId(thumbnail.href);
        if (videoId) {
            lastHoveredVideoId = videoId;
            lastHoveredVideoTitle = findVideoTitle(thumbnail) || 'YouTube Video';
        }
    }
}, { passive: true });

// Listen for context menu (right-click)
document.addEventListener('contextmenu', (event) => {
    const thumbnail = findThumbnailAncestor(event.target);

    if (thumbnail) {
        const videoId = extractVideoId(thumbnail.href);
        const title = findVideoTitle(thumbnail) || 'YouTube Video';

        if (videoId) {
            // Send video info to background script
            chrome.runtime.sendMessage({
                action: 'setContextMenuVideo',
                videoId: videoId,
                title: title
            });
        }
    }
}, { passive: true });

/**
 * Find the thumbnail link ancestor
 */
function findThumbnailAncestor(element) {
    let current = element;
    let depth = 0;

    while (current && depth < 10) {
        if (current.href && (current.href.includes('/watch?v=') || current.href.includes('/shorts/'))) {
            return current;
        }
        current = current.parentElement;
        depth++;
    }

    return null;
}

/**
 * Extract video ID from URL
 */
function extractVideoId(url) {
    if (!url) return null;

    // Match /watch?v=VIDEO_ID
    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    // Match /shorts/VIDEO_ID
    match = url.match(/\/shorts\/([^?&]+)/);
    if (match) return match[1];

    return null;
}

/**
 * Find video title near the thumbnail
 */
function findVideoTitle(thumbnail) {
    // Try to find the title element in the same container
    const container = thumbnail.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer');

    if (container) {
        const titleElement = container.querySelector('#video-title, .title, yt-formatted-string#video-title');
        if (titleElement) {
            return titleElement.textContent?.trim();
        }
    }

    // Fallback: try aria-label
    const img = thumbnail.querySelector('img');
    if (img?.alt) {
        return img.alt;
    }

    return null;
}

console.log('YouTube Video Summarizer: Context menu helper ready');
