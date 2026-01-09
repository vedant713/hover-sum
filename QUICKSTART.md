# YouTube Video Summarizer - Quick Start Guide

## 🚀 Installation Steps

### 1. Get Your Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### 2. Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top right)
4. Click **"Load unpacked"**
5. Navigate to and select: `/Users/vedantdhoke/Downloads/youtubehover`
6. Extension should appear in your extensions list ✅

### 3. Configure API Key

1. Click the **YouTube Summarizer** extension icon in toolbar
2. Click **"⚙️ Settings"**
3. Paste your Gemini API key
4. Click **"Save Settings"**
5. You should see "Settings saved successfully!"

### 4. Test on YouTube

1. Go to https://www.youtube.com
2. **Hover** over any video thumbnail
3. **Wait 500ms** (half a second)
4. A beautiful tooltip should appear with the summary! 🎉

## 🐛 Troubleshooting

### Extension won't load?
- Make sure you selected the `youtubehover` folder (not a subfolder)
- Check for errors in `chrome://extensions/` under the extension card
- Click "Reload" icon if you made changes

### No tooltip appearing?
- Check the browser console (F12) for errors
- Verify API key is saved (check extension popup)
- Make sure you're hovering for at least 500ms
- Right-click extension → "Reload" and refresh YouTube

### API errors?
- Verify API key is correct (no extra spaces)
- Check you have internet connection
- Free tier has rate limits (60 requests/minute)

### Still not working?
- Open DevTools Console (F12) on YouTube
- Look for errors in red
- Check the background service worker:
  - Go to `chrome://extensions/`
  - Under the extension, click "service worker"
  - Check for errors in that console

## ✅ Expected Behavior

**What should happen:**
1. Hover mouse over any YouTube video thumbnail
2. After 500ms, tooltip fades in
3. Shows video title, summary bullets, and key takeaways
4. Move mouse away → tooltip disappears

**Features to test:**
- Works on YouTube homepage
- Works on search results
- Works on channel pages
- Second hover on same video = instant (cached)
- Move away before 500ms = no tooltip

Enjoy your YouTube browsing superpower! 🎬✨
