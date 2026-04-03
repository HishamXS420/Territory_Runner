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
      <div class="history-item">
        <p><strong>Date:</strong> ${new Date(session.startTime || session.start_time).toLocaleString()}</p>
        <p><strong>Distance:</strong> ${((session.totalDistance || session.total_distance || 0)).toFixed(2)} km</p>
        <p><strong>Time:</strong> ${formatTime(session.totalTime || session.total_time || 0)}</p>
        <p><strong>Calories:</strong> ${session.estimatedCalories || session.estimated_calories || 0}</p>
        ${session.isClosedLoop ? `<p><strong>Territory Captured ✅</strong></p>` : ''}
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

      const territoryLabel = `${ownerName}'s territory`;

      const polygon = L.polygon(coords, getTerritoryStyle(String(ownerId)))
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:130px;">
            <p style="font-weight:700;font-size:13px;margin-bottom:5px;">${territoryLabel}</p>
            <p style="color:#555;font-size:12px;">Area: <strong>${Number(territory.area || 0).toFixed(2)} m²</strong></p>
          </div>
        `);

      polygon.addTo(territoryLayerGroup);
      bounds.extend(polygon.getBounds());

      // Place a centered label at the territory center
      const centerLat = territory.centerLat || territory.center_lat;
      const centerLon = territory.centerLon || territory.center_lon;
      if (centerLat && centerLon) {
        const label = L.divIcon({
          className: '',
          html: `<div style="
            display:inline-block;
            background: rgba(15,15,15,0.78);
            color: #fff;
            padding: 3px 9px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            font-family: sans-serif;
            white-space: nowrap;
            transform: translate(-50%, -50%);
            pointer-events: none;
            box-shadow: 0 1px 5px rgba(0,0,0,0.5);
            letter-spacing: 0.2px;
          ">${territoryLabel}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        L.marker([centerLat, centerLon], { icon: label })
          .addTo(territoryLayerGroup);
      }
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
