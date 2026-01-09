/**
 * Tooltip component for displaying video summaries
 */

class SummaryTooltip {
  constructor() {
    this.element = null;
    this.isVisible = false;
  }

  /**
   * Create tooltip element
   */
  create() {
    if (this.element) {
      return this.element;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'yt-summarizer-tooltip';
    tooltip.id = 'yt-summarizer-tooltip';
    document.body.appendChild(tooltip);

    this.element = tooltip;
    return tooltip;
  }

  /**
   * Show loading state
   */
  showLoading(title, channel) {
    const tooltip = this.create();

    tooltip.innerHTML = `
      <div class="yt-summarizer-tooltip-header">
        <h3 class="yt-summarizer-tooltip-title">${this._escapeHtml(title || 'Loading...')}</h3>
        ${channel ? `<div class="yt-summarizer-tooltip-channel">${this._escapeHtml(channel)}</div>` : ''}
      </div>
      <div class="yt-summarizer-tooltip-loading">
        <div class="yt-summarizer-spinner"></div>
        <div class="yt-summarizer-loading-text">Generating summary...</div>
      </div>
    `;

    this.isVisible = true;
    setTimeout(() => tooltip.classList.add('visible'), 10);
  }

  /**
   * Show summary
   */
  showSummary(data, fromCache = false) {
    const tooltip = this.create();

    // Handle both new format (simple summary string) and old format (structured data)
    let summary, takeaways, disclaimer, metadata, providerInfo;

    if (typeof data === 'string') {
      // Simple string summary
      summary = data;
      metadata = {};
    } else {
      // Structured data
      summary = data.summary;
      takeaways = data.takeaways;
      disclaimer = data.disclaimer;
      metadata = data.metadata || {};
      providerInfo = data.providerInfo || '';
    }

    let html = `
      <div class="yt-summarizer-tooltip-header">
        <h3 class="yt-summarizer-tooltip-title">
          ${this._escapeHtml(metadata?.title || 'Video Summary')}
          ${fromCache ? '<span class="yt-summarizer-cache-badge">Cached</span>' : ''}
          ${providerInfo || ''}
        </h3>
        ${metadata?.channel ? `<div class="yt-summarizer-tooltip-channel">${this._escapeHtml(metadata.channel)}</div>` : ''}
      </div>
    `;

    if (disclaimer) {
      html += `
        <div class="yt-summarizer-tooltip-disclaimer">
          ⚠️ ${this._escapeHtml(disclaimer)}
        </div>
      `;
    }

    // Handle summary - can be string or array
    if (summary) {
      html += `<div class="yt-summarizer-tooltip-section">`;
      html += `<div class="yt-summarizer-tooltip-section-title">Summary</div>`;

      if (Array.isArray(summary) && summary.length > 0) {
        html += `<ul class="yt-summarizer-tooltip-list">
          ${summary.map(item => `<li>${this._escapeHtml(item)}</li>`).join('')}
        </ul>`;
      } else if (typeof summary === 'string') {
        html += `<p style="margin: 8px 0; line-height: 1.5;">${this._escapeHtml(summary)}</p>`;
      }
      html += `</div>`;
    }

    if (takeaways && takeaways.length > 0) {
      html += `
        <div class="yt-summarizer-tooltip-section">
          <div class="yt-summarizer-tooltip-section-title">Key Takeaways</div>
          <ul class="yt-summarizer-tooltip-list yt-summarizer-tooltip-takeaways">
            ${takeaways.map(item => `<li>${this._escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    tooltip.innerHTML = html;

    this.isVisible = true;
    setTimeout(() => tooltip.classList.add('visible'), 10);
  }

  /**
   * Show error message
   */
  showError(message, needsSetup = false) {
    const tooltip = this.create();

    let errorHtml = `<strong>Error</strong>`;

    if (needsSetup) {
      errorHtml += `
        Please configure your Gemini API key in the extension settings.
        <br><br>
        Right-click the extension icon → Options
      `;
    } else {
      errorHtml += this._escapeHtml(message);
    }

    tooltip.innerHTML = `
      <div class="yt-summarizer-tooltip-error">
        ${errorHtml}
      </div>
    `;

    this.isVisible = true;
    setTimeout(() => tooltip.classList.add('visible'), 10);
  }

  /**
   * Position tooltip near cursor
   */
  position(x, y) {
    if (!this.element) {
      return;
    }

    const tooltip = this.element;
    const offset = 15;
    const padding = 10;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get tooltip dimensions
    const rect = tooltip.getBoundingClientRect();
    const tooltipWidth = rect.width;
    const tooltipHeight = rect.height;

    // Calculate initial position (below and to the right of cursor)
    let left = x + offset;
    let top = y + offset;

    // Adjust if tooltip would go off right edge
    if (left + tooltipWidth + padding > viewportWidth) {
      left = x - tooltipWidth - offset;
    }

    // Adjust if tooltip would go off bottom edge
    if (top + tooltipHeight + padding > viewportHeight) {
      top = y - tooltipHeight - offset;
    }

    // Ensure tooltip doesn't go off left edge
    if (left < padding) {
      left = padding;
    }

    // Ensure tooltip doesn't go off top edge
    if (top < padding) {
      top = padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hide and remove tooltip
   */
  hide() {
    if (!this.element) {
      return;
    }

    this.element.classList.remove('visible');

    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.element = null;
      this.isVisible = false;
    }, 200);
  }

  /**
   * Escape HTML to prevent XSS
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for content script
window.SummaryTooltip = SummaryTooltip;
