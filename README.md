# Token Saver

<img src="assets/brand/logo.png" alt="Token Saver logo" width="160">

[Visit the website](https://4pdara.github.io/token-saver/)

Translate eligible chat drafts to your chosen target language before sending them in ChatGPT or Claude. English is the default target; the popup lets you choose from 16 languages.

**Version 5.1.1 supports both Enter and the send arrow.** A shared submission handler prevents repeated clicks from sending the original message or submitting the translation twice.

[Download the latest release](https://github.com/4pdara/token-saver/releases/latest) · [Report an issue](https://github.com/4pdara/token-saver/issues)

## Features

- Translate before sending with **Enter** or the **send button**, including clicks on the arrow inside the button.
- Choose English, Chinese, Spanish, French, German, Russian, Japanese, Korean, Arabic, Hebrew, Hindi, Portuguese, Italian, Turkish, Thai, or Vietnamese as the target language.
- Toggle translation with a draggable bubble that displays the current target language.
- Keep your language, enabled state, and bubble position in local browser storage.
- Use light or dark styling based on your system preference.
- Attempt to preserve fenced code blocks, inline code, and HTTP/HTTPS links during translation.

## Supported websites

The extension is configured for these addresses:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`
- `https://*.claude.ai/*`

It is a Manifest V3 browser extension for compatible Chromium browsers, such as Chrome and Edge. Desktop applications and other websites are outside its configured scope. Changes to a chat website's editor or send controls can affect compatibility.

## Installation

1. Open [Releases](https://github.com/4pdara/token-saver/releases/latest) and download **token-saver-v5.1.2.zip**.
2. Extract the ZIP into a permanent folder on your computer.
3. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
6. Open or refresh a supported chat website. The language bubble should appear near the top-right corner.

No build, API key, or package installation is required to use the release ZIP. Keep the extracted folder in place while the extension is installed.

### Updating an existing installation

Extract the new release over the files in your existing extension folder, click **Reload** on its card in the browser's extensions page, and refresh your chat tabs. Confirm that the extension version is **5.1.2**.

## Usage

1. Open the extension popup from the browser toolbar and choose your target language. Changes are saved automatically.
2. Check the bubble: a green dot means translation is enabled; a gray dot means it is disabled. Click the bubble to toggle it, or drag it to reposition it.
3. Write a message and press **Enter** or click the **send arrow**. If the draft passes the translation heuristic, the extension waits for translation, updates the editor, and triggers one send action.
4. Use **Shift+Enter** for a newline.

Additional submission attempts are blocked while a translation is running. If you edit the draft, disable translation, or change the target language during that time, the pending translation is not automatically sent. If translation fails, the original draft remains in the editor.

The extension translates your outgoing draft, not the assistant's reply. To request replies in a specific language, state that language explicitly in your chat instructions, for example: “Always reply in Spanish.”

## Privacy and permissions

**Text selected for translation is sent to Google's translation service before it is sent to the chat website.** Code and link placeholders are formatting aids, not a sensitive-data filter. Disable translation for text you do not want to send to that service.

| Permission or setting | Purpose |
| --- | --- |
| `storage` | Save `enabled`, `targetLang`, and `bubblePos` in `chrome.storage.local`. |
| `https://translate.googleapis.com/*` | Access the translation endpoint used by the extension. |
| `content_scripts.matches` | Run the editor integration and bubble on the supported websites. |

The extension has no project-owned backend, analytics integration, or message-history store. Draft text is held temporarily while it is translated.

## Limitations and token savings

- **Token savings are not guaranteed.** The extension does not count tokens or measure billing. The percentages shown in the supplied popup are fixed values, not measurements of your message or model usage. Compare the original and translated text with the same model's tokenizer to evaluate a specific case.
- Translation eligibility uses a **non-ASCII character heuristic**, not reliable language identification. Drafts shorter than eight trimmed characters or with fewer than five letters are skipped. Text written mainly with ASCII letters may pass through even when a different target is selected; messages already in the target language may still require a translation request to identify them.
- Translation uses a Google endpoint without an API key. Availability, rate limits, browser restrictions, and changes to the service can affect it.
- Translated messages are sent automatically, without a review screen. Translation can change meaning, technical terms, or formatting.
- Code and URL preservation uses placeholders, and translation chunks are split at 800 JavaScript string units. Neither mechanism guarantees perfect formatting preservation.
- Button detection recognizes a send-button test identifier, English or Hebrew send labels, or a submit button in the message form. Other labels and custom controls may require an update.
- Chat history, attachments, system instructions, and assistant replies are not translated by this extension.

## Development and tests

The runtime extension is plain JavaScript, HTML, and CSS. Development dependencies are used only for browser tests.

```sh
npm ci
npx playwright install chromium
npm test
```

Tests load the actual extension in Chromium against local chat-editor fixtures with mocked translation responses. They cover the send arrow, Enter, contenteditable and textarea editors, duplicate prevention, failures, draft edits, target-language selection, and popup settings. They do not send real chat messages or establish compatibility with every live website version.

## Project files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension metadata, permissions, supported URLs, and popup configuration. |
| `content.js` | Bubble, draft translation, target-language settings, and submission interception. |
| `styles.css` | Bubble styling and theme support. |
| `popup.html`, `popup.js` | Target-language selector and popup controls. |
| `assets/brand/` | New token-flow logo and extension icons in 16, 32, 48, and 128 pixel sizes. |
| `docs/` | Static product website, published with GitHub Pages. |
| `tests/`, `playwright.config.js` | Browser regression tests. |

## Source

Imported from `token-saver-FULL-REPO-v5.1.zip` (extension version 5.1.0), then updated to 5.1.1 with send-button support. The original import is retained in the Git history. The `LICENSE` file supplied with the archive is preserved in this repository.

Version **5.1.2** introduces the new token-flow identity and product website. The original coin-and-bubble artwork has been removed from the current source tree.
