/**
 * Health Monitor Module
 * Real-time service health monitoring with visual indicators
 */

class HealthMonitor {
  constructor() {
    this.healthData = {};
    this.retryCount = {};
    this.isMonitoring = false;
    this.checkInterval = null;
    
    // Bind methods
    this.updateHealth = this.updateHealth.bind(this);
    this.handleHealthError = this.handleHealthError.bind(this);
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    console.log('🔍 Starting health monitoring...');
    this.isMonitoring = true;
    
    // Initial check
    this.updateHealth();
    
    // Set up periodic checking
    this.checkInterval = setInterval(this.updateHealth, healthConfig.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    console.log('⏹️ Stopping health monitoring...');
    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Force update health status for all services
   */
  async updateHealth() {
    try {
      const response = await fetch(`${healthEndpoint}/api/health/all`, {
        signal: AbortSignal.timeout(healthConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`Health API error: ${response.status}`);
      }

      const healthData = await response.json();
      this.healthData = healthData;
      
      // Reset retry counts on successful update
      this.retryCount = {};
      
      // Update UI with new health data
      this.updateHealthIndicators();
      
      console.log('✅ Health status updated', healthData);
      
    } catch (error) {
      this.handleHealthError(error);
    }
  }

  /**
   * Handle health check errors with retry logic
   */
  handleHealthError(error) {
    console.error('❌ Health check failed:', error);
    
    // Increment retry count
    const retryKey = 'global';
    this.retryCount[retryKey] = (this.retryCount[retryKey] || 0) + 1;
    
    // Mark all services as unknown status
    Object.keys(this.healthData).forEach(serviceId => {
      this.healthData[serviceId] = {
        ...this.healthData[serviceId],
        status: 'unknown',
        error: 'Health service unavailable'
      };
    });
    
    this.updateHealthIndicators();
    
    // Retry with exponential backoff (max 3 retries)
    if (this.retryCount[retryKey] <= 3) {
      const retryDelay = healthConfig.retryInterval * Math.pow(2, this.retryCount[retryKey] - 1);
      console.log(`🔄 Retrying health check in ${retryDelay}ms (attempt ${this.retryCount[retryKey]})`);
      
      setTimeout(() => {
        if (this.isMonitoring) {
          this.updateHealth();
        }
      }, retryDelay);
    }
  }

  /**
   * Update health indicators in the UI
   */
  updateHealthIndicators() {
    // Update app cards with health status
    apps.forEach(app => {
      const appCard = document.querySelector(`[data-app-id="${app.id}"]`);
      if (!appCard) return;
      
      // Skip external services
      if (externalServices.includes(app.id)) {
        this.setHealthIndicator(appCard, 'external');
        return;
      }
      
      const health = this.healthData[app.id];
      if (health) {
        this.setHealthIndicator(appCard, health.status, health.response_time, health.error);
      } else {
        this.setHealthIndicator(appCard, 'unknown');
      }
    });
    
    // Update header status indicator
    this.updateHeaderStatus();
  }

  /**
   * Set health indicator for an app card
   */
  setHealthIndicator(appCard, status, responseTime = null, error = null) {
    // Remove existing health indicators
    const existingIndicator = appCard.querySelector('.health-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new health indicator
    const indicator = document.createElement('div');
    indicator.className = `health-indicator health-${status}`;
    
    // Set indicator content based on status
    const statusConfig = {
      online: { symbol: '●', color: '#00ff00', tooltip: `Online${responseTime ? ` (${responseTime}ms)` : ''}` },
      degraded: { symbol: '●', color: '#ffaa00', tooltip: `Degraded${responseTime ? ` (${responseTime}ms)` : ''}` },
      offline: { symbol: '●', color: '#ff4444', tooltip: error || 'Offline' },
      unknown: { symbol: '●', color: '#666666', tooltip: 'Status unknown' },
      external: { symbol: '↗', color: '#00ccff', tooltip: 'External service' }
    };
    
    const config = statusConfig[status] || statusConfig.unknown;
    
    indicator.innerHTML = config.symbol;
    indicator.style.color = config.color;
    indicator.title = config.tooltip;
    
    // Position indicator
    indicator.style.cssText += `
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
      text-shadow: 0 0 4px rgba(0,0,0,0.8);
      transition: all 0.3s ease;
      cursor: help;
    `;
    
    // Add hover effects
    indicator.addEventListener('mouseenter', () => {
      indicator.style.transform = 'scale(1.2)';
      indicator.style.textShadow = `0 0 8px ${config.color}`;
    });
    
    indicator.addEventListener('mouseleave', () => {
      indicator.style.transform = 'scale(1)';
      indicator.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
    });
    
    appCard.appendChild(indicator);
  }

  /**
   * Update header status indicator
   */
  updateHeaderStatus() {
    const services = Object.values(this.healthData);
    const onlineCount = services.filter(s => s.status === 'online').length;
    const totalCount = services.length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const offlineCount = services.filter(s => s.status === 'offline').length;
    
    // Find or create header status indicator
    let headerStatus = document.querySelector('.header-status');
    if (!headerStatus) {
      headerStatus = document.createElement('div');
      headerStatus.className = 'header-status';
      headerStatus.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        font-size: 14px;
        color: #cccccc;
        font-family: 'JetBrains Mono', monospace;
      `;
      
      const header = document.querySelector('header');
      if (header) {
        header.appendChild(headerStatus);
      }
    }
    
    // Determine overall status
    let overallStatus = 'online';
    let statusColor = '#00ff00';
    
    if (offlineCount > 0) {
      overallStatus = 'degraded';
      statusColor = '#ff4444';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
      statusColor = '#ffaa00';
    }
    
    headerStatus.innerHTML = `
      <span style="color: ${statusColor};">●</span>
      <span>${onlineCount}/${totalCount} services online</span>
    `;
    
    headerStatus.title = `Online: ${onlineCount}, Degraded: ${degradedCount}, Offline: ${offlineCount}`;
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceId) {
    return this.healthData[serviceId] || null;
  }

  /**
   * Get overall system health summary
   */
  getSystemHealth() {
    const services = Object.values(this.healthData);
    return {
      total: services.length,
      online: services.filter(s => s.status === 'online').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      offline: services.filter(s => s.status === 'offline').length,
      unknown: services.filter(s => s.status === 'unknown').length
    };
  }

  /**
   * Force a health check for a specific service
   */
  async checkServiceHealth(serviceId) {
    try {
      const response = await fetch(`${healthEndpoint}/api/health/${serviceId}`, {
        signal: AbortSignal.timeout(healthConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const health = await response.json();
      this.healthData[serviceId] = health;
      this.updateHealthIndicators();
      
      return health;
    } catch (error) {
      console.error(`Failed to check health for ${serviceId}:`, error);
      return null;
    }
  }
}

// Create global health monitor instance
const healthMonitor = new HealthMonitor();

// Export for use in other modules
window.healthMonitor = healthMonitor;