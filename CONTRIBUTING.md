# Contributing to ToxGuard

Thanks for considering contributing to ToxGuard! Here's how you can help.

## Getting Set Up

### Backend
```bash
cd server
python -m venv tcc && source tcc/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m pytest tests/ -v  # Verify everything passes
```

### Extension
1. Open `chrome://extensions/` → Enable Developer mode
2. Click **Load unpacked** → select the `extension/` folder
3. Make changes → click the 🔄 reload button on the extension card

## Extension Architecture

The content script is split into three focused files:

| File | Purpose |
|------|---------|
| `content-styles.js` | CSS generator — all highlight, modal, and badge styles |
| `platforms.js` | Platform detection & author extraction (YouTube, Reddit, X) |
| `content.js` | Orchestrator — scan flow, highlighting, modal, messaging |

All three are injected in order by `popup.js` via `chrome.scripting.executeScript`.

## Guidelines

- **No bundler** — The extension uses plain JS (no webpack, no npm). Keep it simple.
- **JSDoc annotations** — All functions use `@param` / `@returns` / `@typedef` for IntelliSense. Add docs to any new functions.
- **`!important` in CSS** — Required because we inject into third-party pages. Use it on all style rules.
- **DOM selectors** — Platform-specific selectors (in `platforms.js`) may break when sites update. Test on real pages.
- **Privacy** — Never send author/user data to the server. Author extraction stays client-side.

## Adding a New Platform

To add author extraction for a new website:

1. Add a hostname check in `detectPlatform()` in `platforms.js`
2. Add a `case` block in `extractAuthor()` with DOM selectors
3. Test on real pages to verify correct author pairing

## Running Tests

```bash
cd server
source tcc/bin/activate
python -m pytest tests/ -v --tb=short
```

## Reporting Issues

- Include which browser and version you're using
- Include the website URL where the issue occurs
- Include console errors (F12 → Console tab) if any
