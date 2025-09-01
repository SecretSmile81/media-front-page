// ====== SYSTEM MONITOR SIDEBAR LOGIC ======
// Uses statsApiEndpoint from config.js

let lastNetDown = null;
let lastNetUp = null;
let lastUpdateTime = null;

function formatGB(val, decimals=1) {
  return val ? val.toFixed(decimals) : '0.0';
}

async function updateAllStats() {
  try {
    const res = await fetch(statsApiEndpoint);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();

    // --- CPU ---
    const cpuUsage = Math.round(data.cpu.usage);
    document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
    document.getElementById('cpuProgress').style.width = `${cpuUsage}%`;

    // Temperature (null on Windows)
    const cpuTempElement = document.getElementById('cpuTemp');
    if (data.cpu.temp !== null) {
      cpuTempElement.textContent = `${Math.round(data.cpu.temp)}°C`;
      cpuTempElement.className = (data.cpu.temp > 75) ? 'stat-value temp-warning' : 'stat-value temp-normal';
    } else {
      cpuTempElement.textContent = 'N/A';
      cpuTempElement.className = 'stat-value temp-normal';
    }

    // --- RAM ---
    const ramUsage = Math.round(data.ram.usage);
    document.getElementById('ramUsage').textContent = `${ramUsage}%`;
    document.getElementById('ramProgress').style.width = `${ramUsage}%`;
    document.getElementById('ramDetails').textContent = `${formatGB(data.ram.used)} GB / ${formatGB(data.ram.total)} GB`;

    // --- NETWORK ---
    // Calculate MB/s based on difference from previous poll
    const now = Date.now();
    let downSpeed = 0, upSpeed = 0;
    if (lastNetDown !== null && lastNetUp !== null && lastUpdateTime !== null) {
      const seconds = (now - lastUpdateTime) / 1000;
      downSpeed = (data.network.down - lastNetDown) / seconds / (1024**2);
      upSpeed = (data.network.up - lastNetUp) / seconds / (1024**2);
    }
    document.getElementById('networkDown').textContent = `${downSpeed.toFixed(2)} MB/s`;
    document.getElementById('networkUp').textContent = `${upSpeed.toFixed(2)} MB/s`;
    lastNetDown = data.network.down;
    lastNetUp = data.network.up;
    lastUpdateTime = now;

    // --- NAS (Z:) ---
    if (data.nas) {
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
    // On error, set placeholders
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
    console.error('Failed to fetch live stats:', err);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const refreshBtn = document.getElementById('refreshStats');
  if (refreshBtn) refreshBtn.addEventListener('click', updateAllStats);
  updateAllStats();
  setInterval(updateAllStats, 5000);
});