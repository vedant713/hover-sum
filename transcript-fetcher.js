/**
 * YouTube Transcript Fetcher v2
 * Uses multiple methods to reliably fetch video transcripts
 */

class TranscriptFetcher {
    constructor() {
        // YouTube Innertube API configuration
        this.INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        this.INNERTUBE_CLIENT = {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00'
        };
    }

    /**
     * Fetch transcript for a YouTube video
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<object>} Transcript text and metadata
     */
    async fetchTranscript(videoId) {
        console.log(`Fetching transcript for video: ${videoId}`);

        try {
            // Method 1: Try Innertube API (most reliable)
            let transcript = await this._fetchViaInnertube(videoId);
            if (transcript) {
                return {
                    text: transcript,
                    available: true,
                    source: 'innertube'
                };
            }

            // Method 2: Try page scraping as fallback
            transcript = await this._fetchFromVideoPage(videoId);
            if (transcript) {
                return {
                    text: transcript,
                    available: true,
                    source: 'page_scrape'
                };
            }

            console.log('No transcript available for this video');
            return {
                text: null,
                available: false,
                source: null
            };

        } catch (error) {
            console.error('Transcript fetch error:', error);
            return {
                text: null,
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Method 1: Fetch via YouTube Innertube API
     * This is the internal API that YouTube's website uses
     */
    async _fetchViaInnertube(videoId) {
        try {
            // Step 1: Get video player response to find caption tracks
            const playerResponse = await fetch(
                `https://www.youtube.com/youtubei/v1/player?key=${this.INNERTUBE_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        context: {
                            client: this.INNERTUBE_CLIENT
                        },
                        videoId: videoId
                    })
                }
            );

            if (!playerResponse.ok) {
                console.log('Innertube player request failed');
                return null;
            }

            const playerData = await playerResponse.json();

            // Extract caption tracks
            const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

            if (!captionTracks || captionTracks.length === 0) {
                console.log('No caption tracks in player response');
                return null;
            }

            // Select best track (prefer English, manual over auto-generated)
            const selectedTrack = this._selectBestTrack(captionTracks);

            if (!selectedTrack?.baseUrl) {
                console.log('No suitable caption track found');
                return null;
            }

            console.log(`Found caption track: ${selectedTrack.languageCode}`);

            // Step 2: Fetch the actual transcript
            const transcriptResponse = await fetch(selectedTrack.baseUrl + '&fmt=json3');

            if (!transcriptResponse.ok) {
                // Try XML format as fallback
                const xmlResponse = await fetch(selectedTrack.baseUrl);
                if (xmlResponse.ok) {
                    const xml = await xmlResponse.text();
                    return this._parseTranscriptXml(xml);
                }
                return null;
            }

            const transcriptData = await transcriptResponse.json();
            return this._parseTranscriptJson(transcriptData);

        } catch (error) {
            console.error('Innertube fetch error:', error);
            return null;
        }
    }

    /**
     * Method 2: Fetch from video page (fallback)
     */
    async _fetchFromVideoPage(videoId) {
        try {
            const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const response = await fetch(videoPageUrl);
            const html = await response.text();

            // Try to extract caption track URL from page
            const captionUrl = this._extractCaptionUrl(html);

            if (!captionUrl) {
                return null;
            }

            const transcriptResponse = await fetch(captionUrl);
            const transcriptXml = await transcriptResponse.text();

            return this._parseTranscriptXml(transcriptXml);

        } catch (error) {
            console.error('Page scrape error:', error);
            return null;
        }
    }

    /**
     * Extract caption URL from page HTML
     */
    _extractCaptionUrl(html) {
        try {
            // Multiple patterns to find caption URLs
            const patterns = [
                /"captionTracks":\s*\[\s*\{[^}]*"baseUrl":\s*"([^"]+)"/,
                /https:\/\/www\.youtube\.com\/api\/timedtext[^"'\s]+/
            ];

            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    let url = match[1] || match[0];
                    // Clean up escaped characters
                    url = url.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                    return url;
                }
            }

            return null;
        } catch (error) {
            console.error('Caption URL extraction error:', error);
            return null;
        }
    }

    /**
     * Select the best caption track
     */
    _selectBestTrack(tracks) {
        if (!tracks || tracks.length === 0) return null;

        // Priority order:
        // 1. English manual captions
        // 2. English auto-generated
        // 3. Any manual captions
        // 4. Any auto-generated

        const priorities = [
            t => t.languageCode === 'en' && t.kind !== 'asr',
            t => t.languageCode === 'en' && t.kind === 'asr',
            t => t.languageCode?.startsWith('en') && t.kind !== 'asr',
            t => t.languageCode?.startsWith('en'),
            t => t.kind !== 'asr',
            t => true
        ];

        for (const test of priorities) {
            const track = tracks.find(test);
            if (track) return track;
        }

        return tracks[0];
    }

    /**
     * Parse JSON3 format transcript
     */
    _parseTranscriptJson(data) {
        try {
            const events = data.events || [];
            const texts = [];

            for (const event of events) {
                if (event.segs) {
                    for (const seg of event.segs) {
                        if (seg.utf8) {
                            const text = seg.utf8.trim();
                            if (text && text !== '\n') {
                                texts.push(text);
                            }
                        }
                    }
                }
            }

            const transcript = texts.join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            return transcript || null;

        } catch (error) {
            console.error('JSON parse error:', error);
            return null;
        }
    }

    /**
     * Parse XML format transcript
     */
    _parseTranscriptXml(xml) {
        try {
            const textRegex = /<text[^>]*>(.*?)<\/text>/g;
            const texts = [];
            let match;

            while ((match = textRegex.exec(xml)) !== null) {
                const text = match[1]
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\n/g, ' ')
                    .trim();

                if (text) {
                    texts.push(text);
                }
            }

            const transcript = texts.join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            return transcript || null;

        } catch (error) {
            console.error('XML parse error:', error);
            return null;
        }
    }

    /**
     * Fetch video metadata
     */
    async fetchMetadata(videoId) {
        try {
            // Use Innertube API for metadata too
            const response = await fetch(
                `https://www.youtube.com/youtubei/v1/player?key=${this.INNERTUBE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        context: { client: this.INNERTUBE_CLIENT },
                        videoId: videoId
                    })
                }
            );

            if (!response.ok) {
                return this._fetchMetadataFromPage(videoId);
            }

            const data = await response.json();
            const videoDetails = data.videoDetails || {};

            return {
                title: videoDetails.title || null,
                channel: videoDetails.author || null,
                description: videoDetails.shortDescription?.substring(0, 500) || null,
                duration: videoDetails.lengthSeconds || null,
                viewCount: videoDetails.viewCount || null
            };

        } catch (error) {
            console.error('Metadata fetch error:', error);
            return this._fetchMetadataFromPage(videoId);
        }
    }

    /**
     * Fallback: fetch metadata from page
     */
    async _fetchMetadataFromPage(videoId) {
        try {
            const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await response.text();

            return {
                title: this._extractFromHtml(html, /<meta\s+name="title"\s+content="([^"]+)"/i),
                channel: this._extractFromHtml(html, /"author":"([^"]+)"/),
                description: this._extractFromHtml(html, /"description":\{"simpleText":"([^"]+)"/),
                duration: null,
                viewCount: null
            };

        } catch (error) {
            console.error('Page metadata error:', error);
            return { title: null, channel: null, description: null };
        }
    }

    _extractFromHtml(html, regex) {
        const match = html.match(regex);
        return match ? match[1] : null;
    }
}

// Export for service worker
self.TranscriptFetcher = TranscriptFetcher;
