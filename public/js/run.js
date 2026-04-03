let map;
let polyline;
let sessionId;
let isRunning = true;
let isPaused = false;
let startTime;
let totalPausedTime = 0;
let pauseStartTime = null;
let coordinates = [];
let distance = 0;
let polylineLayer;
let marker = null;  // Current location marker
let routeSegments = []; // Array of arrays for multiple path segments (separated by pauses)
let currentSegment = []; // The current active path segment
routeSegments.push(currentSegment);
let completionLayer;
let timerIntervalId;

// Initialize map on page load
function initializeMap() {
  // Initialize Leaflet map
  map = L.map('map').setView([40.7128, -74.0060], 13);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Initialize polyline for route
  polylineLayer = L.polyline(routeSegments, { color: 'blue', weight: 3 }).addTo(map);

  // Get user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Set map view to current location
        map.setView([lat, lon], 15);
        
        // Create initial marker at starting position
        if (!marker) {
          marker = L.marker([lat, lon], {
            title: 'Your Location',
            icon: L.icon({
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              shadowSize: [41, 41]
            })
          }).addTo(map).bindPopup('Start Location');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }
}

// Start GPS tracking
function startTracking() {
  startTime = Date.now();
  
  // Watch position (every 5 seconds)
  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      if (isPaused || !isRunning) return;

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      coordinates.push([lat, lon]);
      currentSegment.push([lat, lon]);

      // Update polyline with new point
      polylineLayer.setLatLngs(routeSegments);

      // Update or create marker at current position
      if (marker) {
        marker.setLatLng([lat, lon]);
      } else {
        marker = L.marker([lat, lon], {
          title: 'Current Location',
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            shadowSize: [41, 41]
          })
        }).addTo(map).bindPopup('Current Location');
      }

      // Center map on current location
      map.setView([lat, lon], 15);

      // Send coordinate to server
      try {
        await axios.post(`/api/run/${sessionId}/coordinate`, 
          { latitude: lat, longitude: lon },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } catch (error) {
        console.error('Error sending coordinate:', error);
      }

      updateDisplay();
    },
    (error) => {
      console.error('Error getting location:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );

  // Store watchId to stop tracking later
  window.watchId = watchId;
}

// Update display (distance, time, calories)
function updateDisplay() {
  let effectivePause = totalPausedTime;
  if (isPaused && pauseStartTime) {
    effectivePause += (Date.now() - pauseStartTime);
  }
  const elapsedTime = Math.floor((Date.now() - startTime - effectivePause) / 1000);
  document.getElementById('time').textContent = formatTime(elapsedTime);

  // Calculate distance from coordinates
  distance = calculateDistance(coordinates);
  document.getElementById('distance').textContent = distance.toFixed(2) + ' km';

  // Estimate calories (0.063 cal per meter for 70kg person)
  const calories = Math.round(distance * 1000 * 70 * 0.00063);
  document.getElementById('calories').textContent = calories;
}

// Calculate distance from coordinates
function calculateDistance(coords) {
  let totalDistance = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    // Skip calculation across pauses (marked by 999)
    if (coords[i][0] === 999 || coords[i + 1][0] === 999) continue;
    totalDistance += getDistance(coords[i], coords[i + 1]);
  }
  return totalDistance;
}

// Calculate distance between two points (Haversine formula)
function getDistance(point1, point2) {
  const R = 6371; // Radius of Earth in kilometers
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
  const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format time
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Pause running session
async function pauseRun() {
  isPaused = !isPaused;
  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';

  if (isPaused) {
    pauseStartTime = Date.now();
    // Break the polyline visually by creating a new segment
    currentSegment = [];
    routeSegments.push(currentSegment);

    // Record a 999,999 breakpoint to suspend distance calculations across the gap
    coordinates.push([999, 999]);

    if (sessionId) {
      try {
        await axios.post(`/api/run/${sessionId}/coordinate`, 
          { latitude: 999, longitude: 999 },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } catch (error) {
        console.error('Error sending break coordinate:', error);
      }
    }
  } else {
    // Resuming
    if (pauseStartTime) {
      totalPausedTime += (Date.now() - pauseStartTime);
      pauseStartTime = null;
    }
  }
}

function renderCompletedRunOnMap(isClosedLoop) {
  const flattenedRoute = [];
  routeSegments.forEach(seg => {
    seg.forEach(pt => flattenedRoute.push(pt));
  });

  if (!flattenedRoute.length) {
    return;
  }

  if (polylineLayer) {
    polylineLayer.setStyle({
      color: '#2563eb',
      weight: 4,
      opacity: 0.95,
    });
  }

  if (completionLayer) {
    map.removeLayer(completionLayer);
  }

  if (isClosedLoop && flattenedRoute.length >= 3) {
    completionLayer = L.polygon(flattenedRoute, {
      color: '#16a34a',
      fillColor: '#22c55e',
      fillOpacity: 0.25,
      weight: 3,
    }).addTo(map);

    // Add centered territory label
    const username = getUsernameFromToken();
    if (username) {
      const latSum = flattenedRoute.reduce((s, p) => s + p[0], 0);
      const lonSum = flattenedRoute.reduce((s, p) => s + p[1], 0);
      const centerLat = latSum / flattenedRoute.length;
      const centerLon = lonSum / flattenedRoute.length;
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
        ">${username}'s territory</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([centerLat, centerLon], { icon: label }).addTo(map);
    }
  }

  const bounds = L.latLngBounds(flattenedRoute);
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.2));
  }
}

function showCompletionSummary(runData) {
  const feedback = document.getElementById('session-feedback');
  const finalDistance = Number(runData?.stats?.distance || 0).toFixed(2);
  const finalArea = Number(runData?.territoryArea || 0).toFixed(2);

  if (runData.isClosedLoop) {
    feedback.innerHTML = `
      <div class="success">
        <p><strong>✓ Territory Captured!</strong></p>
        <p>Covered Area: ${finalArea} m²</p>
        <p>Your captured shape is now highlighted on the map.</p>
      </div>
    `;
    return;
  }

  feedback.innerHTML = `
    <div class="info">
      <p><strong>✓ Route Saved</strong></p>
      <p>Walked Distance: ${finalDistance} km</p>
      <p>Your completed route is highlighted on the map.</p>
    </div>
  `;
}

function setFinalMeasurements(runData) {
  const finalTime = Number(runData?.session?.total_time || 0);
  const finalDistance = Number(runData?.stats?.distance || 0);
  const finalCalories = Number(runData?.stats?.calories || 0);

  document.getElementById('time').textContent = formatTime(finalTime);
  document.getElementById('distance').textContent = `${finalDistance.toFixed(2)} km`;
  document.getElementById('calories').textContent = String(finalCalories);
}

// Finish running session
async function finishRun() {
  isRunning = false;
  navigator.geolocation.clearWatch(window.watchId);

  try {
    const response = await axios.post(`/api/run/${sessionId}/finish`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (timerIntervalId) {
      clearInterval(timerIntervalId);
    }

    setFinalMeasurements(response.data);
    showCompletionSummary(response.data);
    renderCompletedRunOnMap(response.data.isClosedLoop);

    // Disable buttons after finishing
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('finish-btn').disabled = true;
  } catch (error) {
    console.error('Error finishing run:', error);
    alert('Error finishing run: ' + (error.response?.data?.message || error.message));
  }
}

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Decode JWT to get username
function getUsernameFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || null;
  } catch {
    return null;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!getToken()) {
    window.location.href = '/login';
    return;
  }

  // Initialize map
  initializeMap();

  // Start running session
  try {
    const response = await axios.post('/api/run/start', {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    sessionId = response.data.sessionId;

    // Start tracking
    startTracking();

    // Update display every second
    timerIntervalId = setInterval(updateDisplay, 1000);
  } catch (error) {
    console.error('Error starting session:', error);
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Error starting running session. Please try again.';

    if (status === 401) {
      localStorage.removeItem('token');
      alert('Session expired. Please login again.');
      window.location.href = '/login';
      return;
    }

    alert(message);
    window.location.href = '/';
  }
});
