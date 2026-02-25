/**
 * ToxGuard Background Service Worker
 * Handles API communication between the content script and the ToxGuard server.
 * Acts as a bridge — receives classification requests via chrome.runtime messages
 * and forwards them to the FastAPI backend.
 *
 * @requires config.js — provides {@link CONFIG} with API_BASE and API_KEY
 */

importScripts("config.js");

// ── First-run: open options page so user can set their API key ───────
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.runtime.openOptionsPage();
    }
});

/**
 * @typedef {Object} ApiConfig
 * @property {string} base - API base URL
 * @property {string} key  - API authentication key
 */

/**
 * Retrieve API configuration from chrome.storage, falling back to CONFIG defaults.
 * @returns {Promise<ApiConfig>}
 */
async function getApiConfig() {
    try {
        const result = await chrome.storage.local.get(["apiBase", "apiKey"]);
        return {
            base: result.apiBase || CONFIG.API_BASE,
            key: result.apiKey || CONFIG.API_KEY,
        };
    } catch {
        return { base: CONFIG.API_BASE, key: CONFIG.API_KEY };
    }
}

// ── Message Router ──────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "classifyComments") {
        classifyComments(message.comments, message.threshold)
            .then(results => sendResponse({ success: true, results }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
});

/**
 * @typedef {Object} ToxicityScores
 * @property {number} toxic         - Toxicity score (0–1)
 * @property {number} severe_toxic  - Severe toxicity score (0–1)
 * @property {number} obscene       - Obscenity score (0–1)
 * @property {number} threat        - Threat score (0–1)
 * @property {number} insult        - Insult score (0–1)
 * @property {number} identity_hate - Identity hate score (0–1)
 */

/**
 * @typedef {Object} ClassificationResult
 * @property {string}          text               - Original comment text
 * @property {boolean}         is_toxic            - Whether the comment is toxic
 * @property {string}          severity            - "toxic" | "medium" | "safe"
 * @property {number}          flagged_categories  - Number of categories above threshold
 * @property {ToxicityScores}  scores              - Per-category toxicity scores
 */

/**
 * Send comments to the ToxGuard API for classification.
 *
 * @param {string[]} comments   - Array of comment texts to classify
 * @param {number}   [threshold=0.5] - Toxicity threshold (0–1)
 * @returns {Promise<ClassificationResult[]>} Classified results
 * @throws {Error} If API key is missing, server is unreachable, or request fails
 */
async function classifyComments(comments, threshold = 0.5) {
    const config = await getApiConfig();

    if (!config.key) {
        throw new Error("API key not set. Right-click ToxGuard icon → Options to configure.");
    }

    const url = `${config.base}/predict`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": config.key,
            },
            body: JSON.stringify({
                comments: comments,
                threshold: threshold
            }),
            signal: AbortSignal.timeout(30000), // 30s timeout for cold starts
        });

        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`API ${response.status}: ${body || response.statusText}`);
        }

        const data = await response.json();
        return data.results;
    } catch (err) {
        if (err.name === "TimeoutError") {
            throw new Error("Server timed out (possibly waking from sleep). Try again.");
        }
        throw new Error(`${err.message} [URL: ${url}]`);
    }
}
