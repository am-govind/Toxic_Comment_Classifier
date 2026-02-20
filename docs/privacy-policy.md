# ToxGuard Privacy Policy

**Last Updated:** February 2026

## What ToxGuard Does

ToxGuard is a Chrome extension that scans web page comments for toxic content and highlights them with visual indicators (red, yellow, or green borders).

## Data Collection

### What We Collect
- **Comment text**: The text content of comments visible on the current web page is sent to our classification server for analysis.

### What We Do NOT Collect
- We do **not** collect personal information (name, email, identity).
- We do **not** store browsing history or URLs.
- We do **not** use cookies or tracking technologies.
- We do **not** sell or share any data with third parties.

## Data Processing

- Comment text is sent to the ToxGuard API server **only when you click "Scan Page"**.
- Text is processed in-memory for classification and **immediately discarded** after the response is sent.
- **No comment text is stored** on our servers.
- Classification results are displayed locally in your browser and are not persisted.

## Data Transmission

- All API communication uses HTTPS encryption.
- Data is transmitted only between your browser and the ToxGuard API server.

## Permissions

The extension requests the following Chrome permissions:
- **activeTab**: To read comment text from the current tab when you click "Scan Page".
- **scripting**: To inject the content script that highlights comments.
- **storage**: To save your preferences (threshold setting, API URL).

## Your Rights

- You can **uninstall** the extension at any time to stop all data processing.
- You can **clear highlights** at any time using the extension popup.
- No account creation is required.

## Changes to This Policy

We may update this policy from time to time. Changes will be posted on our GitHub repository.

## Contact

For questions or concerns about this privacy policy, please open an issue on our [GitHub repository](https://github.com/govindmishra/Toxic_Comment_Classifier).
