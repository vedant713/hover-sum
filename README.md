# Hover-Sum 🎬✨

**AI-Powered YouTube Video Summarizer** - Get instant summaries of any YouTube video with a right-click!

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![Chrome](https://img.shields.io/badge/chrome-extension-green)
![License](https://img.shields.io/badge/license-MIT-purple)

## 🚀 Features

- **Right-Click to Summarize** - Right-click any video thumbnail and get an AI summary in seconds
- **Beautiful Side Panel** - Summaries appear in a sleek, dark-themed sidebar
- **Multi-Provider Support** - Works with Gemini, OpenRouter, DeepSeek, and Ollama (local)
- **Smart Fallback** - Automatically tries the next provider if one fails
- **Transcript Fetching** - Uses YouTube's Innertube API for reliable transcript extraction
- **Caching** - Summaries are cached to avoid redundant API calls
- **Summary History** - View your last 10 summaries

## 📸 Screenshots

### Extension Popup
Clean, modern UI showing extension status and quick actions.

### Side Panel
Beautiful dark-themed sidebar displaying video summaries.

## 🛠️ Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/vedant713/hover-sum.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top right)

4. Click **Load unpacked** and select the `hover-sum` folder

5. Configure your API key in extension settings

### API Setup

The extension supports multiple AI providers (configure at least one):

| Provider | How to Get Key |
|----------|---------------|
| **Gemini** | [Google AI Studio](https://makersuite.google.com/app/apikey) (Free tier available) |
| **OpenRouter** | [OpenRouter Keys](https://openrouter.ai/keys) (Free credits) |
| **DeepSeek** | [DeepSeek Platform](https://platform.deepseek.com/) |
| **Ollama** | [Download Ollama](https://ollama.ai/) (Local, free) |

## 📖 Usage

1. Go to **YouTube**
2. **Right-click** any video thumbnail
3. Select **"✨ Summarize Video"**
4. Summary appears in the side panel!

### Using with Ollama (Local AI)

To use Ollama, you need to enable CORS:

```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

## 🏗️ Architecture

```
hover-sum/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (API calls, caching)
├── sidepanel.html/js      # Side panel UI
├── popup.html/js          # Extension popup
├── options.html/js        # Settings page
├── context-menu-helper.js # Content script for right-click detection
├── transcript-fetcher.js  # YouTube Innertube API transcript fetching
├── api-manager.js         # Multi-provider AI API manager
├── cache.js               # Summary caching system
└── icons/                 # Extension icons
```

## 🔧 Tech Stack

- **Chrome Extension Manifest V3**
- **Side Panel API** - Modern Chrome sidebar
- **Context Menus API** - Right-click integration
- **YouTube Innertube API** - Reliable transcript fetching
- **Multiple AI Providers** - Gemini, OpenRouter, DeepSeek, Ollama

## 📝 Fallback Order

When generating summaries, the extension tries providers in this order:

1. **Gemini** (Google's AI)
2. **OpenRouter** (100+ models)
3. **DeepSeek** (Chinese AI)
4. **Ollama** (Local models)

If no transcript is available, the extension uses the video's title and description.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - feel free to use this project however you like!

## 🙏 Acknowledgments

- YouTube Innertube API for transcript fetching
- OpenRouter for unified AI access
- Ollama for local AI capabilities

---

Made with ❤️ by [Vedant](https://github.com/vedant713)
