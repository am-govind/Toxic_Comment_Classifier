# ToxGuard Privacy Policy

**Last Updated:** February 2026

## What ToxGuard Does

ToxGuard is a browser extension that scans web page comments for toxic content and highlights them with visual indicators (🔴 Toxic, 🟡 Medium, 🟢 Safe). It works on all Chromium-based browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc).

## Data Collection

### What We Collect
- **Comment text**: The text content of comments visible on the current web page is sent to our classification server for analysis.

### What We Do NOT Collect
- We do **not** collect personal information (name, email, identity).
- We do **not** store browsing history or URLs.
- We do **not** use cookies or tracking technologies.
- We do **not** sell or share any data with third parties.

### Author / User ID Extraction
- ToxGuard extracts comment author names (YouTube channel names, Reddit usernames, X/Twitter handles) from the page **locally in your browser**.
- Author information is **never sent to the server** — it stays entirely on your device.
- Author data is used only for display purposes (tooltips, modal, CSV export) and is discarded when you close the tab or clear highlights.

## Data Processing

- Comment text is sent to the ToxGuard API server **only when you click "Scan Page"**.
- Text is processed in-memory for classification and **immediately discarded** after the response is sent.
- **No comment text is stored** on our servers.
- Classification results are displayed locally in your browser and are not persisted.

## Data Transmission

- All API communication uses HTTPS encryption.
- Data is transmitted only between your browser and the ToxGuard API server.
- An API key is used for authentication but does not contain any personal information.

## Permissions

The extension requests the following permissions:

| Permission | Why It's Needed |
|------------|----------------|
| `activeTab` | To read comment text from the current tab when you click "Scan Page" |
| `scripting` | To inject the content script that highlights comments |
| `storage` | To save your preferences (threshold, API URL, API key) |

## Your Rights

- You can **uninstall** the extension at any time to stop all data processing.
- You can **clear highlights** at any time using the extension popup.
- You can **export results** as CSV for your own records.
- No account creation is required.

## Changes to This Policy

We may update this policy from time to time. Changes will be posted on our GitHub repository.

## Contact

For questions or concerns about this privacy policy, please open an issue on our [GitHub repository](https://github.com/am-govind/Toxic_Comment_Classifier).
