# FlashFiller Extension

FlashFiller is a local-first Chrome/Edge Manifest V3 extension for assisting with
job-application forms. It detects fields, matches them against a local profile and
question bank, fills supported controls, and leaves final submission to the user.

## Requirements

- Node.js 24
- npm
- Chrome or Edge

## Build

```bash
npm install
npm run build
```

The unpacked extension is written to `dist/`.

## Load locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's `dist/` directory.
5. Reload the target application tab after rebuilding.

## Privacy

Profile and answer data remain in `chrome.storage.local`. The extension does not
submit forms or send a LinkedIn/application action automatically. Optional AI
providers must be explicitly enabled and use their own credentials.

Do not commit API keys, personal profile exports, password values, or private
documents.
