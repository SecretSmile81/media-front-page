// ====== SYSTEM MONITOR SIDEBAR LOGIC ======
// Uses statsApiEndpoint from config.js

// Performance optimizations and caching
let lastNetDown = null;
let lastNetUp = null;
let lastUpdateTime = null;

// Intelligent caching for API calls
const statsCache = {
  data: null,
  timestamp: 0,
  TTL: 3000 // 3 seconds cache
};

function formatGB(val, decimals=1) {
  return val ? val.toFixed(decimals) : '0.0';
}

// Enhanced stats fetching with caching and better error handling
async function fetchStatsWithCache() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (statsCache.data && (now - statsCache.timestamp) < statsCache.TTL) {
    return statsCache.data;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(statsApiEndpoint, { 
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Cache the successful response
    statsCache.data = data;
    statsCache.timestamp = now;
    
    return data;
  } catch (error) {
    // If we have cached data, return it as fallback
    if (statsCache.data) {
      console.warn('Using cached data due to fetch error:', error.message);
      return statsCache.data;
    }
    throw error;
  }
}

async function updateAllStats() {
  try {
    const data = await fetchStatsWithCache();

    // --- CPU ---
    const cpuUsage = Math.round(data.cpu.usage);
    document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
    document.getElementById('cpuProgress').style.width = `${cpuUsage}%`;

    // Temperature (null on Windows) - Enhanced with better thresholds
    const cpuTempElement = document.getElementById('cpuTemp');
    if (data.cpu.temp !== null) {
      const temp = Math.round(data.cpu.temp);
      cpuTempElement.textContent = `${temp}°C`;
      
      // Enhanced temperature thresholds with better visual feedback and alerts
      if (temp > 90) {
        cpuTempElement.className = 'stat-value temp-critical';
        // Add system alert for critical temperature
        if (!document.querySelector('.temp-alert')) {
          showTemperatureAlert('Critical CPU temperature detected!', 'critical');
        }
      } else if (temp > 80) {
        cpuTempElement.className = 'stat-value temp-warning';
        // Clear any critical alerts
        clearTemperatureAlert();
      } else if (temp > 70) {
        cpuTempElement.className = 'stat-value temp-warm';
      } else {
        cpuTempElement.className = 'stat-value temp-normal';
        clearTemperatureAlert();
      }
    } else {
      cpuTempElement.textContent = 'N/A';
      cpuTempElement.className = 'stat-value temp-normal';
    }

    // --- RAM ---
    const ramUsage = Math.round(data.ram.usage);
    document.getElementById('ramUsage').textContent = `${ramUsage}%`;
    document.getElementById('ramProgress').style.width = `${ramUsage}%`;
    document.getElementById('ramDetails').textContent = `${formatGB(data.ram.used)} GB / ${formatGB(data.ram.total)} GB`;

    // --- NETWORK --- with improved speed calculation
    const now = Date.now();
    let downSpeed = 0, upSpeed = 0;
    if (lastNetDown !== null && lastNetUp !== null && lastUpdateTime !== null) {
      const seconds = (now - lastUpdateTime) / 1000;
      if (seconds > 0) { // Prevent division by zero
        downSpeed = Math.max(0, (data.network.down - lastNetDown) / seconds / (1024**2));
        upSpeed = Math.max(0, (data.network.up - lastNetUp) / seconds / (1024**2));
      }
    }
    document.getElementById('networkDown').textContent = `${downSpeed.toFixed(2)} MB/s`;
    document.getElementById('networkUp').textContent = `${upSpeed.toFixed(2)} MB/s`;
    lastNetDown = data.network.down;
    lastNetUp = data.network.up;
    lastUpdateTime = now;

    // --- NAS (Z:) --- with better error handling
    if (data.nas && typeof data.nas.usage === 'number') {
      const nasUsage = Math.round(data.nas.usage);
      const totalNas = formatGB(data.nas.total, 0);
      const freeNas = formatGB(data.nas.free, 0);
      document.getElementById('nasUsage').textContent = `${nasUsage}%`;
      document.getElementById('nasProgress').style.width = `${nasUsage}%`;
      document.getElementById('nasDetails').textContent = `${freeNas} GB free of ${totalNas} GB`;
    } else {
      document.getElementById('nasUsage').textContent = `N/A`;
      document.getElementById('nasProgress').style.width = `0%`;
      document.getElementById('nasDetails').textContent = `N/A`;
    }
  } catch (err) {
    // Enhanced error handling with more descriptive messages
    console.error('Stats update failed:', err);
    const errorMsg = err.name === 'AbortError' ? 'Request timeout' : 
                     err.message.includes('fetch') ? 'Network error' : 
                     `Error: ${err.message}`;
    
    // Set placeholder values with error indication
    document.getElementById('cpuUsage').textContent = `?`;
    document.getElementById('cpuProgress').style.width = `0%`;
    document.getElementById('cpuTemp').textContent = `N/A`;
    document.getElementById('ramUsage').textContent = `?`;
    document.getElementById('ramProgress').style.width = `0%`;
    document.getElementById('ramDetails').textContent = `?`;
    document.getElementById('networkDown').textContent = `?`;
    document.getElementById('networkUp').textContent = `?`;
    document.getElementById('nasUsage').textContent = `?`;
    document.getElementById('nasProgress').style.width = `0%`;
    document.getElementById('nasDetails').textContent = `?`;
    
    // Show error in console for debugging
    console.warn(`System stats unavailable: ${errorMsg}`);
  }
}

// Enhanced temperature monitoring functions
function showTemperatureAlert(message, severity = 'warning') {
  // Remove existing alert if any
  clearTemperatureAlert();
  
  const alert = document.createElement('div');
  alert.className = `temp-alert temp-alert-${severity}`;
  alert.innerHTML = `
    <div class="temp-alert-content">
      <span class="temp-alert-icon">${severity === 'critical' ? '🔥' : '⚠️'}</span>
      <span class="temp-alert-message">${message}</span>
      <button class="temp-alert-close" onclick="clearTemperatureAlert()">×</button>
    </div>
  `;
  
  document.body.appendChild(alert);
  
  // Auto-hide warning alerts after 10 seconds
  if (severity === 'warning') {
    setTimeout(clearTemperatureAlert, 10000);
  }
}

function clearTemperatureAlert() {
  const alert = document.querySelector('.temp-alert');
  if (alert) {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }
}

// Enhanced real-time updates with smoother transitions
function smoothUpdateValue(elementId, newValue, formatter = (v) => v) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const currentValue = element.textContent;
  const formattedValue = formatter(newValue);
  
  if (currentValue !== formattedValue) {
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(1.1)';
    element.textContent = formattedValue;
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 150);
  }
}

// Enhanced progress bar animations
function smoothUpdateProgress(elementId, newValue) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const currentWidth = parseFloat(element.style.width) || 0;
  const targetWidth = newValue;
  
  if (Math.abs(currentWidth - targetWidth) > 0.5) {
    element.style.transition = 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    element.style.width = `${targetWidth}%`;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const refreshBtn = document.getElementById('refreshStats');
  if (refreshBtn) refreshBtn.addEventListener('click', updateAllStats);
  updateAllStats();
  setInterval(updateAllStats, 5000);
});