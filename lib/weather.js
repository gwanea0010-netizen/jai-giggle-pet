// Current weather from Open-Meteo (free, no API key). Only the city name / coordinates leave the PC.

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function geocode(city) {
  const q = encodeURIComponent(String(city).trim());
  const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`);
  const r = data.results && data.results[0];
  if (!r) throw new Error(`City "${city}" not found`);
  return { lat: r.latitude, lon: r.longitude, place: [r.name, r.admin1, r.country].filter(Boolean).join(', ') };
}

// WMO weather codes -> what the pet shows.
function kindOf(code, temp) {
  if ([95, 96, 99].includes(code)) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (temp >= 35) return 'hot';
  if (temp <= 12) return 'cold';
  if (code === 2 || code === 3) return 'cloudy';
  return 'clear';
}

async function current(geo) {
  const data = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
  );
  const c = data.current || {};
  const temp = Math.round(Number(c.temperature_2m));
  return { kind: kindOf(Number(c.weather_code), temp), code: Number(c.weather_code), temp, isDay: c.is_day === 1, place: geo.place, at: Date.now() };
}

module.exports = { geocode, current, kindOf };
