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
      allResults = all
