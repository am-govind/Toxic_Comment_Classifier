/**
 * ToxGuard Platform Detection & Author Extraction
 * Platform-specific logic for extracting comment author IDs from YouTube, Reddit, X, etc.
 */

/* eslint-disable no-unused-vars */

/**
 * Detect which platform the current page belongs to.
 * @returns {"youtube"|"reddit"|"x"|"generic"}
 */
function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("reddit.com")) return "reddit";
    if (host.includes("twitter.com") || host.includes("x.com")) return "x";
    return "generic";
}

/**
 * Extract the author/user ID for a comment element based on platform DOM structure.
 * @param {Element} element — the comment text element
 * @param {string}  platform — result of detectPlatform()
 * @returns {string} — author name/handle or "Unknown"
 */
function extractAuthor(element, platform) {
    try {
        switch (platform) {

            // ── YouTube ──────────────────────────────────────────────────────
            case "youtube": {
                const renderer = element.closest(
                    "ytd-comment-view-model, ytd-comment-renderer"
                );
                if (renderer) {
                    const authorLink =
                        renderer.querySelector("#author-text") ||
                        renderer.querySelector("h3 a") ||
                        renderer.querySelector("a[href*='/channel/'], a[href*='/@']");
                    if (authorLink) {
                        return authorLink.textContent.trim().replace(/^@/, "") || "Unknown";
                    }
                }
                return "Unknown";
            }

            // ── Reddit ──────────────────────────────────────────────────────
            case "reddit": {
                // New Reddit: shreddit-comment has author directly as attribute (most reliable)
                const shredditComment = element.closest("shreddit-comment");
                if (shredditComment && shredditComment.getAttribute("author")) {
                    return `u/${shredditComment.getAttribute("author")}`;
                }

                // Old Reddit / fallback
                const commentBlock =
                    element.closest("[data-testid='comment']") ||
                    element.closest(".Comment") ||
                    element.closest(".thing.comment");
                if (commentBlock) {
                    const authorEl =
                        commentBlock.querySelector(".author") ||
                        commentBlock.querySelector("[data-testid='comment_author_link']") ||
                        commentBlock.querySelector("a[href*='/user/']");
                    if (authorEl) {
                        let name = authorEl.textContent.trim();
                        if (!name && authorEl.href) {
                            const match = authorEl.href.match(/\/user\/([^/?#]+)/);
                            if (match) name = match[1];
                        }
                        if (name) {
                            return name.startsWith("u/") ? name : `u/${name}`;
                        }
                    }
                }
                return "Unknown";
            }

            // ── X / Twitter ─────────────────────────────────────────────────
            case "x": {
                const tweet = element.closest("article");
                if (tweet) {
                    const userNameContainer = tweet.querySelector(
                        "[data-testid='User-Name']"
                    );
                    if (userNameContainer) {
                        const links = userNameContainer.querySelectorAll("a");
                        for (const link of links) {
                            const text = link.textContent.trim();
                            if (text.startsWith("@")) return text;
                        }
                        const displayName = userNameContainer.querySelector("span");
                        if (displayName) return displayName.textContent.trim();
                    }
                }
                return "Unknown";
            }

            // ── Generic ─────────────────────────────────────────────────────
            default:
                return "Unknown";
        }
    } catch {
        return "Unknown";
    }
}
