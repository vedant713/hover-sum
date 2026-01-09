/**
 * API Manager - Unified interface for multiple AI model providers
 * Fallback order: Gemini → OpenRouter → DeepSeek → Local Model (Ollama)
 */

class APIManager {
    constructor() {
        this.providers = ['gemini', 'openrouter', 'deepseek', 'local'];
        this.currentProvider = null;
    }

    /**
     * Generate summary using fallback cascade
     * @param {string} transcript - Video transcript
     * @returns {Promise<{summary: string, provider: string}>}
     */
    async generateSummary(transcript) {
        const errors = [];

        // Try providers in order
        for (const provider of this.providers) {
            try {
                console.log(`Attempting to generate summary using ${provider}...`);
                const summary = await this._callProvider(provider, transcript);
                this.currentProvider = provider;
                return { summary, provider };
            } catch (error) {
                console.warn(`${provider} failed:`, error.message);
                errors.push({ provider, error: error.message });
            }
        }

        // All providers failed
        throw new Error(
            `All AI providers failed:\n${errors.map(e => `- ${e.provider}: ${e.error}`).join('\n')}`
        );
    }

    /**
     * Call specific provider
     * @private
     */
    async _callProvider(provider, transcript) {
        switch (provider) {
            case 'gemini':
                return await this._callGemini(transcript);
            case 'openrouter':
                return await this._callOpenRouter(transcript);
            case 'deepseek':
                return await this._callDeepSeek(transcript);
            case 'local':
                return await this._callLocal(transcript);
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }

    /**
     * Gemini API implementation
     * @private
     */
    async _callGemini(transcript) {
        const { apiKey } = await chrome.storage.sync.get(['apiKey']);
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Provide a concise summary (2-3 sentences) of this YouTube video transcript:\n\n${transcript}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 150
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    }

    /**
     * OpenRouter API implementation
     * @private
     */
    async _callOpenRouter(transcript) {
        const { openRouterApiKey, openRouterModel } = await chrome.storage.sync.get([
            'openRouterApiKey',
            'openRouterModel'
        ]);

        if (!openRouterApiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        // Default to a fast, cheap model
        const model = openRouterModel || 'google/gemini-2.0-flash-exp:free';

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'chrome-extension://youtube-video-summarizer',
                'X-Title': 'YouTube Video Summarizer'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates concise video summaries.'
                    },
                    {
                        role: 'user',
                        content: `Provide a concise summary (2-3 sentences) of this YouTube video transcript:\n\n${transcript}`
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * DeepSeek API implementation
     * @private
     */
    async _callDeepSeek(transcript) {
        const { deepSeekApiKey } = await chrome.storage.sync.get(['deepSeekApiKey']);
        if (!deepSeekApiKey) {
            throw new Error('DeepSeek API key not configured');
        }

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepSeekApiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates concise video summaries.'
                    },
                    {
                        role: 'user',
                        content: `Provide a concise summary (2-3 sentences) of this YouTube video transcript:\n\n${transcript}`
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * Local Model (Ollama) implementation
     * @private
     */
    async _callLocal(transcript) {
        const { ollamaUrl, ollamaModel } = await chrome.storage.sync.get([
            'ollamaUrl',
            'ollamaModel'
        ]);

        // Normalize URL - remove trailing slash
        let url = (ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
        const model = ollamaModel || 'llama3.2';  // Updated default model

        try {
            console.log(`Calling Ollama at ${url}/api/generate with model ${model}`);

            const response = await fetch(`${url}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    prompt: `Provide a concise summary (2-3 sentences) of this YouTube video transcript:\n\n${transcript}`,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 150
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();

                // 403 = CORS issue
                if (response.status === 403) {
                    throw new Error(
                        'CORS blocked by Ollama. Fix: Restart Ollama with CORS enabled:\n' +
                        'OLLAMA_ORIGINS="chrome-extension://*" ollama serve'
                    );
                }

                // 404 = Model not found
                if (response.status === 404) {
                    throw new Error(
                        `Model "${model}" not found. Run: ollama pull ${model}`
                    );
                }

                throw new Error(`Ollama error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.response?.trim() || 'No response from Ollama';

        } catch (error) {
            // Network/CORS errors
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                throw new Error(
                    'Cannot connect to Ollama. Make sure:\n' +
                    '1. Ollama is running (ollama serve)\n' +
                    '2. CORS is enabled: OLLAMA_ORIGINS="chrome-extension://*" ollama serve'
                );
            }
            throw error;
        }
    }

    /**
     * Test all configured providers
     * @returns {Promise<Array>} Test results for each provider
     */
    async testProviders() {
        const results = [];

        for (const provider of this.providers) {
            try {
                const testTranscript = "This is a test video about machine learning and artificial intelligence.";
                const summary = await this._callProvider(provider, testTranscript);
                results.push({
                    provider,
                    status: 'success',
                    summary: summary.substring(0, 100) + '...'
                });
            } catch (error) {
                results.push({
                    provider,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}
