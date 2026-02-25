/**
 * ToxGuard Content Script (Orchestrator)
 * Scrapes comments, sends to API for classification, highlights results.
 *
 * Dependencies (injected before this file):
 *   - content-styles.js  → getToxGuardCSS()
 *   - platforms.js        → detectPlatform(), extractAuthor()
 */

(() => {
  // Prevent double-injection
  if (window.__toxGuardInjected) return;
  window.__toxGuardInjected = true;

  // ── Constants ──────────────────────────────────────────────────────
  const TOXIC_CLASS = "toxguard-toxic";
  const MEDIUM_CLASS = "toxguard-medium";
  const SAFE_CLASS = "toxguard-safe";
  const BADGE_ID = "toxguard-badge";
  const TOOLTIP_ID = "toxguard-floating-tooltip";
  const MODAL_ID = "toxguard-stats-modal";
  const OVERLAY_ID = "toxguard-overlay";
  const MIN_TEXT_LENGTH = 10;
  const MAX_TEXT_LENGTH = 1000;

  let lastScanData = null;
  let floatingTooltip = null;

  // ═══════════════════════════════════════════════════════════════════
  //  TOOLTIP
  // ═══════════════════════════════════════════════════════════════════

  function getFloatingTooltip() {
    if (floatingTooltip && document.body.contains(floatingTooltip)) return floatingTooltip;
    floatingTooltip = document.createElement("div");
    floatingTooltip.id = TOOLTIP_ID;
    document.body.appendChild(floatingTooltip);
    return floatingTooltip;
  }

  function showTooltip(element) {
    const tooltipText = element.getAttribute("data-toxguard-tooltip");
    const tooltipColor = element.getAttribute("data-toxguard-color") || "#f87171";
    const borderColor = element.getAttribute("data-toxguard-border") || "rgba(248, 113, 113, 0.3)";
    if (!tooltipText) return;

    const tip = getFloatingTooltip();
    tip.textContent = tooltipText;
    tip.style.cssText = `
      position: fixed !important;
      background: #1f1f2e !important;
      color: ${tooltipColor} !important;
      font-family: 'Inter', -apple-system, sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      white-space: nowrap !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
      border: 1px solid ${borderColor} !important;
      opacity: 1 !important;
      transition: opacity 0.15s ease !important;
    `;

    const rect = element.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let top = rect.top - tipRect.height - 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    if (top < 4) top = rect.bottom + 8;
    if (left < 4) left = 4;
    if (left + tipRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tipRect.width - 4;
    }

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function hideTooltip() {
    if (floatingTooltip) {
      floatingTooltip.style.opacity = "0";
      floatingTooltip.style.pointerEvents = "none";
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CSS INJECTION
  // ═══════════════════════════════════════════════════════════════════

  function injectStyles() {
    if (document.getElementById("toxguard-styles")) return;
    const style = document.createElement("style");
    style.id = "toxguard-styles";
    style.textContent = getToxGuardCSS({
      TOXIC: TOXIC_CLASS,
      MEDIUM: MEDIUM_CLASS,
      SAFE: SAFE_CLASS,
      BADGE: BADGE_ID,
      OVERLAY: OVERLAY_ID,
      MODAL: MODAL_ID,
      TOOLTIP: TOOLTIP_ID,
    });
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COMMENT EXTRACTION
  // ═══════════════════════════════════════════════════════════════════

  const COMMENT_SELECTORS = [
    // YouTube
    "#content-text",
    "yt-formatted-string#content-text",
    // Reddit
    "[data-testid='comment'] p",
    ".Comment p",
    ".md p",
    // Twitter/X
    "[data-testid='tweetText']",
    // General
    ".comment-body", ".comment-text", ".comment-content",
    ".comment p", ".comments p",
    "[class*='comment'] p", "[class*='Comment'] p",
    // Forums
    ".post-body", ".post-content", ".message-body",
    ".reply-body", ".reply-content",
    // News
    ".article-comment", ".user-comment",
    // Generic
    "article p", ".feed-item p",
  ];

  function extractComments() {
    const platform = detectPlatform();
    const rawElements = [];

    // Try platform-specific selectors first
    const specific = document.querySelectorAll(COMMENT_SELECTORS.join(", "));
    specific.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH) {
        rawElements.push(el);
      }
    });

    // Fallback to generic text elements
    if (rawElements.length === 0) {
      document.querySelectorAll("p, span, div, li, td, blockquote").forEach(el => {
        const text = el.innerText?.trim();
        if (
          text &&
          text.length >= MIN_TEXT_LENGTH &&
          text.length <= MAX_TEXT_LENGTH &&
          el.children.length <= 3 &&
          !el.closest("nav, header, footer, script, style, noscript")
        ) {
          rawElements.push(el);
        }
      });
    }

    // Deduplicate (remove children already covered by parents)
    const unique = rawElements.filter(el =>
      !rawElements.some(other => other !== el && other.contains(el))
    );

    // Pair each element with its extracted author
    return unique.map(el => ({
      element: el,
      author: extractAuthor(el, platform),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HIGHLIGHTING
  // ═══════════════════════════════════════════════════════════════════

  function attachTooltip(element, text, color, borderColor) {
    element.setAttribute("data-toxguard-tooltip", text);
    element.setAttribute("data-toxguard-color", color);
    element.setAttribute("data-toxguard-border", borderColor);
    element.addEventListener("mouseenter", () => showTooltip(element));
    element.addEventListener("mouseleave", hideTooltip);
  }

  function makeTooltipText(author, category, score) {
    const authorLabel = author && author !== "Unknown" ? `${author} — ` : "";
    return `⚠️ ${authorLabel}${category.replace(/_/g, " ")} (${(score * 100).toFixed(0)}%)`;
  }

  function getTopCategory(scores) {
    return Object.entries(scores).reduce(
      (max, [cat, score]) => (score > max[1] ? [cat, score] : max),
      ["", 0]
    );
  }

  function highlightToxic(element, scores, author) {
    element.classList.add(TOXIC_CLASS);
    const [cat, score] = getTopCategory(scores);
    attachTooltip(element, makeTooltipText(author, cat, score), "#f87171", "rgba(248, 113, 113, 0.3)");
  }

  function highlightMedium(element, scores, author) {
    element.classList.add(MEDIUM_CLASS);
    const [cat, score] = getTopCategory(scores);
    attachTooltip(element, makeTooltipText(author, cat, score), "#eab308", "rgba(234, 179, 8, 0.3)");
  }

  function highlightSafe(element, author) {
    element.classList.add(SAFE_CLASS);
    const authorLabel = author && author !== "Unknown" ? `${author} — ` : "";
    attachTooltip(element, `✅ ${authorLabel}Safe`, "#34d399", "rgba(52, 211, 153, 0.3)");
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BADGE
  // ═══════════════════════════════════════════════════════════════════

  function showBadge(count) {
    let badge = document.getElementById(BADGE_ID);
    if (badge) badge.remove();
    if (count === 0) return;

    badge = document.createElement("div");
    badge.id = BADGE_ID;
    badge.innerHTML = `<span class="badge-icon">🛡️</span> ${count} toxic comment${count !== 1 ? "s" : ""} found`;
    badge.addEventListener("click", () => showStatsModal());
    document.body.appendChild(badge);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STATS MODAL
  // ═══════════════════════════════════════════════════════════════════

  const CAT_COLORS = {
    toxic: "#f87171", severe_toxic: "#ef4444", obscene: "#fb923c",
    threat: "#f43f5e", insult: "#a78bfa", identity_hate: "#f472b6",
  };

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function buildCategoryBreakdown(results) {
    const categories = {};
    results.forEach(r => {
      const severity = r.severity || (r.is_toxic ? "toxic" : "safe");
      if (severity === "toxic" || severity === "medium") {
        Object.entries(r.scores).forEach(([cat, score]) => {
          if (score >= 0.3) categories[cat] = (categories[cat] || 0) + 1;
        });
      }
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]);
  }

  function buildFlaggedList(results) {
    return results
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => {
        const sev = r.severity || (r.is_toxic ? "toxic" : "safe");
        return sev === "toxic" || sev === "medium";
      });
  }

  function showStatsModal() {
    if (!lastScanData) return;
    hideStatsModal();

    const { totalComments, toxicComments, mediumComments = 0, results } = lastScanData;
    const safeCount = totalComments - toxicComments - mediumComments;

    const sortedCats = buildCategoryBreakdown(results);
    const maxCatCount = sortedCats.length > 0 ? sortedCats[0][1] : 1;
    const flagged = buildFlaggedList(results);

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.addEventListener("click", hideStatsModal);
    document.body.appendChild(overlay);

    // Modal
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="tg-modal-header">
        <div class="tg-modal-title">🛡️ ToxGuard Report</div>
        <button class="tg-modal-close" id="tg-close-btn">✕</button>
      </div>
      <div class="tg-modal-body">
        <!-- Stat Cards -->
        <div class="tg-stat-row">
          <div class="tg-stat-card tg-toxic-card">
            <div class="tg-stat-number toxic">${toxicComments}</div>
            <div class="tg-stat-label">Toxic</div>
          </div>
          <div class="tg-stat-card tg-medium-card">
            <div class="tg-stat-number medium">${mediumComments}</div>
            <div class="tg-stat-label">Medium</div>
          </div>
          <div class="tg-stat-card tg-safe-card">
            <div class="tg-stat-number safe">${safeCount}</div>
            <div class="tg-stat-label">Safe</div>
          </div>
        </div>

        <!-- Category Breakdown -->
        ${sortedCats.length > 0 ? `
          <div class="tg-section-title">Category Breakdown</div>
          <div class="tg-category-list">
            ${sortedCats.map(([cat, count]) => {
      const color = CAT_COLORS[cat] || "#f87171";
      return `
              <div class="tg-category-item">
                <span class="tg-cat-name">${cat.replace(/_/g, " ")}</span>
                <div class="tg-cat-bar-bg">
                  <div class="tg-cat-bar-fill" data-width="${(count / maxCatCount) * 100}" style="background: linear-gradient(90deg, ${color}, ${color}cc);"></div>
                </div>
                <span class="tg-cat-count" style="color: ${color};">${count}</span>
              </div>`;
    }).join("")}
          </div>
        ` : ""}

        <!-- Flagged Comments -->
        ${flagged.length > 0 ? `
          <div class="tg-section-title">Flagged Comments (${flagged.length})</div>
          <div class="tg-comment-list">
            ${flagged.map(r => {
      const sev = r.severity || (r.is_toxic ? "toxic" : "safe");
      const [topCatName, topCatScore] = getTopCategory(r.scores);
      return `
                <div class="tg-comment-item tg-item-${sev}" data-index="${r.index}">
                  <div class="tg-comment-header">
                    <span class="tg-comment-severity ${sev}">${sev}</span>
                    <span class="tg-comment-category">${topCatName.replace(/_/g, " ")} · ${(topCatScore * 100).toFixed(0)}%</span>
                  </div>
                  ${r.author && r.author !== "Unknown" ? `<div class="tg-comment-author">👤 ${escapeHtml(r.author)}</div>` : ""}
                  <div class="tg-comment-text">${escapeHtml(r.text)}</div>
                </div>`;
    }).join("")}
          </div>
        ` : ""}
      </div>
    `;
    document.body.appendChild(modal);

    // Animate in + bar fill (double rAF for reliable rendering)
    requestAnimationFrame(() => {
      overlay.classList.add("tg-visible");
      modal.classList.add("tg-visible");
      requestAnimationFrame(() => {
        modal.querySelectorAll(".tg-cat-bar-fill").forEach(bar => {
          bar.style.width = bar.dataset.width + "%";
        });
      });
    });

    // Close
    modal.querySelector("#tg-close-btn").addEventListener("click", hideStatsModal);

    // Click comment → scroll to it on page
    modal.querySelectorAll(".tg-comment-item").forEach(item => {
      item.addEventListener("click", () => {
        hideStatsModal();
        const idx = item.dataset.index;
        const target = document.querySelector(`[data-toxguard-idx="${idx}"]`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    // ESC to close
    document.addEventListener("keydown", handleEsc);
  }

  function handleEsc(e) {
    if (e.key === "Escape") hideStatsModal();
  }

  function hideStatsModal() {
    document.removeEventListener("keydown", handleEsc);
    const overlay = document.getElementById(OVERLAY_ID);
    const modal = document.getElementById(MODAL_ID);
    if (overlay) overlay.remove();
    if (modal) modal.remove();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLEAR
  // ═══════════════════════════════════════════════════════════════════

  function clearHighlights() {
    document.querySelectorAll(`.${TOXIC_CLASS}, .${MEDIUM_CLASS}, .${SAFE_CLASS}`).forEach(el => {
      el.classList.remove(TOXIC_CLASS, MEDIUM_CLASS, SAFE_CLASS);
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.background = "";
      el.style.animation = "";
      el.style.boxShadow = "";
      el.removeAttribute("data-toxguard-tooltip");
      el.removeAttribute("data-toxguard-color");
      el.removeAttribute("data-toxguard-border");
      el.removeAttribute("data-toxguard-idx");
    });

    const badge = document.getElementById(BADGE_ID);
    if (badge) badge.remove();
    const tip = document.getElementById(TOOLTIP_ID);
    if (tip) tip.remove();
    floatingTooltip = null;
    hideStatsModal();
    lastScanData = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MAIN SCAN FLOW
  // ═══════════════════════════════════════════════════════════════════

  async function scanPage(threshold) {
    injectStyles();
    clearHighlights();

    const commentEntries = extractComments();
    if (commentEntries.length === 0) {
      return { success: true, data: { totalComments: 0, toxicComments: 0, results: [] } };
    }

    const texts = commentEntries.map(entry => entry.element.innerText.trim());
    const authors = commentEntries.map(entry => entry.author);

    try {
      const response = await chrome.runtime.sendMessage({
        action: "classifyComments",
        comments: texts,
        threshold,
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      const results = response.results;
      let toxicCount = 0;
      let mediumCount = 0;

      results.forEach((result, index) => {
        const author = authors[index] || "Unknown";
        result.author = author;

        const el = commentEntries[index].element;
        el.setAttribute("data-toxguard-idx", index);

        const severity = result.severity || (result.is_toxic ? "toxic" : "safe");

        if (severity === "toxic") {
          toxicCount++;
          highlightToxic(el, result.scores, author);
        } else if (severity === "medium") {
          mediumCount++;
          highlightMedium(el, result.scores, author);
        } else {
          highlightSafe(el, author);
        }
      });

      showBadge(toxicCount + mediumCount);

      lastScanData = {
        totalComments: commentEntries.length,
        toxicComments: toxicCount,
        mediumComments: mediumCount,
        results,
      };

      return { success: true, data: lastScanData };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MESSAGE LISTENER
  // ═══════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapeAndClassify") {
      scanPage(message.threshold).then(sendResponse);
      return true; // async
    }
    if (message.action === "clearHighlights") {
      clearHighlights();
      sendResponse({ success: true });
    }
  });
})();
