/**
 * Loading States Manager
 * Handles skeleton screens, loading indicators, and error states with retry functionality
 */

class LoadingStatesManager {
  constructor() {
    this.connectionStatus = 'unknown';
    this.statusIndicator = null;
    this.retryAttempts = {};
    this.maxRetries = 3;
    
    this.initializeConnectionStatus();
  }

  /**
   * Initialize connection status indicator
   */
  initializeConnectionStatus() {
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.className = 'connection-status';
    this.statusIndicator.innerHTML = `
      <span class="status-dot">●</span>
      <span class="status-text">Checking connection...</span>
    `;
    document.body.appendChild(this.statusIndicator);
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status, message = '') {
    if (!this.statusIndicator) return;
    
    this.connectionStatus = status;
    
    // Remove existing status classes
    this.statusIndicator.classList.remove('online', 'offline', 'reconnecting');
    
    // Add new status class
    this.statusIndicator.classList.add(status);
    
    const statusMessages = {
      online: '🟢 All services connected',
      offline: '🔴 Connection lost',
      reconnecting: '🟡 Reconnecting...',
      degraded: '🟠 Some services unavailable'
    };
    
    const statusText = message || statusMessages[status] || 'Unknown status';
    this.statusIndicator.querySelector('.status-text').textContent = statusText;
    
    // Show indicator
    this.statusIndicator.classList.add('show');
    
    // Auto-hide after 3 seconds if online
    if (status === 'online') {
      setTimeout(() => {
        this.statusIndicator.classList.remove('show');
      }, 3000);
    }
  }

  /**
   * Show skeleton loading for app grid
   */
  showAppGridSkeleton() {
    const appsContainer = document.getElementById('apps');
    if (!appsContainer) return;
    
    appsContainer.innerHTML = '';
    
    // Create skeleton app cards
    for (let i = 0; i < 12; i++) {
      const skeletonCard = document.createElement('div');
      skeletonCard.className = 'skeleton-app-card';
      skeletonCard.innerHTML = `
        <div class="skeleton-app-image"></div>
        <div class="skeleton-app-name"></div>
      `;
      appsContainer.appendChild(skeletonCard);
    }
  }

  /**
   * Show skeleton loading for activity feed
   */
  showActivityFeedSkeleton() {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;
    
    activityFeed.innerHTML = '';
    
    // Create skeleton activity items
    for (let i = 0; i < 6; i++) {
      const skeletonItem = document.createElement('div');
      skeletonItem.className = 'skeleton-activity-item';
      skeletonItem.innerHTML = `
        <div class="skeleton-activity-poster"></div>
        <div class="skeleton-activity-content">
          <div class="skeleton-activity-title"></div>
          <div class="skeleton-activity-subtitle"></div>
          <div class="skeleton-activity-meta">
            <div class="skeleton-activity-badge"></div>
            <div class="skeleton-activity-badge" style="width: 40px;"></div>
          </div>
        </div>
      `;
      activityFeed.appendChild(skeletonItem);
    }
  }

  /**
   * Show progressive image loading with fallback
   */
  progressiveImageLoad(imgElement, src, fallbackSrc = null) {
    // Create a new image to preload
    const img = new Image();
    
    // Add loading class
    imgElement.classList.add('loading');
    
    img.onload = () => {
      imgElement.src = src;
      imgElement.classList.remove('loading');
      imgElement.classList.add('loaded');
    };
    
    img.onerror = () => {
      if (fallbackSrc) {
        imgElement.src = fallbackSrc;
      } else {
        // Generate placeholder
        const firstLetter = imgElement.alt ? imgElement.alt.charAt(0).toUpperCase() : '?';
        imgElement.src = `https://via.placeholder.com/140x140/333/fff?text=${encodeURIComponent(firstLetter)}`;
      }
      imgElement.classList.remove('loading');
      imgElement.classList.add('error');
    };
    
    // Start loading
    img.src = src;
  }

  /**
   * Show error state with retry functionality
   */
  showErrorState(container, error, retryCallback, context = 'general') {
    const errorId = `${context}_${Date.now()}`;
    
    container.innerHTML = `
      <div class="error-container" data-error-id="${errorId}">
        <div class="error-icon">⚠️</div>
        <div class="error-message">Something went wrong</div>
        <div class="error-details">${error.message || error}</div>
        <button class="retry-button" onclick="window.loadingManager.handleRetry('${errorId}', '${context}')">
          Retry
        </button>
      </div>
    `;
    
    // Store retry callback
    this.retryAttempts[errorId] = {
      callback: retryCallback,
      attempts: 0,
      context: context
    };
  }

  /**
   * Handle retry attempts with exponential backoff
   */
  async handleRetry(errorId, context) {
    const retryInfo = this.retryAttempts[errorId];
    if (!retryInfo) return;
    
    const button = document.querySelector(`[data-error-id="${errorId}"] .retry-button`);
    if (!button) return;
    
    // Check if max retries exceeded
    if (retryInfo.attempts >= this.maxRetries) {
      button.textContent = 'Max retries exceeded';
      button.disabled = true;
      return;
    }
    
    // Update button state
    button.classList.add('loading');
    button.disabled = true;
    button.textContent = `Retrying... (${retryInfo.attempts + 1}/${this.maxRetries})`;
    
    // Update connection status
    this.updateConnectionStatus('reconnecting', 'Attempting to reconnect...');
    
    try {
      // Calculate delay with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryInfo.attempts), 10000);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Execute retry callback
      await retryInfo.callback();
      
      // Success - cleanup
      delete this.retryAttempts[errorId];
      this.updateConnectionStatus('online', 'Connection restored');
      
    } catch (error) {
      console.error(`Retry ${retryInfo.attempts + 1} failed for ${context}:`, error);
      
      retryInfo.attempts++;
      
      // Update button state
      button.classList.remove('loading');
      button.disabled = false;
      
      if (retryInfo.attempts >= this.maxRetries) {
        button.textContent = 'Max retries exceeded';
        button.disabled = true;
        this.updateConnectionStatus('offline', 'Connection failed - manual intervention required');
      } else {
        button.textContent = 'Retry';
        this.updateConnectionStatus('offline', `Retry ${retryInfo.attempts}/${this.maxRetries} failed`);
      }
    }
  }

  /**
   * Show graceful degradation state
   */
  showDegradedState(container, message, partialData = null) {
    container.innerHTML = `
      <div class="degraded-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 24px;
        text-align: center;
        color: #ffaa00;
        background: rgba(255, 170, 0, 0.05);
        border: 1px solid rgba(255, 170, 0, 0.2);
        border-radius: 8px;
      ">
        <div style="font-size: 32px;">⚠️</div>
        <div style="font-size: 14px; font-weight: 600;">Service Partially Available</div>
        <div style="font-size: 12px; color: #999; max-width: 400px; line-height: 1.4;">
          ${message}
        </div>
        ${partialData ? '<div style="font-size: 11px; color: #666; margin-top: 8px;">Showing cached data</div>' : ''}
      </div>
    `;
  }

  /**
   * Show timeout state
   */
  showTimeoutState(container, timeoutDuration, retryCallback, context = 'timeout') {
    const errorId = `timeout_${context}_${Date.now()}`;
    
    container.innerHTML = `
      <div class="error-container" data-error-id="${errorId}">
        <div class="error-icon">⏱️</div>
        <div class="error-message">Request Timeout</div>
        <div class="error-details">
          The request took longer than ${timeoutDuration}ms to complete. 
          This might be due to network issues or server overload.
        </div>
        <button class="retry-button" onclick="window.loadingManager.handleRetry('${errorId}', '${context}')">
          Try Again
        </button>
      </div>
    `;
    
    // Store retry callback
    this.retryAttempts[errorId] = {
      callback: retryCallback,
      attempts: 0,
      context: context
    };
  }

  /**
   * Clear all error states and retry attempts
   */
  clearAllErrors() {
    this.retryAttempts = {};
    
    // Remove error containers
    document.querySelectorAll('.error-container, .degraded-container').forEach(container => {
      container.remove();
    });
    
    this.updateConnectionStatus('online');
  }

  /**
   * Preload images with progressive enhancement
   */
  preloadImages(images, onProgress = null) {
    let loadedCount = 0;
    const totalCount = images.length;
    
    return Promise.all(
      images.map((imageSrc, index) => {
        return new Promise((resolve) => {
          const img = new Image();
          
          img.onload = img.onerror = () => {
            loadedCount++;
            if (onProgress) {
              onProgress(loadedCount, totalCount, index, imageSrc);
            }
            resolve();
          };
          
          img.src = imageSrc;
        });
      })
    );
  }

  /**
   * Add image loading indicators
   */
  enhanceImages() {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      // Add loading placeholder
      img.style.backgroundColor = '#1a1a1a';
      img.style.background = 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)';
      img.style.backgroundSize = '200% 100%';
      img.style.animation = 'shimmer 2s infinite';
      
      // Remove loading effect when image loads
      img.addEventListener('load', () => {
        img.style.background = '';
        img.style.animation = '';
      });
      
      // Handle loading errors
      img.addEventListener('error', () => {
        img.style.background = '#333';
        img.style.animation = '';
      });
    });
  }
}

// Create global loading manager instance
const loadingManager = new LoadingStatesManager();

// Export for use in other modules
window.loadingManager = loadingManager;