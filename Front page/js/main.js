// ====== CONFIGURATION ======
const OMDB_API_KEY = '35a12949';

// Defensive: Ensure apps and apiEndpoint exist (from config.js)
if (typeof apps === "undefined" || !Array.isArray(apps)) {
  throw new Error("apps array is not defined. Did you load config.js first?");
}
if (typeof apiEndpoint === "undefined") {
  throw new Error("apiEndpoint is not defined. Did you load config.js first?");
}

// ====== APPS GRID ======
const appsContainer = document.getElementById('apps');
const reorderedApps = [
  'jellyseerr', 'tautulli', 'plex', 'seedr', 'yts', '1337x',
  'sabnzbd', 'sonarr', 'radarr', 'lidarr', 'bazarr', 'prowlarr'
];

function renderAppsGrid() {
  if (!appsContainer) return;
  appsContainer.innerHTML = ""; // Clear previous

  for (let i = 0; i < reorderedApps.length; i += 6) {
    const row = document.createElement('div');
    row.className = 'app-row';

    reorderedApps.slice(i, i + 6).forEach(appId => {
      const app = apps.find(a => a.id === appId);
      if (app) {
        row.innerHTML += `
          <a class="app" href="${app.url}" target="_blank" title="${app.name} Dashboard">
            <div class="app-card flip" data-app-id="${app.id}" tabindex="0" role="button" aria-label="${app.name} application">
              <div class="status-indicator" aria-label="Service status"></div>
              <div class="app-card-front">
                <img src="${app.img}" alt="${app.name}" loading="lazy"
                  onerror="this.src='https://via.placeholder.com/140x140/333/fff?text=${encodeURIComponent(app.name.charAt(0))}'">
                <span class="app-name">${app.name}</span>
              </div>
              <div class="app-card-back">
                <div class="status-info">
                  <h4>Service Status</h4>
                  <p>Checking connectivity...</p>
                  <div class="status-indicator-large checking" data-status="checking"></div>
                  <small>Double-click to flip back</small>
                </div>
              </div>
            </div>
          </a>`;
      }
    });
    appsContainer.appendChild(row);
  }
  
  // Add enhanced interaction features after rendering
  addInteractionFeatures();
}

// Add enhanced interaction features after rendering
function addInteractionFeatures() {
  const appCards = document.querySelectorAll('.app-card');
  
  appCards.forEach(card => {
    const handler = createCardInteractionHandler(card);
    
    // Enhanced click handling with ripple
    card.addEventListener('click', handler.handleClick);
    
    // Enhanced keyboard support
    card.addEventListener('keydown', handler.handleKeyDown);
    
    // Enhanced double-click for info toggle
    card.addEventListener('dblclick', handler.handleDoubleClick);
    
    // Add focus/blur effects
    card.addEventListener('focus', () => {
      card.style.transform = 'translateY(-4px) scale(1.02)';
    });
    
    card.addEventListener('blur', () => {
      card.style.transform = '';
    });
  });
  
  // Initialize service status checking
  setTimeout(checkServiceStatus, 1000);
}

// Enhanced ripple effect creation
function createRipple(event, element) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.5;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 70%, transparent 100%);
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    pointer-events: none;
    transform: scale(0);
    animation: rippleEffect 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
  `;
  
  // Add enhanced ripple keyframes if not already added
  if (!document.querySelector('#enhanced-ripple-keyframes')) {
    const style = document.createElement('style');
    style.id = 'enhanced-ripple-keyframes';
    style.textContent = `
      @keyframes rippleEffect {
        0% {
          transform: scale(0);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);
}

// Enhanced card interaction handler
function createCardInteractionHandler(card) {
  let isFlipped = false;
  
  return {
    handleClick: (e) => {
      createRipple(e, card);
      // Add bounce effect
      card.style.transform = 'translateY(-10px) scale(0.98)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
    },
    
    handleDoubleClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      isFlipped = !isFlipped;
      toggleCardInfo(card, isFlipped);
    },
    
    handleKeyDown: (e) => {
      switch(e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          // Simulate click and navigate
          createRipple({
            clientX: card.getBoundingClientRect().left + card.offsetWidth / 2,
            clientY: card.getBoundingClientRect().top + card.offsetHeight / 2
          }, card);
          setTimeout(() => {
            window.open(card.parentElement.href, '_blank');
          }, 200);
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          isFlipped = !isFlipped;
          toggleCardInfo(card, isFlipped);
          break;
        case 'Escape':
          if (isFlipped) {
            isFlipped = false;
            toggleCardInfo(card, false);
          }
          break;
      }
    }
  };
}

// Enhanced card info toggle with better animations
function toggleCardInfo(card, shouldFlip = null) {
  const isCurrentlyFlipped = card.classList.contains('flipped');
  const targetState = shouldFlip !== null ? shouldFlip : !isCurrentlyFlipped;
  
  // Remove flip class from all other cards first
  document.querySelectorAll('.app-card.flipped').forEach(c => {
    if (c !== card) {
      c.classList.remove('flipped', 'flip');
    }
  });
  
  if (targetState && !isCurrentlyFlipped) {
    // Flip to show status
    card.classList.add('flip', 'flipped');
    // Trigger status check animation
    setTimeout(() => updateServiceStatus(card), 300);
  } else if (!targetState && isCurrentlyFlipped) {
    // Flip back to normal
    card.classList.remove('flipped');
    setTimeout(() => {
      card.classList.remove('flip');
    }, 300);
  }
}

// Enhanced service status simulation
function simulateServiceStatusCheck(card) {
  const statusIndicator = card.querySelector('.status-indicator');
  const appId = card.dataset.appId;
  
  if (statusIndicator) {
    // Simulate checking state briefly
    statusIndicator.style.background = '#f59e0b';
    statusIndicator.style.animation = 'statusPulse 0.5s infinite';
    
    setTimeout(() => {
      // Simulate random service status (90% online)
      const isOnline = Math.random() > 0.1;
      const isWarning = !isOnline && Math.random() > 0.7;
      
      if (isOnline) {
        card.classList.remove('offline', 'warning');
        statusIndicator.style.background = '#10b981';
        statusIndicator.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
      } else if (isWarning) {
        card.classList.add('warning');
        card.classList.remove('offline');
        statusIndicator.style.background = '#f59e0b';
        statusIndicator.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
      } else {
        card.classList.add('offline');
        card.classList.remove('warning');
        statusIndicator.style.background = '#ef4444';
        statusIndicator.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
      }
      
      statusIndicator.style.animation = 'statusPulse 2s infinite';
    }, 1000 + Math.random() * 1000);
  }
}

// Enhanced service status update for card back
async function updateServiceStatus(card) {
  const statusInfo = card.querySelector('.status-info p');
  const statusIndicatorLarge = card.querySelector('.status-indicator-large');
  const appId = card.dataset.appId;
  
  if (statusInfo && statusIndicatorLarge) {
    statusInfo.textContent = 'Checking...';
    statusIndicatorLarge.className = 'status-indicator-large checking';
    
    // Simulate API call delay with enhanced feedback
    setTimeout(() => {
      const isOnline = Math.random() > 0.2; // 80% chance of being online
      const responseTime = Math.floor(Math.random() * 300 + 50); // 50-350ms
      
      if (isOnline) {
        statusInfo.innerHTML = `Service Online<br><small>Response: ${responseTime}ms</small>`;
        statusIndicatorLarge.className = 'status-indicator-large online';
      } else {
        statusInfo.innerHTML = `Service Offline<br><small>Connection timeout</small>`;
        statusIndicatorLarge.className = 'status-indicator-large offline';
      }
      
      // Update main card status indicator to match
      const mainIndicator = card.querySelector('.status-indicator');
      if (mainIndicator) {
        if (isOnline) {
          card.classList.remove('offline', 'warning');
          mainIndicator.style.background = '#10b981';
          mainIndicator.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
        } else {
          card.classList.add('offline');
          mainIndicator.style.background = '#ef4444';
          mainIndicator.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
        }
      }
    }, 1200);
  }
}
renderAppsGrid();

// ====== ENHANCED INTERACTIONS ======

// Add ripple effect to app cards
function addRippleEffect() {
  const cards = document.querySelectorAll('.app-card');
  
  cards.forEach(card => {
    card.addEventListener('click', function(e) {
      // Prevent multiple ripples on same element
      const existingRipple = card.querySelector('.ripple');
      if (existingRipple) {
        existingRipple.remove();
      }
      
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      
      const rect = card.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      card.appendChild(ripple);
      
      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
}

// Enhanced service status checking
async function checkServiceStatus() {
  const cards = document.querySelectorAll('.app-card');
  
  cards.forEach(async (card) => {
    const appId = card.dataset.appId;
    const app = apps.find(a => a.id === appId);
    const statusIndicator = card.querySelector('.status-indicator');
    const largeIndicator = card.querySelector('.status-indicator-large');
    const statusText = card.querySelector('.status-info p');
    
    if (!app) return;
    
    try {
      // For external services, we'll assume they're online
      const isExternal = ['seedr', 'yts', '1337x'].includes(appId);
      
      if (isExternal) {
        updateServiceStatusUI(card, statusIndicator, largeIndicator, statusText, 'online', 'External service available');
        return;
      }
      
      // For local services, simulate status check
      setTimeout(() => {
        const isOnline = Math.random() > 0.2; // 80% chance online
        if (isOnline) {
          updateServiceStatusUI(card, statusIndicator, largeIndicator, statusText, 'online', 'Service is running');
        } else {
          updateServiceStatusUI(card, statusIndicator, largeIndicator, statusText, 'offline', 'Service unavailable');
        }
      }, Math.random() * 1000 + 500);
      
    } catch (error) {
      updateServiceStatusUI(card, statusIndicator, largeIndicator, statusText, 'offline', 'Connection failed');
    }
  });
}

function updateServiceStatusUI(card, indicator, largeIndicator, statusText, status, message) {
  // Update small indicator
  if (indicator) {
    indicator.className = 'status-indicator';
    if (status === 'online') {
      indicator.style.background = '#10b981';
      indicator.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
    } else if (status === 'warning') {
      indicator.style.background = '#f59e0b';
      indicator.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
    } else {
      indicator.style.background = '#ef4444';
      indicator.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
    }
  }
  
  // Update large indicator
  if (largeIndicator) {
    largeIndicator.className = `status-indicator-large ${status}`;
    largeIndicator.dataset.status = status;
  }
  
  // Update status text
  if (statusText) {
    statusText.textContent = message;
  }
  
  // Update card class for styling
  card.classList.remove('online', 'offline', 'warning');
  if (status !== 'online') {
    card.classList.add(status);
  }
}

// Add card flip functionality on double-click
function addCardFlipFunctionality() {
  const cards = document.querySelectorAll('.app-card');
  
  cards.forEach(card => {
    let clickTimeout;
    
    card.addEventListener('dblclick', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      card.classList.toggle('flip');
      card.classList.toggle('flipped');
      
      // Reset flip after 5 seconds
      setTimeout(() => {
        if (card.classList.contains('flipped')) {
          card.classList.remove('flip', 'flipped');
        }
      }, 5000);
    });
  });
}

// Enhanced keyboard navigation
function enhanceKeyboardNavigation() {
  const cards = document.querySelectorAll('.app-card');
  
  cards.forEach(card => {
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        
        // Trigger ripple effect
        const rect = card.getBoundingClientRect();
        const fakeEvent = {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        };
        
        const clickEvent = new Event('click');
        clickEvent.clientX = fakeEvent.clientX;
        clickEvent.clientY = fakeEvent.clientY;
        card.dispatchEvent(clickEvent);
        
        // Navigate to URL
        setTimeout(() => {
          const link = card.closest('a');
          if (link) {
            window.open(link.href, '_blank');
          }
        }, 100);
      }
      
      // Arrow key navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        navigateCards(card, e.key);
      }
    });
  });
}

function navigateCards(currentCard, direction) {
  const cards = Array.from(document.querySelectorAll('.app-card'));
  const currentIndex = cards.indexOf(currentCard);
  let nextIndex;
  
  switch (direction) {
    case 'ArrowLeft':
      nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
      break;
    case 'ArrowRight':
      nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'ArrowUp':
      nextIndex = currentIndex >= 6 ? currentIndex - 6 : currentIndex + 6;
      break;
    case 'ArrowDown':
      nextIndex = currentIndex < 6 ? currentIndex + 6 : currentIndex - 6;
      break;
    default:
      return;
  }
  
  if (nextIndex >= 0 && nextIndex < cards.length) {
    cards[nextIndex].focus();
  }
}

// Initialize enhanced interactions
document.addEventListener('DOMContentLoaded', () => {
  // Recheck service status every 30 seconds
  setInterval(checkServiceStatus, 30000);
});

// ====== MEDIA ACTIVITY PANEL ======

// Utility: Format time
function formatActivityTime(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = Math.floor((now - time) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getActivityIcon(activity) {
  const iconMap = {
    'watching': '▶️', 'playing': '▶️', 'paused': '⏸️', 'buffering': '⏳',
    'downloading': '⬇️', 'download': '⬇️', 'completed': '✅', 'processing': '⚙️',
    'request': '📝', 'approved': '✅', 'available': '🎬', 'declined': '❌',
    'queued': '⏳', 'failed': '❌'
  };
  return iconMap[activity.type] || '📺';
}

// OMDb fallback for missing info
async function fillMissingMetadata(activity) {
  const needsTitle = !activity.title || activity.title.toLowerCase().startsWith('unknown');
  const needsPoster = !activity.poster || activity.poster.includes('placeholder') || activity.poster.includes('Unknown');

  if (!needsTitle && !needsPoster) return activity;

  if (activity.imdbId) {
    try {
      const omdbUrl = `https://www.omdbapi.com/?i=${activity.imdbId}&apikey=${OMDB_API_KEY}`;
      const omdbData = await fetch(omdbUrl).then(r => r.ok ? r.json() : null).catch(() => null);
      if (omdbData && omdbData.Response !== "False") {
        if (needsTitle && omdbData.Title) activity.title = omdbData.Title;
        if (needsPoster && omdbData.Poster && omdbData.Poster !== "N/A") activity.poster = omdbData.Poster;
        if (!activity.year && omdbData.Year) activity.year = omdbData.Year;
      }
    } catch { /* ignore */ }
  }
  if (!activity.poster) {
    const firstLetter = activity.title ? activity.title.charAt(0).toUpperCase() : '?';
    activity.poster = `https://via.placeholder.com/70x100/1a1a1a/00fff0?text=${encodeURIComponent(firstLetter)}`;
  }
  return activity;
}

// Group by type
function groupActivities(activities) {
  return {
    live: activities.filter(a => ['watching', 'playing', 'paused', 'buffering'].includes(a.type)),
    downloads: activities.filter(a => ['downloading', 'download', 'queued', 'processing'].includes(a.type)),
    requests: activities.filter(a => a.type === 'request'),
    completed: activities.filter(a => a.type === 'completed')
  };
}

function createActivityItem(activity) {
  const posterUrl = activity.poster;
  const progressHtml = activity.progress ? `
    <div class="activity-progress">
      <div class="activity-progress-fill" style="width: ${activity.progress}%"></div>
    </div>
  ` : '';

  const statusIcon = getActivityIcon(activity);
  const enhancedStatusText = `${statusIcon} ${activity.statusText || (activity.status ? activity.status.toUpperCase() : '')}`;

  let downloadInfo = '';
  if (activity.speed && activity.speed > 0) downloadInfo += `<span class="activity-speed">${activity.speed.toFixed(1)} MB/s</span>`;
  if (activity.eta && activity.eta !== 'Unknown') downloadInfo += `<span class="activity-eta">${activity.eta}</span>`;
  if (activity.timeRemaining) downloadInfo += `<span class="activity-eta">${activity.timeRemaining}</span>`;

  let transcodingInfo = '';
  if (activity.transcoding === true) transcodingInfo = '<span class="activity-transcoding">🔄 Transcoding</span>';
  else if (activity.transcoding === false && activity.source === 'plex') transcodingInfo = '<span class="activity-direct-play">⚡ Direct Play</span>';

  return `
    <div class="activity-item ${activity.type}" data-id="${activity.id}" data-source="${activity.source}">
      <div class="activity-poster">
        <img src="${posterUrl}" alt="${activity.title}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/70x100/1a1a1a/00fff0?text=${encodeURIComponent(activity.title ? activity.title.charAt(0) : '?')}'">
      </div>
      <div class="activity-content">
        <div class="activity-title-row">
          ${activity.year ? `<span class="activity-year">(${activity.year})</span>` : ''}
          <span class="activity-title">${activity.title}</span>
        </div>
        ${activity.subtitle ? `<div class="activity-subtitle">${activity.subtitle}</div>` : ''}
        <div class="activity-meta-row">
          <div class="activity-status">
            <span class="activity-status-badge ${activity.type}">${enhancedStatusText}</span>
          </div>
          ${activity.user ? `
            <div class="activity-user-info">
              <div class="activity-user-avatar">${activity.user.charAt(0).toUpperCase()}</div>
              <span>by ${activity.user}</span>
            </div>
          ` : ''}
          <span class="activity-timestamp">${formatActivityTime(activity.timestamp)}</span>
          ${activity.quality ? `<span class="activity-quality">${activity.quality}</span>` : ''}
          ${downloadInfo}
          ${transcodingInfo}
        </div>
      </div>
      <div class="activity-type-indicator ${activity.source}"></div>
      ${progressHtml}
    </div>
  `;
}

async function updateActivityFeed(activities) {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  if (!activities || activities.length === 0) {
    feed.innerHTML = `
      <div class="activity-item no-activity">
        <span style="margin-left: 12px;">No recent media activity</span>
      </div>
    `;
    return;
  }

  // Fetch/fix missing metadata for all activities in parallel
  const filledActivities = await Promise.all(
    activities.slice(0, 15).map(fillMissingMetadata)
  );

  // Grouping and priority: live > downloads > requests > completed
  const grouped = groupActivities(filledActivities);
  const prioritized = [
    ...grouped.live,
    ...grouped.downloads,
    ...grouped.requests,
    ...grouped.completed
  ];

  feed.innerHTML = prioritized.map(createActivityItem).join('');
}

async function updateMediaActivity() {
  try {
    const response = await fetch(`${apiEndpoint}/api/media/combined`, {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Media API error: ${response.status}`);
    }

    const activities = await response.json();
    await updateActivityFeed(activities);
  } catch (error) {
    const feed = document.getElementById('activityFeed');
    if (feed) {
      feed.innerHTML = `
        <div class="activity-item error-state">
          <span style="margin-left: 12px;">Failed to load media activity - ${error.message}</span>
        </div>
      `;
    }
  }
}

function addMediaActivityPanel() {
  if (!document.querySelector('.activity-panel')) {
    const activityPanel = document.createElement('div');
    activityPanel.className = 'activity-panel';
    activityPanel.innerHTML = `
      <div class="activity-feed" id="activityFeed">
        <div class="activity-item loading-state">
          <span class="loading"></span>
          <span style="margin-left: 12px;">Loading enhanced media activity...</span>
        </div>
      </div>
    `;
    if (appsContainer && appsContainer.parentNode) {
      appsContainer.parentNode.insertBefore(activityPanel, appsContainer.nextSibling);
    } else {
      document.body.appendChild(activityPanel);
    }
  }
}

// Initialize the activity panel and polling
addMediaActivityPanel();
updateMediaActivity();
setInterval(updateMediaActivity, 10000);

// Optional: Service worker registration for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}