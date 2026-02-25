/**
 * ToxGuard Content Styles
 * All CSS for highlights, tooltips, badges, and the stats modal.
 * Injected into the page by content.js via <style> element.
 */

/* eslint-disable no-unused-vars */
function getToxGuardCSS(classes) {
    const { TOXIC, MEDIUM, SAFE, BADGE, OVERLAY, MODAL, TOOLTIP } = classes;

    return `
/* ═══════════════════════════════════════════════════════
   HIGHLIGHT STYLES
   ═══════════════════════════════════════════════════════ */

/* ── Toxic (Red) ── */
.${TOXIC} {
  outline: 3px solid #ef4444 !important;
  outline-offset: 2px !important;
  background: rgba(239, 68, 68, 0.06) !important;
  border-radius: 4px !important;
  position: relative !important;
  animation: toxguard-glow 2s ease-in-out infinite alternate !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
}
@keyframes toxguard-glow {
  from { box-shadow: 0 0 5px rgba(239, 68, 68, 0.3), inset 0 0 5px rgba(239, 68, 68, 0.05); }
  to   { box-shadow: 0 0 15px rgba(239, 68, 68, 0.5), inset 0 0 10px rgba(239, 68, 68, 0.08); }
}
.${TOXIC}:hover { outline-width: 4px !important; }

/* ── Medium (Yellow) ── */
.${MEDIUM} {
  outline: 3px solid #eab308 !important;
  outline-offset: 2px !important;
  background: rgba(234, 179, 8, 0.06) !important;
  border-radius: 4px !important;
  position: relative !important;
  animation: toxguard-glow-medium 2s ease-in-out infinite alternate !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
}
@keyframes toxguard-glow-medium {
  from { box-shadow: 0 0 5px rgba(234, 179, 8, 0.3), inset 0 0 5px rgba(234, 179, 8, 0.05); }
  to   { box-shadow: 0 0 15px rgba(234, 179, 8, 0.5), inset 0 0 10px rgba(234, 179, 8, 0.08); }
}
.${MEDIUM}:hover { outline-width: 4px !important; }

/* ── Safe (Green) ── */
.${SAFE} {
  outline: 3px solid #34d399 !important;
  outline-offset: 2px !important;
  background: rgba(52, 211, 153, 0.06) !important;
  border-radius: 4px !important;
  position: relative !important;
  animation: toxguard-glow-safe 2s ease-in-out infinite alternate !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
}
@keyframes toxguard-glow-safe {
  from { box-shadow: 0 0 5px rgba(52, 211, 153, 0.3), inset 0 0 5px rgba(52, 211, 153, 0.05); }
  to   { box-shadow: 0 0 15px rgba(52, 211, 153, 0.5), inset 0 0 10px rgba(52, 211, 153, 0.08); }
}
.${SAFE}:hover { outline-width: 4px !important; }

/* ═══════════════════════════════════════════════════════
   FLOATING TOOLTIP
   ═══════════════════════════════════════════════════════ */

#${TOOLTIP} {
  position: fixed !important;
  background: #1f1f2e !important;
  font-family: 'Inter', -apple-system, sans-serif !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  padding: 6px 12px !important;
  border-radius: 8px !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  z-index: 2147483647 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  opacity: 1 !important;
  transition: opacity 0.15s ease !important;
}

/* ═══════════════════════════════════════════════════════
   BADGE (bottom-right floating pill)
   ═══════════════════════════════════════════════════════ */

#${BADGE} {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  background: linear-gradient(135deg, #dc2626, #991b1b) !important;
  color: white !important;
  font-family: 'Inter', -apple-system, sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  padding: 10px 18px !important;
  border-radius: 50px !important;
  z-index: 999999 !important;
  box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4) !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  animation: toxguard-slideIn 0.5s ease !important;
}
#${BADGE}:hover {
  transform: scale(1.05) !important;
  box-shadow: 0 6px 25px rgba(220, 38, 38, 0.5) !important;
}
@keyframes toxguard-slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
#${BADGE} .badge-icon { font-size: 16px; }

/* ═══════════════════════════════════════════════════════
   MODAL — Overlay & Container
   ═══════════════════════════════════════════════════════ */

#${OVERLAY} {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.6) !important;
  backdrop-filter: blur(4px) !important;
  z-index: 2147483640 !important;
  opacity: 0;
  transition: opacity 0.3s ease !important;
}
#${OVERLAY}.tg-visible { opacity: 1; }

#${MODAL} {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) scale(0.9) !important;
  width: 480px !important;
  max-height: 85vh !important;
  background: #13131a !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 16px !important;
  z-index: 2147483641 !important;
  font-family: 'Inter', -apple-system, sans-serif !important;
  color: #e2e8f0 !important;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5) !important;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
#${MODAL}.tg-visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) !important;
}

/* ── Modal Header ── */
.tg-modal-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 20px 24px 16px !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
}
.tg-modal-title {
  font-size: 16px !important;
  font-weight: 700 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}
.tg-modal-close {
  width: 28px !important;
  height: 28px !important;
  border-radius: 8px !important;
  border: none !important;
  background: rgba(255,255,255,0.06) !important;
  color: #94a3b8 !important;
  font-size: 16px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: background 0.2s !important;
}
.tg-modal-close:hover { background: rgba(255,255,255,0.12) !important; }

.tg-modal-body {
  padding: 20px 24px !important;
  overflow-y: auto !important;
  flex: 1 !important;
}

/* ── Stat Cards ── */
.tg-stat-row {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 12px !important;
  margin-bottom: 20px !important;
}
.tg-stat-card {
  background: rgba(255,255,255,0.04) !important;
  border: 1px solid rgba(255,255,255,0.06) !important;
  border-radius: 12px !important;
  padding: 14px !important;
  text-align: center !important;
}
.tg-stat-number {
  font-size: 28px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}
.tg-stat-label {
  font-size: 11px !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  color: #94a3b8 !important;
  margin-top: 6px !important;
}
.tg-stat-number.toxic  { color: #f87171 !important; }
.tg-stat-number.medium { color: #fbbf24 !important; }
.tg-stat-number.safe   { color: #34d399 !important; }
.tg-stat-card.tg-toxic-card  { border-left: 3px solid #f87171 !important; }
.tg-stat-card.tg-medium-card { border-left: 3px solid #fbbf24 !important; }
.tg-stat-card.tg-safe-card   { border-left: 3px solid #34d399 !important; }

/* ── Category Bars ── */
.tg-section-title {
  font-size: 12px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  color: #94a3b8 !important;
  margin-bottom: 12px !important;
}
.tg-category-list { margin-bottom: 20px !important; }
.tg-category-item {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin-bottom: 10px !important;
}
.tg-cat-name {
  font-size: 12px !important;
  font-weight: 500 !important;
  width: 100px !important;
  flex-shrink: 0 !important;
  text-transform: capitalize !important;
  color: #cbd5e1 !important;
}
.tg-cat-bar-bg {
  flex: 1 !important;
  height: 10px !important;
  background: rgba(255,255,255,0.08) !important;
  border-radius: 5px !important;
  overflow: hidden !important;
}
.tg-cat-bar-fill {
  height: 100% !important;
  border-radius: 5px !important;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1) !important;
  width: 0;
  min-width: 4px;
}
.tg-cat-count {
  font-size: 12px !important;
  font-weight: 700 !important;
  width: 28px !important;
  text-align: right !important;
  flex-shrink: 0 !important;
}

/* ── Comment List ── */
.tg-comment-list { margin-top: 4px !important; }
.tg-comment-item {
  background: rgba(255,255,255,0.03) !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  border-radius: 10px !important;
  padding: 12px 14px !important;
  margin-bottom: 8px !important;
  cursor: pointer !important;
  transition: background 0.2s, border-color 0.2s, transform 0.15s !important;
}
.tg-comment-item:hover {
  background: rgba(255,255,255,0.06) !important;
  border-color: rgba(255,255,255,0.1) !important;
  transform: translateX(2px) !important;
}
.tg-comment-item.tg-item-toxic  { border-left: 3px solid rgba(248, 113, 113, 0.5) !important; }
.tg-comment-item.tg-item-medium { border-left: 3px solid rgba(251, 191, 36, 0.5) !important; }

.tg-comment-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 6px !important;
}
.tg-comment-severity {
  font-size: 10px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 2px 8px !important;
  border-radius: 4px !important;
}
.tg-comment-severity.toxic {
  background: rgba(248, 113, 113, 0.15) !important;
  color: #f87171 !important;
}
.tg-comment-severity.medium {
  background: rgba(251, 191, 36, 0.15) !important;
  color: #fbbf24 !important;
}
.tg-comment-category {
  font-size: 11px !important;
  color: #64748b !important;
}
.tg-comment-text {
  font-size: 13px !important;
  line-height: 1.5 !important;
  color: #94a3b8 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}
.tg-comment-author {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #60a5fa !important;
  margin-bottom: 4px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* ── Scrollbar ── */
.tg-modal-body::-webkit-scrollbar       { width: 4px !important; }
.tg-modal-body::-webkit-scrollbar-track  { background: transparent !important; }
.tg-modal-body::-webkit-scrollbar-thumb  {
  background: rgba(255,255,255,0.1) !important;
  border-radius: 2px !important;
}
`;
}
