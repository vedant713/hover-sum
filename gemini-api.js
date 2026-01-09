/**
 * Gemini API integration for generating video summaries
 * Uses Google's Generative Language API (Gemini)
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

class GeminiAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Generate a structured summary from video transcript
     * @param {string} transcript - Video transcript text
     * @param {object} metadata - Video metadata (title, channel, description)
     * @returns {Promise<object>} Structured summary with bullets and takeaways
     */
    async generateSummary(transcript, metadata = {}) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        const hasTranscript = transcript && transcript.trim().length > 0;

        const prompt = this._buildPrompt(transcript, metadata, hasTranscript);

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!generatedText) {
                throw new Error('No content generated');
            }

            return this._parseResponse(generatedText, hasTranscript);

        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    /**
     * Build the prompt for Gemini
     */
    _buildPrompt(transcript, metadata, hasTranscript) {
        if (hasTranscript) {
            return `You are a YouTube video summarizer. Analyze the following video transcript and create a concise summary.

Video Title: ${metadata.title || 'Unknown'}
Channel: ${metadata.channel || 'Unknown'}

Transcript:
${transcript}

INSTRUCTIONS:
1. Create 5-8 bullet points summarizing the main content
2. Identify 3 key takeaways or insights
3. Be accurate and specific - only include information explicitly mentioned
4. Do NOT hallucinate or infer details not in the transcript
5. If the transcript is incomplete or unclear, acknowledge it

FORMAT YOUR RESPONSE EXACTLY AS:
SUMMARY:
- [bullet point 1]
- [bullet point 2]
- [bullet point 3]
...

TAKEAWAYS:
1. [takeaway 1]
2. [takeaway 2]
3. [takeaway 3]`;
        } else {
            return `You are a YouTube video analyzer. The transcript for this video is unavailable, but you have metadata.

Video Title: ${metadata.title || 'Unknown'}
Channel: ${metadata.channel || 'Unknown'}
Description: ${metadata.description || 'Not available'}

INSTRUCTIONS:
1. Based ONLY on the title, channel, and description, provide a brief overview
2. Create 3-5 bullet points about what this video LIKELY covers
3. Be clear that this is based on limited information, NOT the actual content
4. Do NOT make specific claims about video content
5. Acknowledge the limitation prominently

FORMAT YOUR RESPONSE EXACTLY AS:
DISCLAIMER: Summary based on metadata only (transcript unavailable)

SUMMARY:
- [likely topic 1]
- [likely topic 2]
- [likely topic 3]
...

TAKEAWAYS:
1. [potential insight 1]
2. [potential insight 2]
3. [potential insight 3]`;
        }
    }

    /**
     * Parse Gemini's response into structured data
     */
    _parseResponse(text, hasTranscript) {
        const result = {
            summary: [],
            takeaways: [],
            disclaimer: null,
            hasTranscript
        };

        // Check for disclaimer
        const disclaimerMatch = text.match(/DISCLAIMER:\s*(.+?)(?:\n|$)/i);
        if (disclaimerMatch) {
            result.disclaimer = disclaimerMatch[1].trim();
        }

        // Extract summary bullets
        const summarySection = text.match(/SUMMARY:\s*([\s\S]*?)(?=TAKEAWAYS:|$)/i);
        if (summarySection) {
            const bullets = summarySection[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.match(/^[-*•]\s/))
                .map(line => line.replace(/^[-*•]\s+/, ''));

            result.summary = bullets.slice(0, 8); // Max 8 bullets
        }

        // Extract takeaways
        const takeawaysSection = text.match(/TAKEAWAYS:\s*([\s\S]*?)$/i);
        if (takeawaysSection) {
            const takeaways = takeawaysSection[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.match(/^\d+\./))
                .map(line => line.replace(/^\d+\.\s+/, ''));

            result.takeaways = takeaways.slice(0, 3); // Exactly 3 takeaways
        }

        return result;
    }

    /**
     * Test API key validity
     */
    async testApiKey() {
        try {
            await this.generateSummary(
                'This is a test transcript about testing API keys.',
                { title: 'Test Video', channel: 'Test Channel' }
            );
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export for service worker
self.GeminiAPI = GeminiAPI;
