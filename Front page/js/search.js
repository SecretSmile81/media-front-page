/**
 * Global Search Module
 * Universal search functionality across all media services with real-time suggestions
 */

class GlobalSearch {
  constructor() {
    this.searchModal = null;
    this.searchInput = null;
    this.searchResults = null;
    this.searchProviders = {};
    this.searchHistory = [];
    this.searchCache = new Map();
    this.isOpen = false;
    this.currentQuery = '';
    this.debounceTimer = null;
    this.selectedIndex = -1;
    
    this.initializeSearchProviders();
    this.createSearchModal();
    this.bindKeyboardShortcuts();
    this.loadSearchHistory();
  }

  /**
   * Initialize search providers for different services
   */
  initializeSearchProviders() {
    this.searchProviders = {
      jellyseerr: {
        name: 'Jellyseerr',
        icon: '🎬',
        color: '#a855f7',
        endpoint: `${apiEndpoint}/api/jellyseerr/search`,
        searchFunction: this.searchJellyseerr.bind(this)
      },
      tmdb: {
        name: 'TMDb',
        icon: '🎭',
        color: '#00d5ff',
        searchFunction: this.searchTMDB.bind(this)
      },
      plex: {
        name: 'Plex Library',
        icon: '📚',
        color: '#e5a00d',
        searchFunction: this.searchPlex.bind(this)
      },
      external: {
        name: 'External Sites',
        icon: '🌐',
        color: '#00ccff',
        searchFunction: this.searchExternal.bind(this)
      }
    };
  }

  /**
   * Create search modal interface
   */
  createSearchModal() {
    this.searchModal = document.createElement('div');
    this.searchModal.className = 'search-modal';
    this.searchModal.innerHTML = `
      <div class="search-overlay"></div>
      <div class="search-container">
        <div class="search-header">
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" placeholder="Search across all services..." autocomplete="off" spellcheck="false">
            <span class="search-shortcut">Ctrl+K</span>
          </div>
          <button class="search-close" aria-label="Close search">&times;</button>
        </div>
        <div class="search-content">
          <div class="search-suggestions"></div>
          <div class="search-results"></div>
          <div class="search-providers">
            <div class="search-providers-title">Search in:</div>
            <div class="search-providers-list"></div>
          </div>
          <div class="search-history">
            <div class="search-history-title">Recent searches:</div>
            <div class="search-history-list"></div>
          </div>
        </div>
        <div class="search-footer">
          <div class="search-tips">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.searchModal);

    // Get references
    this.searchInput = this.searchModal.querySelector('.search-input');
    this.searchResults = this.searchModal.querySelector('.search-results');
    this.searchSuggestions = this.searchModal.querySelector('.search-suggestions');
    this.searchHistory = this.searchModal.querySelector('.search-history-list');

    // Bind events
    this.bindSearchEvents();
    this.renderSearchProviders();
  }

  /**
   * Bind search-related events
   */
  bindSearchEvents() {
    // Input events
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      this.handleSearchKeydown(e);
    });

    // Modal events
    this.searchModal.querySelector('.search-close').addEventListener('click', () => {
      this.closeSearch();
    });

    this.searchModal.querySelector('.search-overlay').addEventListener('click', () => {
      this.closeSearch();
    });

    // Prevent modal close when clicking inside content
    this.searchModal.querySelector('.search-container').addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Bind keyboard shortcuts
   */
  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openSearch();
      }

      // Escape to close search
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSearch();
      }
    });
  }

  /**
   * Open search modal
   */
  openSearch() {
    this.isOpen = true;
    this.searchModal.classList.add('search-open');
    document.body.classList.add('search-active');
    
    // Focus input
    setTimeout(() => {
      this.searchInput.focus();
    }, 100);

    // Show recent history
    this.showSearchHistory();
  }

  /**
   * Close search modal
   */
  closeSearch() {
    this.isOpen = false;
    this.searchModal.classList.remove('search-open');
    document.body.classList.remove('search-active');
    
    // Clear search
    this.searchInput.value = '';
    this.currentQuery = '';
    this.selectedIndex = -1;
    this.clearResults();
  }

  /**
   * Handle search input changes
   */
  handleSearchInput(query) {
    this.currentQuery = query.trim();
    
    // Clear previous debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.currentQuery.length === 0) {
      this.clearResults();
      this.showSearchHistory();
      return;
    }

    // Show instant suggestions
    this.showInstantSuggestions(this.currentQuery);

    // Debounce actual search
    this.debounceTimer = setTimeout(() => {
      this.performSearch(this.currentQuery);
    }, 300);
  }

  /**
   * Handle keyboard navigation
   */
  handleSearchKeydown(e) {
    const results = this.searchResults.querySelectorAll('.search-result-item');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
        this.updateSelection();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
          this.selectResult(results[this.selectedIndex]);
        } else if (this.currentQuery) {
          this.performDirectSearch(this.currentQuery);
        }
        break;
    }
  }

  /**
   * Update visual selection
   */
  updateSelection() {
    const results = this.searchResults.querySelectorAll('.search-result-item');
    results.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
  }

  /**
   * Show instant suggestions based on input
   */
  showInstantSuggestions(query) {
    const suggestions = this.generateSuggestions(query);
    
    this.searchSuggestions.innerHTML = suggestions.map(suggestion => `
      <div class="search-suggestion" onclick="globalSearch.selectSuggestion('${suggestion}')">
        <span class="suggestion-icon">💡</span>
        <span class="suggestion-text">${suggestion}</span>
      </div>
    `).join('');
  }

  /**
   * Generate search suggestions
   */
  generateSuggestions(query) {
    const suggestions = [];
    const lowerQuery = query.toLowerCase();
    
    // Popular search terms
    const popularTerms = [
      'action movies', 'comedy series', 'horror films', 'sci-fi shows',
      'documentaries', 'anime', 'tv shows', 'movies 2024', 'trending'
    ];
    
    // Filter popular terms
    popularTerms.forEach(term => {
      if (term.toLowerCase().includes(lowerQuery)) {
        suggestions.push(term);
      }
    });
    
    // Add query variations
    if (query.length > 2) {
      suggestions.push(`"${query}" in movies`);
      suggestions.push(`"${query}" in tv shows`);
      suggestions.push(`${query} collection`);
    }
    
    return suggestions.slice(0, 5);
  }

  /**
   * Perform search across all providers
   */
  async performSearch(query) {
    if (!query || query.length < 2) return;
    
    this.showSearchLoading();
    
    try {
      const searchPromises = Object.entries(this.searchProviders).map(async ([key, provider]) => {
        try {
          const results = await provider.searchFunction(query);
          return { provider: key, results, error: null };
        } catch (error) {
          return { provider: key, results: [], error: error.message };
        }
      });
      
      const searchResults = await Promise.all(searchPromises);
      this.displaySearchResults(query, searchResults);
      
      // Add to search history
      this.addToSearchHistory(query);
      
    } catch (error) {
      console.error('Search failed:', error);
      this.showSearchError(error.message);
    }
  }

  /**
   * Search Jellyseerr
   */
  async searchJellyseerr(query) {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            title: `${query} Movie Result`,
            type: 'movie',
            year: '2024',
            poster: 'https://via.placeholder.com/150x225/333/fff?text=M',
            action: 'Request Movie'
          },
          {
            title: `${query} TV Show`,
            type: 'tv',
            year: '2023',
            poster: 'https://via.placeholder.com/150x225/333/fff?text=TV',
            action: 'Request Series'
          }
        ]);
      }, 500);
    });
  }

  /**
   * Search TMDb
   */
  async searchTMDB(query) {
    try {
      // This would call the actual TMDb API
      const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=856f234eac9bb13adef436fd80598995&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      return data.results.slice(0, 5).map(item => ({
        title: item.title || item.name,
        type: item.media_type,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        action: 'View Details'
      }));
    } catch (error) {
      console.error('TMDb search error:', error);
      return [];
    }
  }

  /**
   * Search Plex Library (mock)
   */
  async searchPlex(query) {
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            title: `${query} in Library`,
            type: 'movie',
            year: '2023',
            poster: 'https://via.placeholder.com/150x225/333/fff?text=P',
            action: 'Play Now'
          }
        ]);
      }, 300);
    });
  }

  /**
   * Search External Sites
   */
  async searchExternal(query) {
    const externalResults = [
      {
        title: `Search "${query}" on YTS`,
        type: 'external',
        url: `https://yts.mx/browse-movies/${encodeURIComponent(query)}`,
        icon: '🎬',
        action: 'Open YTS'
      },
      {
        title: `Search "${query}" on 1337x`,
        type: 'external', 
        url: `https://1337x.to/search/${encodeURIComponent(query)}/1/`,
        icon: '🏴‍☠️',
        action: 'Open 1337x'
      }
    ];
    
    return externalResults;
  }

  /**
   * Display search results
   */
  displaySearchResults(query, searchResults) {
    this.clearResults();
    
    const hasResults = searchResults.some(result => result.results.length > 0);
    
    if (!hasResults) {
      this.searchResults.innerHTML = `
        <div class="search-no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-message">No results found for "${query}"</div>
          <div class="no-results-suggestions">
            <p>Try:</p>
            <ul>
              <li>Checking your spelling</li>
              <li>Using different keywords</li>
              <li>Searching for a different title</li>
            </ul>
          </div>
        </div>
      `;
      return;
    }
    
    let resultsHTML = '';
    
    searchResults.forEach(({ provider, results, error }) => {
      const providerInfo = this.searchProviders[provider];
      
      if (error) {
        resultsHTML += `
          <div class="search-provider-section">
            <div class="search-provider-header error">
              <span class="provider-icon">${providerInfo.icon}</span>
              <span class="provider-name">${providerInfo.name}</span>
              <span class="provider-error">Error: ${error}</span>
            </div>
          </div>
        `;
        return;
      }
      
      if (results.length === 0) return;
      
      resultsHTML += `
        <div class="search-provider-section">
          <div class="search-provider-header">
            <span class="provider-icon">${providerInfo.icon}</span>
            <span class="provider-name">${providerInfo.name}</span>
            <span class="provider-count">${results.length} result${results.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="search-provider-results">
            ${results.map((result, index) => this.createResultItem(result, provider, index)).join('')}
          </div>
        </div>
      `;
    });
    
    this.searchResults.innerHTML = resultsHTML;
    this.selectedIndex = -1;
  }

  /**
   * Create a result item
   */
  createResultItem(result, provider, index) {
    return `
      <div class="search-result-item" data-provider="${provider}" data-index="${index}" onclick="globalSearch.selectResult(this, ${JSON.stringify(result).replace(/"/g, '&quot;')})">
        ${result.poster ? `<img class="result-poster" src="${result.poster}" alt="${result.title}" loading="lazy">` : '<div class="result-poster-placeholder">' + (result.icon || '🎭') + '</div>'}
        <div class="result-content">
          <div class="result-title">${result.title}</div>
          ${result.year ? `<div class="result-year">${result.year}</div>` : ''}
          ${result.type ? `<div class="result-type">${result.type.charAt(0).toUpperCase() + result.type.slice(1)}</div>` : ''}
        </div>
        <div class="result-action">
          <button class="result-action-btn">${result.action || 'Open'}</button>
        </div>
      </div>
    `;
  }

  /**
   * Select a search result
   */
  selectResult(element, result = null) {
    if (!result) {
      const resultData = element.dataset;
      result = { action: 'open' }; // Default action
    }
    
    // Add to search history
    this.addToSearchHistory(this.currentQuery);
    
    // Handle different result types
    if (result.url) {
      window.open(result.url, '_blank');
    } else if (result.action === 'Request Movie' || result.action === 'Request Series') {
      this.handleMediaRequest(result);
    } else if (result.action === 'Play Now') {
      this.handlePlayMedia(result);
    }
    
    this.closeSearch();
  }

  /**
   * Handle media request
   */
  handleMediaRequest(result) {
    // This would integrate with Jellyseerr API
    console.log('Requesting media:', result);
    
    // Show notification
    if (window.loadingManager) {
      loadingManager.updateConnectionStatus('online', `Requesting ${result.title}...`);
    }
  }

  /**
   * Handle play media
   */
  handlePlayMedia(result) {
    // This would integrate with Plex API
    console.log('Playing media:', result);
    
    // Open Plex
    window.open('http://192.168.1.24:32400/web', '_blank');
  }

  /**
   * Show search loading state
   */
  showSearchLoading() {
    this.searchResults.innerHTML = `
      <div class="search-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Searching across all services...</div>
      </div>
    `;
  }

  /**
   * Show search error
   */
  showSearchError(error) {
    this.searchResults.innerHTML = `
      <div class="search-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">Search failed: ${error}</div>
        <button class="retry-search-btn" onclick="globalSearch.performSearch('${this.currentQuery}')">Retry</button>
      </div>
    `;
  }

  /**
   * Clear search results
   */
  clearResults() {
    this.searchResults.innerHTML = '';
    this.searchSuggestions.innerHTML = '';
  }

  /**
   * Render search providers
   */
  renderSearchProviders() {
    const providersList = this.searchModal.querySelector('.search-providers-list');
    
    providersList.innerHTML = Object.entries(this.searchProviders).map(([key, provider]) => `
      <div class="search-provider-item" data-provider="${key}">
        <span class="provider-icon">${provider.icon}</span>
        <span class="provider-name">${provider.name}</span>
      </div>
    `).join('');
  }

  /**
   * Show search history
   */
  showSearchHistory() {
    const history = this.getSearchHistory();
    
    if (history.length === 0) {
      this.searchHistory.innerHTML = '<div class="search-history-empty">No recent searches</div>';
      return;
    }
    
    this.searchHistory.innerHTML = history.map(query => `
      <div class="search-history-item" onclick="globalSearch.selectSuggestion('${query}')">
        <span class="history-icon">🕒</span>
        <span class="history-query">${query}</span>
        <button class="history-remove" onclick="event.stopPropagation(); globalSearch.removeFromSearchHistory('${query}')">&times;</button>
      </div>
    `).join('');
  }

  /**
   * Add to search history
   */
  addToSearchHistory(query) {
    if (!query || query.length < 2) return;
    
    let history = this.getSearchHistory();
    
    // Remove existing entry
    history = history.filter(item => item !== query);
    
    // Add to beginning
    history.unshift(query);
    
    // Limit to 10 items
    history = history.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('shadowMoses_searchHistory', JSON.stringify(history));
    this.searchHistoryData = history;
  }

  /**
   * Remove from search history
   */
  removeFromSearchHistory(query) {
    let history = this.getSearchHistory();
    history = history.filter(item => item !== query);
    
    localStorage.setItem('shadowMoses_searchHistory', JSON.stringify(history));
    this.searchHistoryData = history;
    this.showSearchHistory();
  }

  /**
   * Get search history
   */
  getSearchHistory() {
    if (this.searchHistoryData) {
      return this.searchHistoryData;
    }
    
    try {
      const history = localStorage.getItem('shadowMoses_searchHistory');
      this.searchHistoryData = history ? JSON.parse(history) : [];
      return this.searchHistoryData;
    } catch {
      return [];
    }
  }

  /**
   * Load search history
   */
  loadSearchHistory() {
    this.searchHistoryData = this.getSearchHistory();
  }

  /**
   * Select suggestion
   */
  selectSuggestion(suggestion) {
    this.searchInput.value = suggestion;
    this.handleSearchInput(suggestion);
  }

  /**
   * Perform direct search (when Enter is pressed without selection)
   */
  performDirectSearch(query) {
    // Default action - search on external sites
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query + ' movie tv show')}`, '_blank');
    this.addToSearchHistory(query);
    this.closeSearch();
  }
}

// Create global search instance
const globalSearch = new GlobalSearch();

// Export for use in other modules
window.globalSearch = globalSearch;