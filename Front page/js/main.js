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

  // Add loading class for performance feedback
  document.body.classList.add('apps-loading');

  for (let i = 0; i < reorderedApps.length; i += 6) {
    const row = document.createElement('div');
    row.className = 'app-row';

    reorderedApps.slice(i, i + 6).forEach((appId, index) => {
      const app = apps.find(a => a.id === appId);
      if (app) {
        const appElement = document.createElement('a');
        appElement.className = 'app';
        appElement.href = app.url;
        appElement.target = '_blank';
        appElement.title = `${app.name} Dashboard`;
        appElement.rel = 'noopener noreferrer';
        
        appElement.innerHTML = `
          <div class="app-card loading" 
               data-app-id="${app.id}" 
               tabindex="0" 
               role="button" 
               aria-label="Open ${app.name} application dashboard"
               data-keyboard-index="${i + index}">
            <img src="${app.img}" 
                 alt="${app.name} application icon" 
                 loading="lazy"
                 decoding="async"
                 onerror="this.src='https://via.placeholder.com/140x140/333/fff?text=${encodeURIComponent(app.name.charAt(0))}'">
            <span class="app-name">${app.name}</span>
          </div>`;
        
        row.appendChild(appElement);
        
        // Remove loading class after image loads for better UX
        const img = appElement.querySelector('img');
        const card = appElement.querySelector('.app-card');
        
        const removeLoading = () => {
          card.classList.remove('loading');
          document.body.classList.remove('apps-loading');
        };
        
        if (img.complete) {
          removeLoading();
        } else {
          img.addEventListener('load', removeLoading);
          img.addEventListener('error', removeLoading);
        }
      }
    });
    appsContainer.appendChild(row);
  }

  // Add keyboard navigation support
  addKeyboardNavigation();
}

// Enhanced keyboard navigation for accessibility
function addKeyboardNavigation() {
  const appCards = document.querySelectorAll('.app-card');
  
  appCards.forEach((card, index) => {
    card.addEventListener('keydown', (e) => {
      const currentIndex = parseInt(card.dataset.keyboardIndex);
      let targetIndex;
      
      switch(e.key) {
        case 'ArrowRight':
          e.preventDefault();
          targetIndex = (currentIndex + 1) % 12;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          targetIndex = currentIndex === 0 ? 11 : currentIndex - 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          targetIndex = currentIndex + 6 >= 12 ? currentIndex % 6 : currentIndex + 6;
          break;
        case 'ArrowUp':
          e.preventDefault();
          targetIndex = currentIndex - 6 < 0 ? currentIndex + 6 : currentIndex - 6;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          card.closest('a').click();
          return;
        default:
          return;
      }
      
      const targetCard = document.querySelector(`[data-keyboard-index="${targetIndex}"]`);
      if (targetCard) {
        targetCard.focus();
      }
    });
  });
}

// Performance optimizations - intelligent caching for API calls
const apiCache = new Map();
const CACHE_TTL = 10000; // 10 seconds

async function cachedFetch(url, options = {}) {
  const cacheKey = `${url}${JSON.stringify(options)}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the successful response
    apiCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    return response;
  } catch (error) {
    console.error(`API call failed for ${url}:`, error);
    throw error;
  }
}
  
  // Enhanced keyboard navigation
  setupKeyboardNavigation();
}

// Enhanced keyboard navigation support
function setupKeyboardNavigation() {
  const appCards = document.querySelectorAll('.app-card');
  
  appCards.forEach((card, index) => {
    card.addEventListener('keydown', (e) => {
      let targetIndex = index;
      
      switch(e.key) {
        case 'ArrowRight':
          targetIndex = (index + 1) % appCards.length;
          break;
        case 'ArrowLeft':
          targetIndex = (index - 1 + appCards.length) % appCards.length;
          break;
        case 'ArrowDown':
          targetIndex = (index + 6) % appCards.length;
          break;
        case 'ArrowUp':
          targetIndex = (index - 6 + appCards.length) % appCards.length;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          card.parentElement.click();
          return;
        default:
          return;
      }
      
      e.preventDefault();
      appCards[targetIndex].focus();
    });
  });
}
renderAppsGrid();

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

// Media activity caching for performance
const mediaCache = {
  data: null,
  timestamp: 0,
  TTL: 8000 // 8 seconds cache for media activity
};

async function updateMediaActivity() {
  try {
    const now = Date.now();
    let activities;
    
    // Use cached data if available and valid
    if (mediaCache.data && (now - mediaCache.timestamp) < mediaCache.TTL) {
      activities = mediaCache.data;
    } else {
      // Fetch fresh data with timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch(`${apiEndpoint}/api/media/combined`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      activities = await response.json();
      
      // Cache successful response
      mediaCache.data = activities;
      mediaCache.timestamp = now;
    }
    
    await updateActivityFeed(activities);
  } catch (error) {
    // Enhanced error handling with fallback to cached data
    if (mediaCache.data && error.name !== 'AbortError') {
      console.warn('Using cached media data due to error:', error.message);
      await updateActivityFeed(mediaCache.data);
      return;
    }
    
    const feed = document.getElementById('activityFeed');
    if (feed) {
      const errorType = error.name === 'AbortError' ? 'Request timeout' :
                       error.message.includes('Failed to fetch') ? 'Network error' :
                       error.message;
                       
      feed.innerHTML = `
        <div class="activity-item error-state">
          <span style="margin-left: 12px;">Failed to load media activity - ${errorType}</span>
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