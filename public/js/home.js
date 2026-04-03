// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

let territoryMap;
let territoryLayerGroup;
let currentUserId = null;

// Logout function
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// Fetch user profile and statistics
async function loadUserProfile() {
  try {
    const response = await axios.get('/api/auth/profile', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    const { user, stats } = response.data;
    currentUserId = user?.id || null;
    document.getElementById('total-distance').textContent = (stats.totalDistance || stats.total_distance || 0).toFixed(3);
    document.getElementById('total-area').textContent = (stats.totalTerritoryArea || stats.total_territory_area || 0).toFixed(3);
    document.getElementById('total-calories').textContent = stats.totalCalories || stats.total_calories || 0;
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Fetch running history
async function loadRunHistory() {
  try {
    const response = await axios.get('/api/run/history/all', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    const sessions = response.data.sessions;
    const historyList = document.getElementById('history-list');

    historyList.innerHTML = sessions.map(session => `
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body py-4">
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-base-content">
                📅 ${new Date(session.startTime || session.start_time).toLocaleString()}
              </p>
              <div class="flex flex-wrap gap-4 text-sm text-base-content/70">
                <span>📏 <strong>${((session.totalDistance || session.total_distance || 0)).toFixed(2)} km</strong></span>
                <span>⏱ <strong>${formatTime(session.totalTime || session.total_time || 0)}</strong></span>
                <span>🔥 <strong>${session.estimatedCalories || session.estimated_calories || 0} kcal</strong></span>
              </div>
            </div>
            ${session.isClosedLoop ? `<span class="badge badge-success text-white text-xs self-center">Territory ✅</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading run history:', error);
  }
}

// Format time (seconds to HH:MM:SS)
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Start running session
function startRunning() {
  window.location.href = '/run';
}

function initializeTerritoryMap() {
  territoryMap = L.map('territory-map').setView([23.8103, 90.4125], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(territoryMap);

  territoryLayerGroup = L.layerGroup().addTo(territoryMap);
}

function getTerritoryStyle(ownerId) {
  const isOwnTerritory = currentUserId !== null && String(ownerId) === String(currentUserId);

  return {
    color: isOwnTerritory ? '#2ecc71' : '#e74c3c',
    fillColor: isOwnTerritory ? '#2ecc71' : '#e74c3c',
    fillOpacity: 0.35,
    weight: 2,
  };
}

async function loadTerritories() {
  try {
    const response = await axios.get('/api/territory/all');
    const territories = response.data.territories || [];

    territoryLayerGroup.clearLayers();

    if (territories.length === 0) {
      return;
    }

    const bounds = L.latLngBounds([]);

    // First pass: collect all territory data with their centers
    const territoryData = [];

    territories.forEach((territory) => {
      const coords = territory.polygonCoords || territory.polygon_coords;
      const ownerId = territory.userId?._id || territory.userId || territory.user_id;
      const ownerName = territory.userId?.username || territory.username || 'Unknown';

      if (!Array.isArray(coords) || coords.length < 3) {
        return;
      }

      // Calculate polygon center
      let latSum = 0, lngSum = 0;
      coords.forEach(c => { latSum += c[0]; lngSum += c[1]; });
      const centerLat = latSum / coords.length;
      const centerLng = lngSum / coords.length;

      territoryData.push({
        territory, coords, ownerId, ownerName,
        centerLat, centerLng,
        offsetX: 0, offsetY: 0,
      });
    });

    // Second pass: detect overlapping centers and assign offsets
    const CLOSENESS_THRESHOLD = 0.0015; // ~150m in degrees
    const OFFSET_DIRECTIONS = [
      [0, -18],   // top
      [0,  18],   // bottom
      [-20, -10], // top-left
      [ 20, -10], // top-right
      [-20,  10], // bottom-left
      [ 20,  10], // bottom-right
    ];

    for (let i = 0; i < territoryData.length; i++) {
      let dirIndex = 0;
      for (let j = 0; j < territoryData.length; j++) {
        if (i === j) continue;
        const dLat = Math.abs(territoryData[i].centerLat - territoryData[j].centerLat);
        const dLng = Math.abs(territoryData[i].centerLng - territoryData[j].centerLng);

        if (dLat < CLOSENESS_THRESHOLD && dLng < CLOSENESS_THRESHOLD) {
          // These two are close — offset the current one
          const dir = OFFSET_DIRECTIONS[dirIndex % OFFSET_DIRECTIONS.length];
          territoryData[i].offsetX = dir[0];
          territoryData[i].offsetY = dir[1];
          dirIndex++;
        }
      }
    }

    // Third pass: render polygons with computed offsets
    territoryData.forEach((td) => {
      const territoryLabel = td.ownerName;

      const polygon = L.polygon(td.coords, getTerritoryStyle(String(td.ownerId)))
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:130px;">
            <p style="font-weight:700;font-size:13px;margin-bottom:5px;">${territoryLabel}</p>
            <p style="color:#555;font-size:12px;">Area: <strong>${Number(td.territory.area || 0).toFixed(2)} m²</strong></p>
          </div>
        `)
        .bindTooltip(territoryLabel, {
          permanent: true,
          direction: 'center',
          className: 'territory-tooltip',
          offset: [td.offsetX, td.offsetY],
        });

      polygon.addTo(territoryLayerGroup);
      bounds.extend(polygon.getBounds());
    });

    if (bounds.isValid()) {
      territoryMap.fitBounds(bounds.pad(0.15));
    }
  } catch (error) {
    console.error('Error loading territories:', error);
  }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!getToken()) {
    window.location.href = '/login';
    return;
  }

  initializeTerritoryMap();
  await loadUserProfile();
  await Promise.all([loadRunHistory(), loadTerritories()]);
});
