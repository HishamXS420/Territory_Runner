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

    territories.forEach((territory) => {
      // Support both camelCase (Mongoose) and snake_case field names
      const coords = territory.polygonCoords || territory.polygon_coords;
      const ownerId = territory.userId?._id || territory.userId || territory.user_id;
      const ownerName = territory.userId?.username || territory.username || 'Unknown';

      if (!Array.isArray(coords) || coords.length < 3) {
        return;
      }

      const territoryLabel = ownerName;

      const polygon = L.polygon(coords, getTerritoryStyle(String(ownerId)))
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:130px;">
            <p style="font-weight:700;font-size:13px;margin-bottom:5px;">${territoryLabel}</p>
            <p style="color:#555;font-size:12px;">Area: <strong>${Number(territory.area || 0).toFixed(2)} m²</strong></p>
          </div>
        `)
        .bindTooltip(territoryLabel, {
          permanent: true,
          direction: 'center',
          className: 'territory-tooltip',
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
