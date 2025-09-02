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
            <div class="app-card" data-app-id="${app.id}" tabindex="0" role="button" aria-label="${app.name} application">
              <div class="app-card-front">
                <img src="${app.img}" alt="${app.name}" loading="lazy"
                  onerror="this.src='https://via.placeholder.com/140x140/333/fff?text=${encodeURIComponent(app.name.charAt(0))}'">
                <span class="app-name">${app.name}</span>
              </div>
              <div class="app-card-back">
                <div class="status-info">
                  <h4>Service Status</h4>
                  <p>Checking connectivity...</p>
                  <div class="status-indicator online"></div>
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

// Add ripple effects and enhanced interactions
function addInteractionFeatures() {
  const appCards = document.querySelectorAll('.app-card');
  
  appCards.forEach(card => {
    // Add ripple effect on click
    card.addEventListener('click', function(e) {
      createRipple(e, this);
    });
    
    // Add keyboard support for card flip
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Simulate click for keyboard users
        window.open(this.parentElement.href, '_blank');
      } else if (e.key === 'i' || e.key === 'I') {
        // Press 'i' to toggle info (card flip)
        e.preventDefault();
        toggleCardInfo(this);
      }
    });
    
    // Double-click to show info
    card.addEventListener('dblclick', function(e) {
      e.preventDefault();
      toggleCardInfo(this);
    });
  });
}

// Create ripple effect
function createRipple(event, element) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    pointer-events: none;
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    z-index: 10;
  `;
  
  // Add ripple keyframes if not already added
  if (!document.querySelector('#ripple-keyframes')) {
    const style = document.createElement('style');
    style.id = 'ripple-keyframes';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// Toggle card info display
function toggleCardInfo(card) {
  const isFlipped = card.classList.contains('flipped');
  
  // Remove flip class from all cards first
  document.querySelectorAll('.app-card.flipped').forEach(c => {
    c.classList.remove('flipped');
  });
  
  // If this card wasn't flipped, flip it
  if (!isFlipped) {
    card.classList.add('flip', 'flipped');
    // Simulate service status check
    setTimeout(() => updateServiceStatus(card), 300);
  } else {
    card.classList.remove('flip', 'flipped');
  }
}

// Simulate service status check
async function updateServiceStatus(card) {
  const statusInfo = card.querySelector('.status-info p');
  const statusIndicator = card.querySelector('.status-indicator');
  const appId = card.dataset.appId;
  
  if (statusInfo) {
    statusInfo.textContent = 'Checking...';
    statusIndicator.className = 'status-indicator checking';
    
    // Simulate API call delay
    setTimeout(() => {
      const isOnline = Math.random() > 0.2; // 80% chance of being online
      statusInfo.textContent = isOnline ? 'Service Online' : 'Service Offline';
      statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
      
      // Update main card status indicator
      if (isOnline) {
        card.classList.remove('offline', 'warning');
      } else {
        card.classList.add('offline');
      }
    }, 1000);
  }
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