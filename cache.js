/**
 * Cache utility for storing and retrieving video summaries
 * Uses chrome.storage.local with TTL support
 */

const CACHE_PREFIX = 'yt_summary_';
const DEFAULT_TTL_HOURS = 168; // 7 days

class SummaryCache {
  /**
   * Get a cached summary by video ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<object|null>} Cached summary or null if not found/expired
   */
  async get(videoId) {
    const key = CACHE_PREFIX + videoId;

    try {
      const result = await chrome.storage.local.get(key);
      const cached = result[key];

      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        await this.delete(videoId);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store a summary in cache
   * @param {string} videoId - YouTube video ID
   * @param {object} data - Summary data to cache
   * @param {number} ttlHours - Time to live in hours
   */
  async set(videoId, data, ttlHours = DEFAULT_TTL_HOURS) {
    const key = CACHE_PREFIX + videoId;
    const expiresAt = Date.now() + (ttlHours * 60 * 60 * 1000);

    try {
      await chrome.storage.local.set({
        [key]: {
          data,
          expiresAt,
          cachedAt: Date.now()
        }
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete a cached summary
   * @param {string} videoId - YouTube video ID
   */
  async delete(videoId) {
    const key = CACHE_PREFIX + videoId;

    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cached summaries
   */
  async clear() {
    try {
      const items = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(items).filter(key =>
        key.startsWith(CACHE_PREFIX)
      );

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }

      return keysToRemove.length;
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const items = await chrome.storage.local.get(null);
      const cacheItems = Object.entries(items)
        .filter(([key]) => key.startsWith(CACHE_PREFIX))
        .map(([, value]) => value);

      const now = Date.now();
      const valid = cacheItems.filter(item =>
        !item.expiresAt || now <= item.expiresAt
      );

      return {
        total: cacheItems.length,
        valid: valid.length,
        expired: cacheItems.length - valid.length
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { total: 0, valid: 0, expired: 0 };
    }
  }
}

// Export for service worker
self.SummaryCache = SummaryCache;
