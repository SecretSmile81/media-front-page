/**
 * Quick Actions Panel
 * Floating action button with expandable quick actions for common media server tasks
 */

class QuickActionsPanel {
  constructor() {
    this.isOpen = false;
    this.fab = null;
    this.actionsMenu = null;
    this.actions = [];
    
    this.initializeActions();
    this.createQuickActionsPanel();
    this.bindEvents();
  }

  /**
   * Initialize available quick actions
   */
  initializeActions() {
    this.actions = [
      {
        id: 'search',
        icon: '🔍',
        title: 'Global Search',
        description: 'Search across all services',
        shortcut: 'Ctrl+K',
        action: () => this.triggerGlobalSearch(),
        category: 'navigation'
      },
      {
        id: 'pause_downloads',
        icon: '⏸️',
        title: 'Pause Downloads',
        description: 'Pause all active downloads',
        action: () => this.pauseAllDownloads(),
        category: 'downloads'
      },
      {
        id: 'resume_downloads',
        icon: '▶️',
        title: 'Resume Downloads',
        description: 'Resume paused downloads',
        action: () => this.resumeAllDownloads(),
        category: 'downloads'
      },
      {
        id: 'restart_services',
        icon: '🔄',
        title: 'Restart Services',
        description: 'Restart all media services',
        action: () => this.showRestartMenu(),
        category: 'system'
      },
      {
        id: 'quick_request',
        icon: '➕',
        title: 'Quick Request',
        description: 'Add content to Jellyseerr',
        action: () => this.showQuickRequestDialog(),
        category: 'content'
      },
      {
        id: 'system_info',
        icon: '📊',
        title: 'System Overview',
        description: 'View system stats',
        action: () => this.showSystemOverview(),
        category: 'system'
      },
      {
        id: 'force_refresh',
        icon: '🔃',
        title: 'Force Refresh',
        description: 'Refresh all data',
        action: () => this.forceRefreshAll(),
        category: 'system'
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: 'Settings',
        description: 'App preferences',
        action: () => this.showSettings(),
        category: 'system'
      }
    ];
  }

  /**
   * Create the quick actions panel
   */
  createQuickActionsPanel() {
    // Create floating action button
    this.fab = document.createElement('div');
    this.fab.className = 'quick-actions-fab';
    this.fab.innerHTML = `
      <div class="fab-button" title="Quick Actions">
        <span class="fab-icon">⚡</span>
        <span class="fab-close-icon">✕</span>
      </div>
    `;

    // Create actions menu
    this.actionsMenu = document.createElement('div');
    this.actionsMenu.className = 'quick-actions-menu';
    
    // Group actions by category
    const categorizedActions = this.groupActionsByCategory();
    
    let menuHTML = '<div class="quick-actions-header">Quick Actions</div>';
    
    Object.entries(categorizedActions).forEach(([category, actions]) => {
      menuHTML += `
        <div class="quick-actions-category">
          <div class="category-title">${this.getCategoryTitle(category)}</div>
          <div class="category-actions">
            ${actions.map(action => this.createActionItem(action)).join('')}
          </div>
        </div>
      `;
    });
    
    this.actionsMenu.innerHTML = menuHTML;

    // Append to body
    document.body.appendChild(this.fab);
    document.body.appendChild(this.actionsMenu);
  }

  /**
   * Group actions by category
   */
  groupActionsByCategory() {
    const categories = {};
    
    this.actions.forEach(action => {
      const category = action.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(action);
    });
    
    return categories;
  }

  /**
   * Get category title
   */
  getCategoryTitle(category) {
    const titles = {
      navigation: '🧭 Navigation',
      downloads: '⬇️ Downloads',
      content: '🎬 Content',
      system: '🔧 System',
      other: '📋 Other'
    };
    
    return titles[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Create action item HTML
   */
  createActionItem(action) {
    return `
      <div class="quick-action-item" data-action="${action.id}" onclick="quickActions.executeAction('${action.id}')">
        <div class="action-icon">${action.icon}</div>
        <div class="action-content">
          <div class="action-title">${action.title}</div>
          <div class="action-description">${action.description}</div>
          ${action.shortcut ? `<div class="action-shortcut">${action.shortcut}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Bind events
   */
  bindEvents() {
    // FAB click event
    this.fab.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleActions();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.actionsMenu.contains(e.target)) {
        this.closeActions();
      }
    });

    // Prevent menu close when clicking inside
    this.actionsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        this.closeActions();
      }

      // Alt+Q to toggle quick actions
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        this.toggleActions();
      }
    });
  }

  /**
   * Toggle actions menu
   */
  toggleActions() {
    if (this.isOpen) {
      this.closeActions();
    } else {
      this.openActions();
    }
  }

  /**
   * Open actions menu
   */
  openActions() {
    this.isOpen = true;
    this.fab.classList.add('fab-open');
    this.actionsMenu.classList.add('actions-open');
    
    // Animate action items
    const items = this.actionsMenu.querySelectorAll('.quick-action-item');
    items.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('action-visible');
      }, index * 50);
    });
  }

  /**
   * Close actions menu
   */
  closeActions() {
    this.isOpen = false;
    this.fab.classList.remove('fab-open');
    this.actionsMenu.classList.remove('actions-open');
    
    // Remove animation classes
    const items = this.actionsMenu.querySelectorAll('.quick-action-item');
    items.forEach(item => {
      item.classList.remove('action-visible');
    });
  }

  /**
   * Execute action by ID
   */
  executeAction(actionId) {
    const action = this.actions.find(a => a.id === actionId);
    if (action && action.action) {
      action.action();
      this.closeActions();
    }
  }

  /**
   * Trigger global search
   */
  triggerGlobalSearch() {
    if (window.globalSearch) {
      globalSearch.openSearch();
    } else {
      console.warn('Global search not available');
    }
  }

  /**
   * Pause all downloads
   */
  async pauseAllDownloads() {
    try {
      // Show loading indicator
      this.showActionProgress('Pausing downloads...');
      
      // Mock API calls to pause downloads
      const pausePromises = [
        this.pauseServiceDownloads('sabnzbd'),
        this.pauseServiceDownloads('sonarr'),
        this.pauseServiceDownloads('radarr')
      ];
      
      await Promise.allSettled(pausePromises);
      
      this.showActionSuccess('Downloads paused');
      
      // Refresh activity feed
      if (window.updateMediaActivity) {
        setTimeout(updateMediaActivity, 1000);
      }
      
    } catch (error) {
      this.showActionError('Failed to pause downloads', error.message);
    }
  }

  /**
   * Resume all downloads
   */
  async resumeAllDownloads() {
    try {
      this.showActionProgress('Resuming downloads...');
      
      const resumePromises = [
        this.resumeServiceDownloads('sabnzbd'),
        this.resumeServiceDownloads('sonarr'),
        this.resumeServiceDownloads('radarr')
      ];
      
      await Promise.allSettled(resumePromises);
      
      this.showActionSuccess('Downloads resumed');
      
      if (window.updateMediaActivity) {
        setTimeout(updateMediaActivity, 1000);
      }
      
    } catch (error) {
      this.showActionError('Failed to resume downloads', error.message);
    }
  }

  /**
   * Pause service downloads (mock implementation)
   */
  async pauseServiceDownloads(service) {
    console.log(`Pausing downloads for ${service}`);
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // In real implementation, this would call the service's API
  }

  /**
   * Resume service downloads (mock implementation)
   */
  async resumeServiceDownloads(service) {
    console.log(`Resuming downloads for ${service}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Show restart menu
   */
  showRestartMenu() {
    this.showActionModal('Restart Services', `
      <div class="restart-services-modal">
        <p>Select services to restart:</p>
        <div class="service-checkboxes">
          ${['sonarr', 'radarr', 'lidarr', 'bazarr', 'prowlarr', 'sabnzbd'].map(service => `
            <label class="service-checkbox">
              <input type="checkbox" value="${service}" checked>
              <span class="checkbox-label">${service.charAt(0).toUpperCase() + service.slice(1)}</span>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="quickActions.closeActionModal()">Cancel</button>
          <button class="modal-btn modal-btn-primary" onclick="quickActions.executeRestartServices()">Restart Selected</button>
        </div>
      </div>
    `);
  }

  /**
   * Execute restart services
   */
  async executeRestartServices() {
    const checkboxes = document.querySelectorAll('.service-checkbox input:checked');
    const services = Array.from(checkboxes).map(cb => cb.value);
    
    this.closeActionModal();
    
    if (services.length === 0) {
      this.showActionError('No services selected');
      return;
    }
    
    try {
      this.showActionProgress(`Restarting ${services.length} service(s)...`);
      
      // Mock restart
      for (const service of services) {
        console.log(`Restarting ${service}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.showActionSuccess(`Restarted ${services.length} service(s)`);
      
      // Force health check update
      if (window.healthMonitor) {
        setTimeout(() => healthMonitor.updateHealth(), 2000);
      }
      
    } catch (error) {
      this.showActionError('Failed to restart services', error.message);
    }
  }

  /**
   * Show quick request dialog
   */
  showQuickRequestDialog() {
    this.showActionModal('Quick Request', `
      <div class="quick-request-modal">
        <div class="request-type-selector">
          <button class="request-type-btn active" data-type="movie">🎬 Movie</button>
          <button class="request-type-btn" data-type="tv">📺 TV Show</button>
        </div>
        <div class="request-form">
          <input type="text" class="request-input" placeholder="Enter movie or TV show title..." autocomplete="off">
          <div class="request-suggestions"></div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="quickActions.closeActionModal()">Cancel</button>
          <button class="modal-btn modal-btn-primary" onclick="quickActions.submitQuickRequest()">Add Request</button>
        </div>
      </div>
    `);

    // Add event listeners for request form
    const typeButtons = document.querySelectorAll('.request-type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        typeButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    const requestInput = document.querySelector('.request-input');
    requestInput.addEventListener('input', (e) => {
      this.searchRequestSuggestions(e.target.value);
    });

    requestInput.focus();
  }

  /**
   * Search for request suggestions
   */
  async searchRequestSuggestions(query) {
    if (query.length < 3) {
      document.querySelector('.request-suggestions').innerHTML = '';
      return;
    }

    const suggestionsContainer = document.querySelector('.request-suggestions');
    suggestionsContainer.innerHTML = '<div class="loading-suggestions">Searching...</div>';

    try {
      // Mock search - in real implementation, this would call TMDb API
      setTimeout(() => {
        const mockResults = [
          { title: `${query} (2024)`, type: 'movie', id: 1 },
          { title: `${query}: The Series`, type: 'tv', id: 2 },
          { title: `The ${query} Movie`, type: 'movie', id: 3 }
        ];

        suggestionsContainer.innerHTML = mockResults.map(result => `
          <div class="request-suggestion" onclick="quickActions.selectRequestSuggestion('${result.title}')">
            <span class="suggestion-type">${result.type === 'movie' ? '🎬' : '📺'}</span>
            <span class="suggestion-title">${result.title}</span>
          </div>
        `).join('');
      }, 500);

    } catch (error) {
      suggestionsContainer.innerHTML = '<div class="error-suggestions">Search failed</div>';
    }
  }

  /**
   * Select request suggestion
   */
  selectRequestSuggestion(title) {
    document.querySelector('.request-input').value = title;
    document.querySelector('.request-suggestions').innerHTML = '';
  }

  /**
   * Submit quick request
   */
  submitQuickRequest() {
    const title = document.querySelector('.request-input').value.trim();
    const type = document.querySelector('.request-type-btn.active').dataset.type;

    if (!title) {
      this.showActionError('Please enter a title');
      return;
    }

    this.closeActionModal();
    this.showActionProgress(`Adding ${type} request...`);

    // Mock request submission
    setTimeout(() => {
      this.showActionSuccess(`"${title}" added to requests`);
    }, 1000);
  }

  /**
   * Show system overview
   */
  showSystemOverview() {
    const healthData = window.healthMonitor ? healthMonitor.getSystemHealth() : { online: 0, total: 0 };
    
    this.showActionModal('System Overview', `
      <div class="system-overview-modal">
        <div class="overview-section">
          <h4>🔌 Service Health</h4>
          <div class="health-summary">
            <div class="health-stat">
              <span class="stat-label">Online:</span>
              <span class="stat-value online">${healthData.online}</span>
            </div>
            <div class="health-stat">
              <span class="stat-label">Total:</span>
              <span class="stat-value">${healthData.total}</span>
            </div>
          </div>
        </div>
        <div class="overview-section">
          <h4>📊 Quick Stats</h4>
          <div class="quick-stats">
            <div class="stat-item">
              <span class="stat-icon">💾</span>
              <span class="stat-text">Storage monitoring active</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🔄</span>
              <span class="stat-text">Auto-refresh enabled</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🌐</span>
              <span class="stat-text">External services accessible</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-primary" onclick="quickActions.closeActionModal()">Close</button>
        </div>
      </div>
    `);
  }

  /**
   * Force refresh all data
   */
  async forceRefreshAll() {
    try {
      this.showActionProgress('Refreshing all data...');
      
      // Refresh health status
      if (window.healthMonitor) {
        await healthMonitor.updateHealth();
      }
      
      // Refresh media activity
      if (window.updateMediaActivity) {
        await updateMediaActivity();
      }
      
      // Refresh system stats
      if (window.updateAllStats) {
        await updateAllStats();
      }
      
      this.showActionSuccess('All data refreshed');
      
    } catch (error) {
      this.showActionError('Refresh failed', error.message);
    }
  }

  /**
   * Show settings
   */
  showSettings() {
    this.showActionModal('Settings', `
      <div class="settings-modal">
        <div class="settings-section">
          <h4>🎨 Appearance</h4>
          <label class="settings-option">
            <input type="checkbox" id="darkMode" checked>
            <span>Dark mode</span>
          </label>
          <label class="settings-option">
            <input type="checkbox" id="animations" checked>
            <span>Smooth animations</span>
          </label>
        </div>
        <div class="settings-section">
          <h4>🔄 Auto-refresh</h4>
          <label class="settings-option">
            <span>Health check interval:</span>
            <select id="healthInterval">
              <option value="15">15 seconds</option>
              <option value="30" selected>30 seconds</option>
              <option value="60">1 minute</option>
            </select>
          </label>
          <label class="settings-option">
            <span>Activity refresh:</span>
            <select id="activityInterval">
              <option value="5">5 seconds</option>
              <option value="10" selected>10 seconds</option>
              <option value="30">30 seconds</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="quickActions.closeActionModal()">Cancel</button>
          <button class="modal-btn modal-btn-primary" onclick="quickActions.saveSettings()">Save Settings</button>
        </div>
      </div>
    `);
  }

  /**
   * Save settings
   */
  saveSettings() {
    const settings = {
      darkMode: document.getElementById('darkMode').checked,
      animations: document.getElementById('animations').checked,
      healthInterval: parseInt(document.getElementById('healthInterval').value),
      activityInterval: parseInt(document.getElementById('activityInterval').value)
    };

    localStorage.setItem('shadowMoses_settings', JSON.stringify(settings));
    
    this.closeActionModal();
    this.showActionSuccess('Settings saved');
    
    // Apply settings
    this.applySettings(settings);
  }

  /**
   * Apply settings
   */
  applySettings(settings) {
    // Apply theme
    document.body.classList.toggle('light-mode', !settings.darkMode);
    
    // Apply animations
    document.body.classList.toggle('no-animations', !settings.animations);
    
    // Update intervals would be handled by the respective modules
    console.log('Settings applied:', settings);
  }

  /**
   * Show action modal
   */
  showActionModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'action-modal';
    modal.innerHTML = `
      <div class="action-modal-overlay"></div>
      <div class="action-modal-container">
        <div class="action-modal-header">
          <h3>${title}</h3>
          <button class="action-modal-close" onclick="quickActions.closeActionModal()">&times;</button>
        </div>
        <div class="action-modal-content">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    // Show modal
    setTimeout(() => {
      modal.classList.add('modal-open');
    }, 10);
  }

  /**
   * Close action modal
   */
  closeActionModal() {
    if (this.currentModal) {
      this.currentModal.classList.remove('modal-open');
      setTimeout(() => {
        this.currentModal.remove();
        this.currentModal = null;
      }, 300);
    }
  }

  /**
   * Show action progress
   */
  showActionProgress(message) {
    this.showActionNotification(message, 'progress', 0);
  }

  /**
   * Show action success
   */
  showActionSuccess(message) {
    this.showActionNotification(message, 'success', 3000);
  }

  /**
   * Show action error
   */
  showActionError(message, details = '') {
    this.showActionNotification(`${message}${details ? ': ' + details : ''}`, 'error', 5000);
  }

  /**
   * Show action notification
   */
  showActionNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `action-notification notification-${type}`;
    
    const icons = {
      progress: '⏳',
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    
    notification.innerHTML = `
      <span class="notification-icon">${icons[type]}</span>
      <span class="notification-message">${message}</span>
      ${type === 'progress' ? '<div class="notification-spinner"></div>' : ''}
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    // Auto-hide (except for progress)
    if (duration > 0) {
      setTimeout(() => {
        notification.classList.remove('notification-show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, duration);
    }

    return notification;
  }
}

// Create global quick actions instance
const quickActions = new QuickActionsPanel();

// Export for use in other modules
window.quickActions = quickActions;