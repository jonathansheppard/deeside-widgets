// Shared helpers for the Deeside right now widget and page
const TZ = 'Europe/London';
const DATA = 'weather.json';
const PAGE = 'https://www.deeside.com/deeside-right-now/';
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-GB', {timeZone: TZ, hour: '2-digit', minute: '2-digit'});
const fmtHour = iso => { const h = +new Date(iso).toLocaleString('en-GB', {timeZone: TZ, hour: 'numeric', hour12: false}); return h === 0 ? 'Midnight' : h === 12 ? 'Noon' : (h % 12) + (h < 12 ? 'am' : 'pm'); };
const dayName = iso => { const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')); const t = new Date(); const k = x => x.toLocaleDateString('en-GB', {timeZone: TZ}); if (k(d) === k(t)) return 'Today'; t.setDate(t.getDate() + 1); if (k(d) === k(t)) return 'Tomorrow'; return d.toLocaleDateString('en-GB', {timeZone: TZ, weekday: 'short'}); };
const dayLabel = iso => { const n = dayName(iso); return (n === 'Today' || n === 'Tomorrow') ? n.toLowerCase() : n; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// Met Office significant weather code -> icon
function icon(code, size = 40) {
  const g = c => c == null ? 'cloud' : c === 0 ? 'moon' : c === 1 ? 'sun' : (c === 2 || c === 3) ? 'part' : (c === 5 || c === 6) ? 'fog'
    : (c === 7 || c === 8) ? 'cloud' : (c >= 9 && c <= 15) ? 'rain' : (c >= 16 && c <= 27) ? 'snow' : 'storm';
  const k = g(code);
  const sun = '<circle cx="24" cy="24" r="8" fill="#fbbf24"/><g stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></g>';
  const cl = (x = 0, y = 0, f = '#cbd5e1') => `<path transform="translate(${x} ${y})" d="M14 34h21a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 0 13z" fill="${f}"/>`;
  const drops = '<g stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round"><path d="M17 38l-2 5M25 38l-2 5M33 38l-2 5"/></g>';
  const body = {
    sun, moon: '<path d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z" fill="#e2e8f0"/>',
    part: '<g transform="translate(-6 -6) scale(.8)">' + sun + '</g>' + cl(2, 4),
    cloud: cl(0, 0, '#94a3b8'), rain: cl(0, -4, '#94a3b8') + drops,
    snow: cl(0, -4, '#cbd5e1') + '<g fill="#e2e8f0"><circle cx="17" cy="40" r="2"/><circle cx="25" cy="43" r="2"/><circle cx="33" cy="40" r="2"/></g>',
    storm: cl(0, -4, '#64748b') + '<path d="M26 32l-6 9h5l-3 7 8-10h-5l3-6z" fill="#fbbf24"/>',
    fog: '<g stroke="#94a3b8" stroke-width="3" stroke-linecap="round"><path d="M10 18h28M6 25h32M12 32h26"/></g>'
  }[k];
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

// Things that matter for Deeside right now, most serious first
function alerts(d) {
  const out = [];
  (d.warnings || []).filter(w => w.local).forEach(w => out.push({lvl: w.level === 'yellow' ? 'amber' : 'red', colour: w.level,
    text: `${w.level[0].toUpperCase() + w.level.slice(1)} warning: ${w.type}`, sub: `${w.from} to ${w.to}`, link: w.link}));
  (d.floods || []).forEach(f => out.push({lvl: f.sev <= 2 ? 'red' : 'amber', text: `${f.label}: ${f.area}`, sub: f.tidal ? 'Tidal' : '',
    link: 'https://flood-warning.naturalresources.wales/?culture=en-GB'}));
  (d.powercuts || []).filter(p => !p.planned).forEach(p => out.push({lvl: 'amber', text: `Power cut: ${p.outcodes}${p.town ? ' ' + p.town : ''}`,
    sub: `${p.postcodes} postcodes. Estimate ${p.eta}`, link: p.link}));
  return out.sort((a, b) => (a.lvl === 'red' ? 0 : 1) - (b.lvl === 'red' ? 0 : 1));
}

function nextTide(d, type) {
  const now = Date.now();
  return ((d.tides && d.tides.events) || []).find(e => e.type === type && new Date(e.time) > now);
}

// Forecast hours from the current hour onwards (the data can be up to an hour old)
function upcoming(f) {
  const cut = Date.now() - 30 * 60 * 1000;
  return (f && f.hours || []).filter(h => new Date(h.time).getTime() >= cut);
}
