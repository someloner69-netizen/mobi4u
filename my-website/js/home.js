// Secure API key: In production, use environment variables or a backend proxy to avoid exposure
 // Replace with your TMDB API key (get from https://www.themoviedb.org/settings/api)
// Secure API key: In production, use environment variables or a backend proxy to avoid exposure
const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae'; // Replace with your TMDB API key (get from https://www.themoviedb.org/settings/api)
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
let currentItem = null;

// Cache for performance (stores data for 1 hour)
const CACHE_DURATION = 3600000; // 1 hour in ms
function getCachedData(key) {
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) return data;
  }
  return null;
}
function setCachedData(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// Utility: Show/hide loading spinner
function showLoading(show) {
  const loader = document.getElementById('loading');
  if (loader) loader.classList.toggle('hidden', !show);
}

// Utility: Debounce function for search
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

async function fetchTrending(type) {
  const cacheKey = `trending-${type}`;
  let data = getCachedData(cacheKey);
  if (data) return data;

  try {
    showLoading(true);
    const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch trending data');
    data = await res.json();
    setCachedData(cacheKey, data.results);
    return data.results;
  } catch (error) {
    console.error('Error fetching trending:', error);
    alert('Unable to load content. Please check your connection and API key.');
    return [];
  } finally {
    showLoading(false);
  }
}

async function fetchTrendingAnime() {
  const cacheKey = 'trending-anime';
  let data = getCachedData(cacheKey);
  if (data) return data;

  try {
    showLoading(true);
    let allResults = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
      if (!res.ok) continue;
      const pageData = await res.json();
      const filtered = pageData.results.filter(item =>
        item.original_language === 'ja' && item.genre_ids.includes(16)
      );
      allResults = allResults.concat(filtered);
    }
    setCachedData(cacheKey, allResults.slice(0, 20));
    return allResults.slice(0, 20);
  } catch (error) {
    console.error('Error fetching anime:', error);
    return [];
  } finally {
    showLoading(false);
  }
}

function displayBanner(item) {
  const banner = document.getElementById('banner');
  if (item && item.backdrop_path) {
    banner.style.setProperty(
      "background",
      `linear-gradient(to top,rgba(20,20,20,1) 0%,rgba(20,20,20,0.4) 80%),url(${IMG_URL}${item.backdrop_path}) center/cover no-repeat`
    );
    banner.style.setProperty("--banner-img", `url(${IMG_URL}${item.backdrop_path})`);
  } else {
    banner.style.background = '#232323';
  }
  document.getElementById('banner-title').textContent = item?.title || item?.name || "No Title";
  document.getElementById('banner-overview').textContent = item?.overview || "No description available.";
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.loading = 'lazy'; // Lazy load images
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function showDetails(item) {
  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || "No description.";
  document.getElementById('modal-image').src = item.poster_path
    ? `${IMG_URL}${item.poster_path}`
    : 'fallback.jpg';
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
  changeServer();
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').setAttribute('aria-hidden', 'false');
  // Focus trap for accessibility (optional)
  document.getElementById('modal').focus();
}

function changeServer() {
  if (!currentItem) return;
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = '';
  if (server === "youtube") {
    // Fetch official trailer from TMDB
    fetch(`${BASE_URL}/${type}/${currentItem.id}/videos?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        embedURL = trailer ? `https://www.youtube.com/embed/${trailer.key}` : 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // Fallback
        document.getElementById('modal-video').src = embedURL;
      })
      .catch(() => {
        document.getElementById('modal-video').src = 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // Fallback
      });
  } else {
    embedURL = 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // Fallback for other options
    document.getElementById('modal-video').src = embedURL;
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
  document.getElementById('modal').setAttribute('aria-hidden', 'true');
  currentItem = null;
}

function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-modal').setAttribute('aria-hidden', 'false');
  document.getElementById('search-input').focus();
}

function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-modal').setAttribute('aria-hidden', 'true');
}

const debouncedSearch = debounce(async () => {
  const query = document.getElementById('search-input').value.trim();
  if (!query) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  try {
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    data.results.slice(0, 10).forEach(item => { // Limit results
      if (!item.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${item.poster_path}`;
      img.alt = item.title || item.name;
      img.loading = 'lazy';
      img.onclick = () => {
        closeSearchModal();
        showDetails(item);
      };
      container.appendChild(img);
    });
  } catch (error) {
    console.error('Search error:', error);
    document.getElementById('search-results').innerHTML = '<p>Search failed. Try again.</p>';
  }
}, 300);

// Nav configuration for cleaner code
const navConfig = {
  'nav-home': ['row-home', 'row-tv', 'row-anime'],
  'nav-tv': ['row-tv'],
  'nav-movies': ['row-home'],
  'nav-popular': ['row-home', 'row-anime']
};

function setActiveNav(navId) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.getElementById(navId).classList.add('active');
  // Hide all rows, then show selected
  document.querySelectorAll('.row').forEach(row => row.style.display = 'none');
  navConfig[navId].forEach(id => document.getElementById(id).style.display = '');
}

document.addEventListener('DOMContentLoaded', async () => {
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();

  if (movies.length > 0) displayBanner(movies[Math.floor(Math.random() * movies.length)]);
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');

  // Attach nav events
  Object.keys(navConfig).forEach(navId => {
    document.getElementById(navId).onclick = e => {
      e.preventDefault();
      setActiveNav(navId);
    };
  });

  // Search event
  document.getElementById('search-input').addEventListener('input', debouncedSearch);
});

