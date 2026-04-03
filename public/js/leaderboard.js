let currentLeaderboard = 'area';

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// Switch between leaderboard types (area / distance)
function switchLeaderboard(type) {
  currentLeaderboard = type;

  // Update DaisyUI tab active state
  const tabArea = document.getElementById('tab-area');
  const tabDist = document.getElementById('tab-distance');

  if (type === 'area') {
    tabArea.className = 'tab tab-active text-white font-semibold';
    tabDist.className = 'tab text-white/70 font-semibold';
  } else {
    tabArea.className = 'tab text-white/70 font-semibold';
    tabDist.className = 'tab tab-active text-white font-semibold';
  }

  loadLeaderboard();
  loadUserRank();
}

// Styles for top 3 positions
const TOP3_STYLES = [
  {
    bg: 'bg-[#B07A55]/50',
    icon: '<i class="fa-solid fa-trophy text-yellow-400 text-3xl"></i>',
  },
  {
    bg: 'bg-[#7A6FA3]/50',
    icon: '<i class="fa-solid fa-medal text-slate-300 text-3xl"></i>',
  },
  {
    bg: 'bg-[#9B4C6A]/55',
    icon: '<i class="fa-solid fa-award text-amber-700 text-3xl"></i>',
  },
];

// Load and render leaderboard
async function loadLeaderboard() {
  const topThreeEl = document.getElementById('top-three');
  const restEl = document.getElementById('leaderboard-rest');

  try {
    const endpoint =
      currentLeaderboard === 'area'
        ? '/api/leaderboard/area'
        : '/api/leaderboard/distance';

    const response = await axios.get(endpoint);
    const leaderboard = response.data.leaderboard || [];

    // ── Top 3 ───────────────────────────────────────────────────
    topThreeEl.innerHTML = leaderboard
      .slice(0, 3)
      .map((user, i) => {
        const style = TOP3_STYLES[i];
        const rank = i + 1;
        const metric =
          currentLeaderboard === 'area'
            ? `${(user.total_territory_area || 0).toFixed(2)} m²`
            : `${(user.total_distance || 0).toFixed(3)} km`;

        return `
          <div class="flex border-2 border-yellow-400 items-center rounded-lg p-4 gap-5 ${style.bg} backdrop-blur-md hover:scale-105 transition-transform duration-300">
            <div class="shrink-0">${style.icon}</div>
            <div class="shrink-0">
              <h2 class="text-4xl font-bold">#${rank}</h2>
            </div>
            <div class="shrink-0">
              <i class="fa-regular fa-circle-user text-3xl"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold">${user.username || 'Unknown'}</h3>
              <p class="text-lg">${metric}</p>
            </div>
          </div>
        `;
      })
      .join('');

    if (leaderboard.length === 0) {
      topThreeEl.innerHTML =
        '<p class="text-white/60 text-center py-6">No runners yet. Be the first!</p>';
    }

    // ── Ranks 4–10 ──────────────────────────────────────────────
    const rest = leaderboard.slice(3, 10);

    restEl.innerHTML = rest
      .map((user, i) => {
        const rank = i + 4;
        const metric =
          currentLeaderboard === 'area'
            ? `${(user.total_territory_area || 0).toFixed(2)} m²`
            : `${(user.total_distance || 0).toFixed(3)} km`;

        return `
          <div class="flex border-2 border-yellow-400 items-center rounded-lg p-4 gap-5 bg-[#7A6F85]/40 hover:scale-105 transition-transform duration-300">
            <div class="shrink-0">
              <h2 class="text-xl font-bold">#${rank}</h2>
            </div>
            <div class="shrink-0">
              <i class="fa-regular fa-circle-user text-xl"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold">${user.username || 'Unknown'}</h3>
              <p>${metric}</p>
            </div>
          </div>
        `;
      })
      .join('');

    if (rest.length === 0) {
      restEl.innerHTML =
        '<p class="text-white/60 text-center py-4">No more rankings yet.</p>';
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    topThreeEl.innerHTML =
      '<p class="text-white/60 text-center py-6">Failed to load leaderboard.</p>';
  }
}

// Load user's current rank
async function loadUserRank() {
  try {
    const token = getToken();
    if (!token) return;

    const endpoint =
      currentLeaderboard === 'area'
        ? '/api/leaderboard/rank/area'
        : '/api/leaderboard/rank/distance';

    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    document.getElementById('your-rank').textContent = response.data.rank ?? '–';
  } catch (error) {
    console.error('Error loading user rank:', error);
  }
}

// Initialise on page load
document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  loadUserRank();
});
