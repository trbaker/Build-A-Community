// Build a Community — application logic
// Depends on: Leaflet, html2canvas, catalog.js (loaded first in index.html)

// Domain restriction — active only when deployed to production.
// Uncomment before final deployment.
/*
(function() {
  const allowed = 'trbaker.github.io';
  const host = window.location.hostname;
  const isAllowed = host === allowed || host === 'localhost' || host === '127.0.0.1' || host === '';
  if (!isAllowed) {
    document.open();
    document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Not Authorized</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; align-items: center;
               justify-content: center; height: 100vh; margin: 0;
               background: #f4f6f3; flex-direction: column; gap: 16px; }
        h1 { color: #1f2a37; font-size: 1.6rem; }
        p  { color: #555; font-size: 1rem; }
        a  { color: #3d7cc9; }
      </style></head><body>
      <h1>Build a Community</h1>
      <p>This app may only be used at
         <a href="https://trbaker.github.io/buildACommunity/">trbaker.github.io</a>.</p>
    </body></html>`);
    document.close();
  }
})();
*/

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let placedItems = [];
let markerMap = {};       // id -> Leaflet marker
let dragData = null;
let selectedItem = null;
let arcgisToken = null;
let arcgisUsername = null;
let view = null;

// ─────────────────────────────────────────────
//  BUILD SIDEBAR FROM CATALOG
// ─────────────────────────────────────────────
function iconHtml(icon, cls) {
  return icon.startsWith('http')
    ? `<img class="${cls}-img" src="${icon}" alt="" crossorigin="anonymous">`
    : `<span class="${cls}-icon">${icon}</span>`;
}

function buildSidebar() {
  const list = document.getElementById('categoryList');
  list.innerHTML = CATEGORIES.map(cat => `
    <div class="category">
      <div class="category-label">
        <span class="swatch" style="background:${cat.color}"></span>${cat.label}
      </div>
      <div class="category-grid">
        ${cat.features.map(f => `
          <div class="feature-item" draggable="true"
               data-type="${f.type}" data-label="${f.label}" data-icon="${f.icon}" data-category="${cat.key}"
               style="--cat:${cat.color}" title="${f.label}">
            ${iconHtml(f.icon, 'eq')}
            <span class="eq-name">${f.label}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  document.querySelectorAll('.feature-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragData = {
        type: el.dataset.type,
        icon: el.dataset.icon,
        label: el.dataset.label,
        category: el.dataset.category
      };
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', el.dataset.type);
      if (view) view.dragging.disable();
    });
    el.addEventListener('dragend', () => { if (view) view.dragging.enable(); });
  });
}

// ─────────────────────────────────────────────
//  MAP INIT — Leaflet
// ─────────────────────────────────────────────
window.addEventListener('load', function() {
  buildSidebar();
  updateSummary();

  view = L.map('viewDiv', { zoomControl: true, maxZoom: 19 }).setView([39.8283, -98.5795], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(view);

  document.getElementById('map-loading').style.display = 'none';
  sysLog('success', 'Map loaded', 'OpenStreetMap basemap via Leaflet');
  setupDrop();
});

// ─────────────────────────────────────────────
//  DROP ONTO MAP
// ─────────────────────────────────────────────
function setupDrop() {
  const mapContainer = document.getElementById('mapContainer');

  mapContainer.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    mapContainer.classList.add('drag-over');
  });
  mapContainer.addEventListener('dragleave', e => {
    if (!mapContainer.contains(e.relatedTarget)) mapContainer.classList.remove('drag-over');
  });
  mapContainer.addEventListener('drop', e => {
    e.preventDefault();
    mapContainer.classList.remove('drag-over');
    if (!dragData) return;

    const rect = document.getElementById('viewDiv').getBoundingClientRect();
    const latlng = view.containerPointToLatLng(L.point(e.clientX - rect.left, e.clientY - rect.top));

    const item = {
      id: Date.now() + Math.random(),
      type: dragData.type,
      icon: dragData.icon,
      label: dragData.label,
      category: dragData.category,
      mapLon: latlng.lng,
      mapLat: latlng.lat
    };
    placedItems.push(item);
    renderItem(item);
    updateSummary();
    dragData = null;
  });
}

// ─────────────────────────────────────────────
//  RENDER A PLACED ITEM (Leaflet marker)
// ─────────────────────────────────────────────
function buildMarkerHtml(item) {
  const color = CATEGORY_BY_KEY[item.category]?.color || '#8a94a3';
  return `<div class="placed-marker" id="item-${item.id}" style="--cat:${color}">
    <div class="placed-disc">${iconHtml(item.icon, 'placed')}</div>
    <div class="placed-label-wrap">
      <button class="delete-btn" title="Remove">✕</button>
      <div class="placed-label" contenteditable="true" spellcheck="false"
           data-id="${item.id}">${item.label}</div>
    </div>
  </div>`;
}

function makeDivIcon(item) {
  return L.divIcon({
    className: '',
    html: buildMarkerHtml(item),
    iconAnchor: [30, 22],   // center of the disc
    iconSize: [60, 70]
  });
}

function renderItem(item) {
  const marker = L.marker([item.mapLat, item.mapLon], {
    icon: makeDivIcon(item),
    draggable: true,
    autoPan: true
  }).addTo(view);

  marker.on('dragstart', () => { view.dragging.disable(); deselectAll(); });
  marker.on('drag', () => {
    const ll = marker.getLatLng(); item.mapLat = ll.lat; item.mapLon = ll.lng;
  });
  marker.on('dragend', () => {
    view.dragging.enable();
    const ll = marker.getLatLng(); item.mapLat = ll.lat; item.mapLon = ll.lng;
  });

  marker.on('add', () => wireMarkerDom(item, marker));
  markerMap[item.id] = marker;
}

function wireMarkerDom(item, marker) {
  const el = document.getElementById('item-' + item.id);
  if (!el) return;

  el.addEventListener('mousedown', e => {
    if (e.target.classList.contains('delete-btn')) return;
    if (e.target.classList.contains('placed-label')) return;
    selectItem(item.id);
  });

  // Label editing: the contenteditable already shows what the user types, so
  // only the data model is updated on input; the marker is not rebuilt (which
  // would steal focus after every keystroke). Normalize on blur.
  const labelEl = el.querySelector('.placed-label');
  if (labelEl) {
    labelEl.addEventListener('input', () => {
      const found = placedItems.find(i => i.id === item.id);
      if (found) found.label = labelEl.textContent.trim().slice(0, 40);
    });
    labelEl.addEventListener('blur', () => {
      const found = placedItems.find(i => i.id === item.id);
      if (!found) return;
      if (!found.label) found.label = FEATURE_BY_TYPE[found.type]?.label || 'Feature';
      if (labelEl.textContent !== found.label) labelEl.textContent = found.label;
    });
    labelEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); labelEl.blur(); }
      e.stopPropagation();   // keep Delete/Backspace inside the label
    });
  }

  const delBtn = el.querySelector('.delete-btn');
  if (delBtn) delBtn.addEventListener('click', e => { e.stopPropagation(); removeItem(item.id); });
}

// ─────────────────────────────────────────────
//  SELECTION / REMOVE / CLEAR
// ─────────────────────────────────────────────
function selectItem(id) {
  deselectAll();
  const el = document.getElementById('item-' + id);
  if (el) el.classList.add('selected');
  selectedItem = id;
}
function deselectAll() {
  document.querySelectorAll('.placed-marker').forEach(el => el.classList.remove('selected'));
  selectedItem = null;
}
document.addEventListener('mousedown', e => {
  if (!e.target.closest('.placed-marker')) deselectAll();
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem !== null
      && !document.activeElement.isContentEditable
      && document.activeElement.tagName !== 'INPUT') {
    removeItem(selectedItem);
  }
});

function removeItem(id) {
  placedItems = placedItems.filter(i => i.id !== id);
  if (markerMap[id]) { view.removeLayer(markerMap[id]); delete markerMap[id]; }
  if (selectedItem === id) selectedItem = null;
  updateSummary();
}

function clearAll() {
  if (placedItems.length === 0) return;
  if (!confirm(`Remove all ${placedItems.length} features from the map?`)) return;
  Object.values(markerMap).forEach(m => view.removeLayer(m));
  markerMap = {};
  placedItems = [];
  updateSummary();
}

// ─────────────────────────────────────────────
//  LAND-USE MIX SUMMARY
// ─────────────────────────────────────────────
function categoryCounts() {
  const counts = {};
  CATEGORIES.forEach(c => counts[c.key] = 0);
  placedItems.forEach(i => { if (counts[i.category] !== undefined) counts[i.category]++; });
  return counts;
}

function updateSummary() {
  const counts = categoryCounts();
  const total  = placedItems.length;
  document.getElementById('summaryTotal').textContent = `${total} feature${total === 1 ? '' : 's'}`;

  const bar  = document.getElementById('mixBar');
  const list = document.getElementById('mixList');
  const empty = document.getElementById('summaryEmpty');

  if (total === 0) {
    bar.innerHTML = ''; list.innerHTML = ''; empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  bar.innerHTML = CATEGORIES.filter(c => counts[c.key] > 0)
    .map(c => `<span style="flex:${counts[c.key]};background:${c.color}" title="${c.label}: ${counts[c.key]}"></span>`).join('');
  list.innerHTML = CATEGORIES.map(c => {
    const n = counts[c.key];
    const pct = Math.round(n / total * 100);
    return `<div style="${n === 0 ? 'opacity:0.4' : ''}">
      <span class="swatch" style="background:${c.color}"></span>
      <span>${shortLabel(c.label)}</span>
      <span class="n">${n}${n > 0 ? ` · ${pct}%` : ''}</span>
    </div>`;
  }).join('');
}

function shortLabel(label) {
  return label.replace('Open space & recreation', 'Open space')
              .replace('Utilities & infrastructure', 'Utilities')
              .replace('Civic & services', 'Civic');
}

// ─────────────────────────────────────────────
//  EXPORT IMAGE
// ─────────────────────────────────────────────
function takeScreenshot() {
  document.getElementById('ssTitleInput').value = '';
  document.getElementById('ssTitleOverlay').classList.add('open');
  setTimeout(() => document.getElementById('ssTitleInput').focus(), 100);
}

async function doScreenshot() {
  const userTitle = document.getElementById('ssTitleInput').value.trim();
  document.getElementById('ssTitleOverlay').classList.remove('open');
  deselectAll();

  const flash = document.getElementById('flash');
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 300);

  const hideEls = [
    ...document.querySelectorAll('.hide-on-screenshot'),
    ...document.querySelectorAll('.leaflet-control-container')
  ];
  hideEls.forEach(el => el.style.visibility = 'hidden');

  sysLog('info', 'Export started', userTitle ? `Title: "${userTitle}"` : 'No title');
  try {
    const mapContainer = document.getElementById('mapContainer');
    const canvas = await html2canvas(mapContainer, {
      useCORS: true, allowTaint: true, logging: false,
      width: mapContainer.clientWidth, height: mapContainer.clientHeight
    });
    const ctx = canvas.getContext('2d');

    // Title block
    if (userTitle) {
      const fontSize = 30, padding = 18;
      ctx.save();
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textW = ctx.measureText(userTitle).width;
      const boxW = textW + padding * 2, boxH = fontSize + padding;
      const boxX = (canvas.width - boxW) / 2, boxY = 20;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = 'rgba(31,42,55,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = '#1f2a37';
      ctx.fillText(userTitle, canvas.width / 2, boxY + boxH / 2);
      ctx.restore();
    }

    // Legend (bottom-right) — only categories that are present
    const counts = categoryCounts();
    const present = CATEGORIES.filter(c => counts[c.key] > 0);
    if (present.length) {
      const rowH = 20, pad = 12, sw = 12;
      ctx.save();
      ctx.font = '600 13px Arial, sans-serif';
      const maxW = Math.max(...present.map(c => ctx.measureText(`${c.label} (${counts[c.key]})`).width));
      const boxW = maxW + sw + pad * 3, boxH = present.length * rowH + pad * 2;
      const boxX = canvas.width - boxW - 14, boxY = canvas.height - boxH - 28;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = 'rgba(31,42,55,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      present.forEach((c, i) => {
        const y = boxY + pad + i * rowH + rowH / 2;
        ctx.fillStyle = c.color;
        ctx.fillRect(boxX + pad, y - sw / 2, sw, sw);
        ctx.fillStyle = '#1f2a37';
        ctx.fillText(`${c.label} (${counts[c.key]})`, boxX + pad * 2 + sw, y);
      });
      ctx.restore();
    }

    // Watermark bottom-left
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = 'rgba(31,42,55,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${APP_NAME} v${APP_VERSION}`, 10, canvas.height - 8);

    hideEls.forEach(el => el.style.visibility = '');

    const filename = userTitle
      ? userTitle.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '-').toLowerCase() + '.png'
      : 'my-community-design.png';

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('Image exported', '#1f2a37');
    sysLog('success', 'Image exported', filename);
  } catch(err) {
    hideEls.forEach(el => el.style.visibility = '');
    console.error(err);
    showToast('Export finished — check your downloads', '#1f2a37');
  }
}

// ─────────────────────────────────────────────
//  SAVE MODAL HELPERS
// ─────────────────────────────────────────────
function suggestedMapName() {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `Community Design ${date} ${time}`;
}

function showSignIn() {
  document.getElementById('signinModal').classList.add('open');
  document.getElementById('signinError').textContent = '';
  try {
    const saved = JSON.parse(sessionStorage.getItem('ago_creds') || 'null');
    if (saved && saved.expiry > Date.now()) {
      document.getElementById('arcgisUser').value = saved.user || '';
      document.getElementById('arcgisPass').value = saved.pass || '';
      document.getElementById('rememberMe').checked = true;
      sysLog('info', 'Credentials restored from session', `Expires in ${Math.round((saved.expiry - Date.now()) / 60000)} min`);
    } else {
      sessionStorage.removeItem('ago_creds');
    }
  } catch(e) {}
  const titleInput = document.getElementById('mapTitle');
  if (!titleInput.value) titleInput.value = suggestedMapName();
}

function closeSignIn() { document.getElementById('signinModal').classList.remove('open'); }

// ─────────────────────────────────────────────
//  SAVE TO ARCGIS ONLINE
//  Pipeline (unchanged from Build a Park):
//   1. Build renderer  2. Upload CSV item  3. Publish as hosted feature layer
//   4. Thumbnail + share  5. Build web map JSON  6. Save web map  7. Share
// ─────────────────────────────────────────────
async function saveToArcGIS() {
  if (placedItems.length === 0) {
    showToast('Place at least one feature on the map first', '#c2703d');
    return;
  }
  document.getElementById('arcgisInfoModal').classList.add('open');
}
function closeArcGISInfo() { document.getElementById('arcgisInfoModal').classList.remove('open'); }
function proceedToSignIn() { closeArcGISInfo(); showSignIn(); }

async function doSignIn() {
  const user     = document.getElementById('arcgisUser').value.trim();
  const pass     = document.getElementById('arcgisPass').value;
  const title    = document.getElementById('mapTitle').value.trim() || suggestedMapName();
  const remember = document.getElementById('rememberMe').checked;
  const errEl    = document.getElementById('signinError');
  errEl.textContent = '';

  if (!user || !pass) { errEl.textContent = 'Enter your username and password.'; return; }

  if (remember) {
    try {
      sessionStorage.setItem('ago_creds', JSON.stringify({ user, pass, expiry: Date.now() + 60 * 60 * 1000 }));
      sysLog('info', 'Credentials saved to session', 'Expires in 60 min');
    } catch(e) {}
  } else {
    sessionStorage.removeItem('ago_creds');
  }

  errEl.style.color = '#3d7cc9';
  errEl.textContent = 'Signing in…';

  try {
    // 1. Portal token
    const tokenRes = await fetch('https://www.arcgis.com/sharing/rest/generateToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: user, password: pass, client: 'requestip', expiration: 120, f: 'json' }).toString()
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.token) {
      errEl.style.color = '#c0392b';
      errEl.textContent = tokenData.error?.message || 'Sign-in failed. Check your username and password.';
      sysLog('error', 'ArcGIS token failed', tokenData.error?.message || 'No token returned');
      return;
    }

    arcgisToken = tokenData.token;
    arcgisUsername = user;
    sysLog('success', 'ArcGIS token acquired', `User: ${user}, expires: ${new Date(tokenData.expires).toLocaleTimeString()}`);

    const AGO = 'https://www.arcgis.com/sharing/rest';
    const tok = arcgisToken;

    async function agoPost(url, params) {
      params.token = tok; params.f = 'json';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString()
      });
      return res.json();
    }

    async function shareToOrg(itemId) {
      const r = await agoPost(`${AGO}/content/users/${arcgisUsername}/items/${itemId}/share`,
                              { everyone: false, org: true, groups: '' });
      sysLog(r.results?.[0]?.success ? 'success' : 'warn', 'Share to org', `itemId: ${itemId} — ${JSON.stringify(r).slice(0,120)}`);
      return r;
    }

    // ── STEP 1: Renderer — unique value on `category`, land-use colors ──
    errEl.textContent = 'Step 1 of 4 — Building symbology…';

    const usedCategories = CATEGORIES.filter(c => placedItems.some(i => i.category === c.key));
    const anyPictureIcons = placedItems.some(i => i.icon.startsWith('http'));

    let renderer;
    if (anyPictureIcons) {
      // If PNG icons are in use, symbolize per feature type with picture markers
      const uniqueTypes = [...new Map(placedItems.map(i => [i.type, i])).values()];
      renderer = {
        type: 'uniqueValue',
        field1: 'feature_type',
        defaultSymbol: { type: 'esriSMS', style: 'esriSMSCircle', color: [138,148,163,220], size: 12,
                         outline: { color: [255,255,255,255], width: 1 } },
        uniqueValueInfos: uniqueTypes.map(item => {
          const rgb = CATEGORY_BY_KEY[item.category]?.rgb || [138,148,163];
          return {
            value: item.type, label: item.label,
            symbol: item.icon.startsWith('http')
              ? { type: 'esriPMS', url: item.icon, contentType: 'image/png', width: 24, height: 24 }
              : { type: 'esriSMS', style: 'esriSMSCircle', color: [...rgb, 220], size: 14,
                  outline: { color: [255,255,255,255], width: 1.5 } }
          };
        })
      };
    } else {
      // Emoji icons: symbolize by land-use category (color-coded circles)
      renderer = {
        type: 'uniqueValue',
        field1: 'category',
        defaultSymbol: { type: 'esriSMS', style: 'esriSMSCircle', color: [138,148,163,220], size: 12,
                         outline: { color: [255,255,255,255], width: 1 } },
        uniqueValueInfos: usedCategories.map(c => ({
          value: c.key, label: c.label,
          symbol: { type: 'esriSMS', style: 'esriSMSCircle', color: [...c.rgb, 230], size: 14,
                    outline: { color: [255,255,255,255], width: 1.5 } }
        }))
      };
    }

    const drawingInfo = {
      renderer,
      labelingInfo: [{
        labelExpression: '[feature_name]',
        labelPlacement: 'esriServerPointLabelPlacementAboveCenter',
        useCodedValues: false,
        symbol: {
          type: 'esriTS',
          color: [31, 42, 55, 255],
          backgroundColor: [255,255,255,190],
          font: { size: 9, weight: 'bold', family: 'Arial' }
        },
        minScale: 0, maxScale: 0
      }]
    };

    // ── STEP 2: Build CSV and upload as portal item ──
    errEl.textContent = 'Step 2 of 4 — Uploading feature data…';

    const clean = s => String(s).replace(/,/g, ';').replace(/[\r\n]+/g, ' ');
    const csvRows = ['feature_name,feature_type,category,category_label,icon,latitude,longitude'];
    placedItems.forEach(item => {
      const catLabel = CATEGORY_BY_KEY[item.category]?.label || '';
      csvRows.push([clean(item.label), clean(item.type), clean(item.category), clean(catLabel),
                    clean(item.icon), item.mapLat, item.mapLon].join(','));
    });
    const csvText = csvRows.join('\n');
    sysLog('info', 'CSV built', `${placedItems.length} rows`);

    const csvName = ((title + '_data').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50)) + '_' + Date.now().toString().slice(-6);
    const csvBlob = new Blob([csvText], { type: 'text/csv' });
    const csvForm = new FormData();
    csvForm.append('f', 'json');
    csvForm.append('token', tok);
    csvForm.append('type', 'CSV');
    csvForm.append('title', csvName);
    csvForm.append('tags', 'community,urban planning,land use,student design');
    csvForm.append('typeKeywords', 'Mapmaker,Atlas,0cd1cdee853c413a84bfe4b9a6931f0d');
    csvForm.append('description', `Feature data for: ${title}`);
    csvForm.append('file', csvBlob, csvName + '.csv');

    const csvUpRes = await fetch(`${AGO}/content/users/${arcgisUsername}/addItem`, { method: 'POST', body: csvForm }).then(r => r.json());
    sysLog('info', 'CSV upload response', JSON.stringify(csvUpRes).slice(0, 200));
    if (!csvUpRes.success || !csvUpRes.id) {
      sysLog('error', 'CSV upload failed', JSON.stringify(csvUpRes));
      throw new Error(csvUpRes.error?.message || 'Upload failed');
    }
    const csvItemId = csvUpRes.id;
    sysLog('success', 'CSV uploaded', `Item ID: ${csvItemId}`);

    // ── STEP 3: Publish CSV as hosted feature layer ──
    errEl.textContent = 'Step 3 of 4 — Publishing feature layer…';

    const strField = (name, alias, length = 256) => ({
      name, type: 'esriFieldTypeString', alias, sqlType: 'sqlTypeNVarchar', length,
      nullable: true, editable: true, domain: null, defaultValue: null, locationType: 'unknown'
    });

    const publishParameters = {
      type: 'csv',
      name: csvName,
      locationType: 'coordinates',
      latitudeFieldName: 'latitude',
      longitudeFieldName: 'longitude',
      coordinateFieldType: 'LatitudeAndLongitude',
      columnDelimiter: ',',
      qualifier: '"',
      hasStaticData: false,
      maxRecordCount: 2000,
      targetSR: { wkid: 102100, latestWkid: 3857 },
      editorTrackingInfo: {
        enableEditorTracking: false,
        enableOwnershipAccessControl: false,
        allowOthersToQuery: true,
        allowOthersToUpdate: true,
        allowOthersToDelete: false,
        allowAnonymousToUpdate: true,
        allowAnonymousToDelete: true
      },
      layerInfo: {
        name: 'Community Features',
        type: 'Feature Layer',
        geometryType: 'esriGeometryPoint',
        displayField: 'feature_name',
        description: 'Community features placed by student',
        defaultVisibility: true,
        allowGeometryUpdates: true,
        hasAttachments: false,
        hasM: false, hasZ: false,
        objectIdField: 'FID',
        globalIdField: '', typeIdField: '',
        drawingInfo,
        fields: [
          strField('feature_name',   'Feature Name'),
          strField('feature_type',   'Feature Type'),
          strField('category',       'Land-Use Category'),
          strField('category_label', 'Category'),
          strField('icon',           'Icon', 512),
          { name: 'latitude',  type: 'esriFieldTypeDouble', alias: 'Latitude',  sqlType: 'sqlTypeFloat',
            nullable: true, editable: true, domain: null, defaultValue: null, locationType: 'latitude' },
          { name: 'longitude', type: 'esriFieldTypeDouble', alias: 'Longitude', sqlType: 'sqlTypeFloat',
            nullable: true, editable: true, domain: null, defaultValue: null, locationType: 'longitude' }
        ],
        indexes: [], types: [], templates: [],
        supportedQueryFormats: 'JSON, geoJSON',
        hasStaticData: false,
        maxRecordCount: -1,
        capabilities: 'Query,Editing'
      }
    };

    sysLog('info', 'publishParameters', JSON.stringify(publishParameters).slice(0, 300));

    const publishRes = await agoPost(`${AGO}/content/users/${arcgisUsername}/publish`, {
      itemid: csvItemId, filetype: 'csv', publishParameters: JSON.stringify(publishParameters)
    });
    sysLog('info', 'publish response', JSON.stringify(publishRes).slice(0, 400));

    let serviceItemId = null, serviceUrl = null;
    if (publishRes.services?.[0]) {
      serviceItemId = publishRes.services[0].serviceItemId;
      sysLog('info', 'Publish job started', `serviceItemId: ${serviceItemId}, jobId: ${publishRes.services[0].jobId || 'n/a'}`);
    } else if (publishRes.error) {
      sysLog('error', 'publish failed', JSON.stringify(publishRes.error));
      throw new Error(publishRes.error.message || 'Publishing the feature layer failed');
    } else {
      sysLog('error', 'publish unexpected response', JSON.stringify(publishRes).slice(0, 400));
      throw new Error('Unexpected publish response — see the system log under About');
    }

    // Poll until publish completes
    sysLog('info', 'Waiting for publish job…', serviceItemId);
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 2500));
      const statusRes = await fetch(
        `${AGO}/content/users/${arcgisUsername}/items/${serviceItemId}/status?f=json&jobType=publish&token=${encodeURIComponent(tok)}`
      ).then(r => r.json());
      sysLog('info', `Publish status (${i+1})`, `${statusRes.status || '?'} ${statusRes.statusMessage || ''}`);
      if (statusRes.status === 'completed') {
        const itemRes = await fetch(`${AGO}/content/items/${serviceItemId}?f=json&token=${encodeURIComponent(tok)}`).then(r => r.json());
        serviceUrl = itemRes.url;
        sysLog('success', 'Feature layer published', serviceUrl);
        break;
      }
      if (statusRes.status === 'failed') {
        sysLog('error', 'Publish job failed', statusRes.statusMessage || '');
        throw new Error('Publish job failed: ' + (statusRes.statusMessage || 'unknown'));
      }
    }
    if (!serviceUrl) throw new Error('Publishing timed out — try again');

    // ── STEP 4: Thumbnail, tag, share ──
    errEl.textContent = 'Step 4 of 4 — Saving web map…';

    let thumbnailBlob = null;
    try {
      deselectAll();
      const mapContainer = document.getElementById('mapContainer');
      const fullCanvas = await html2canvas(mapContainer, {
        useCORS: true, allowTaint: true, logging: false,
        width: mapContainer.clientWidth, height: mapContainer.clientHeight
      });
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 400; thumbCanvas.height = 200;
      thumbCanvas.getContext('2d').drawImage(fullCanvas, 0, 0, fullCanvas.width, fullCanvas.height, 0, 0, 400, 200);
      const arr = thumbCanvas.toDataURL('image/png').split(',');
      const bstr = atob(arr[1]);
      const u8 = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      thumbnailBlob = new Blob([u8], { type: 'image/png' });
      sysLog('success', 'Thumbnail captured', '400×200px');
    } catch(e) {
      sysLog('warn', 'Thumbnail capture failed', e.message);
    }

    const updateSvcForm = new FormData();
    updateSvcForm.append('f', 'json');
    updateSvcForm.append('token', tok);
    updateSvcForm.append('typeKeywords', 'Mapmaker,Atlas,0cd1cdee853c413a84bfe4b9a6931f0d,Feature Service,Hosted Service');
    if (thumbnailBlob) updateSvcForm.append('thumbnail', thumbnailBlob, 'thumbnail.png');
    const updateSvcRes = await fetch(`${AGO}/content/users/${arcgisUsername}/items/${serviceItemId}/update`,
                                     { method: 'POST', body: updateSvcForm }).then(r => r.json());
    sysLog('info', 'Feature service item updated', JSON.stringify(updateSvcRes).slice(0,100));

    await shareToOrg(csvItemId);
    await shareToOrg(serviceItemId);

    // ── STEP 5: Web map JSON ──
    const bounds = view.getBounds();
    const extent = bounds ? { xmin: bounds.getWest(), ymin: bounds.getSouth(), xmax: bounds.getEast(), ymax: bounds.getNorth() } : null;
    const layerUrl = serviceUrl.endsWith('/0') ? serviceUrl : `${serviceUrl}/0`;

    const toWM = (lon, lat) => ({
      x: lon * 20037508.342787 / 180,
      y: Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.342787 / 180
    });
    const sw = extent ? toWM(extent.xmin, extent.ymin) : toWM(-125, 24);
    const ne = extent ? toWM(extent.xmax, extent.ymax) : toWM(-66, 49);

    const webmapJson = {
      operationalLayers: [{
        id: 'communityFeatures',
        title: 'Community Features',
        url: layerUrl,
        layerType: 'ArcGISFeatureLayer',
        opacity: 1, visibility: true, mode: 1,
        popupInfo: {
          title: '{feature_name}',
          fieldInfos: [
            { fieldName: 'feature_name',   label: 'Feature',  visible: true },
            { fieldName: 'feature_type',   label: 'Type',     visible: true },
            { fieldName: 'category_label', label: 'Land use', visible: true },
            { fieldName: 'category',       label: 'Category key', visible: false },
            { fieldName: 'icon',           label: 'Icon',     visible: false }
          ]
        }
      }],
      baseMap: {
        baseMapLayers: [{
          id: 'World_Topo_Map_3805',
          layerType: 'ArcGISTiledMapServiceLayer',
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
          title: 'World Topographic Map',
          fullExtent: { xmin: -20037508.342787, ymin: -20037508.342787, xmax: 20037508.342787, ymax: 20037508.342787,
                        spatialReference: { wkid: 102100, latestWkid: 3857 } },
          opacity: 1, visibility: true, isReference: false
        }],
        title: 'Topographic'
      },
      spatialReference: { wkid: 102100, latestWkid: 3857 },
      initialState: {
        viewpoint: {
          targetGeometry: { spatialReference: { wkid: 102100, latestWkid: 3857 },
                            xmin: sw.x, ymin: sw.y, xmax: ne.x, ymax: ne.y }
        }
      },
      authoringApp: 'CommunityDesigner',
      authoringAppVersion: APP_VERSION,
      version: '2.26'
    };

    // ── STEP 6: Save web map ──
    const counts = categoryCounts();
    const mixSummary = CATEGORIES.filter(c => counts[c.key] > 0).map(c => `${c.label}: ${counts[c.key]}`).join(', ');

    const wmForm = new FormData();
    wmForm.append('f', 'json');
    wmForm.append('token', tok);
    wmForm.append('title', title);
    wmForm.append('type', 'Web Map');
    wmForm.append('tags', 'community,urban planning,land use,student design');
    wmForm.append('typeKeywords', 'Mapmaker,Atlas,0cd1cdee853c413a84bfe4b9a6931f0d,Web Map');
    wmForm.append('description', `A community design created by ${arcgisUsername} using ${APP_NAME} v${APP_VERSION}. Land-use mix — ${mixSummary}.`);
    wmForm.append('snippet', `Community design with ${placedItems.length} features (${mixSummary})`);
    wmForm.append('text', JSON.stringify(webmapJson));
    wmForm.append('extent', extent ? `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}` : '-125,24,-66,49');
    if (thumbnailBlob) wmForm.append('thumbnail', thumbnailBlob, 'thumbnail.png');

    const wmRes = await fetch(`${AGO}/content/users/${arcgisUsername}/addItem`, { method: 'POST', body: wmForm }).then(r => r.json());
    sysLog('info', 'Web map addItem response', JSON.stringify(wmRes).slice(0,200));
    if (!wmRes.success || !wmRes.id) {
      sysLog('error', 'Web map save failed', JSON.stringify(wmRes.error || wmRes));
      throw new Error(wmRes.error?.message || 'Saving the web map failed');
    }
    sysLog('success', 'Web map saved', `Item ID: ${wmRes.id}`);

    // ── STEP 7: Share ──
    await shareToOrg(wmRes.id);

    closeSignIn();
    if (!document.getElementById('rememberMe').checked) document.getElementById('arcgisPass').value = '';
    document.getElementById('mapTitle').value = '';

    const mapUrl = `https://www.arcgis.com/home/item.html?id=${wmRes.id}`;
    showToast(`"${title}" saved and shared with your organization`, '#1f2a37');
    setTimeout(() => window.open(mapUrl, '_blank'), 1500);
  } catch(err) {
    console.error(err);
    errEl.style.color = '#c0392b';
    errEl.textContent = err.message || 'Connection error. Try again.';
  }
}

// ─────────────────────────────────────────────
//  LOCATION SEARCH (ArcGIS World Geocoding)
// ─────────────────────────────────────────────
let searchDebounce = null;

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = input.value.trim();
    if (q.length < 3) { closeResults(); return; }
    searchDebounce = setTimeout(() => suggestAddresses(q), 350);
  });
  document.addEventListener('mousedown', e => {
    if (!document.getElementById('searchWrap').contains(e.target)) closeResults();
  });
});

async function suggestAddresses(query) {
  try {
    const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest');
    url.searchParams.set('f', 'json');
    url.searchParams.set('text', query);
    url.searchParams.set('maxSuggestions', 6);
    url.searchParams.set('category', 'Address,POI,Populated Place,Neighborhood,Education');
    const res = await fetch(url);
    const data = await res.json();
    showSuggestions(data.suggestions || []);
  } catch(e) { console.error('Suggest error', e); }
}

function showSuggestions(suggestions) {
  const box = document.getElementById('searchResults');
  box.innerHTML = '';
  if (!suggestions.length) {
    box.innerHTML = '<div class="search-no-results">No results. Try a city name or a full address.</div>';
    box.classList.add('open');
    return;
  }
  suggestions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    const t = s.text.toLowerCase();
    const icon = t.includes('university') || t.includes('college') || t.includes('campus') ? '🎓'
               : t.includes('school') ? '🏫'
               : t.includes('park') ? '🌳'
               : s.text.split(',').length <= 3 ? '🏙️'
               : '📍';
    const parts = s.text.split(',');
    const name = parts[0] || s.text;
    const addr = parts.slice(1).join(',').trim();
    item.innerHTML = `<span class="sri-icon">${icon}</span>
      <span class="sri-text">
        <span class="sri-name">${name}</span>
        ${addr ? `<span class="sri-addr">${addr}</span>` : ''}
      </span>`;
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      document.getElementById('searchInput').value = s.text;
      closeResults();
      geocodeAndGo(s.text, s.magicKey);
    });
    box.appendChild(item);
  });
  box.classList.add('open');
}

function closeResults() { document.getElementById('searchResults').classList.remove('open'); }

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  closeResults();
  await geocodeAndGo(q, null);
}

async function geocodeAndGo(text, magicKey) {
  showToast('Finding location…', '#1f2a37');
  try {
    const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
    url.searchParams.set('f', 'json');
    url.searchParams.set('singleLine', text);
    url.searchParams.set('outFields', 'PlaceName,Place_addr,Type,Addr_type');
    url.searchParams.set('maxLocations', 1);
    if (magicKey) url.searchParams.set('magicKey', magicKey);
    const res = await fetch(url);
    const data = await res.json();
    const candidates = data.candidates || [];
    if (!candidates.length) {
      showToast('Location not found. Try a more specific search.', '#c2703d');
      return;
    }
    const best = candidates[0];
    const lon = best.location.x, lat = best.location.y;
    const name = best.attributes?.PlaceName || text.split(',')[0];

    // Zoom to a scale that fits the kind of place found
    const addrType = (best.attributes?.Addr_type || '').toLowerCase();
    const type = (best.attributes?.Type || '').toLowerCase();
    let zoom = 16;                                                   // neighborhood / address
    if (addrType === 'locality' || type.includes('city') || type.includes('town')) zoom = 13;
    else if (type.includes('neighborhood') || addrType === 'neighborhood') zoom = 15;
    else if (type.includes('university') || type.includes('college')) zoom = 15;

    view.setView([lat, lon], zoom);
    showToast(`Showing ${name}`, '#1f2a37');
  } catch(e) {
    console.error('Geocode error', e);
    showToast('Search failed. Check your connection.', '#c0392b');
  }
}

// ─────────────────────────────────────────────
//  SYSTEM LOG
// ─────────────────────────────────────────────
let logEntries = [];
let errorCount = 0;

function sysLog(level, message, detail) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  logEntries.push({ level, message, detail: detail || '', time });

  if (level === 'error' || level === 'warn') {
    errorCount++;
    const badge = document.getElementById('logCount');
    badge.textContent = errorCount;
    badge.classList.add('visible');
  }

  const body = document.getElementById('logBody');
  const empty = document.getElementById('logEmpty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = `log-entry ${level}`;
  const tagMap = { info: '[INFO]', warn: '[WARN]', error: '[ERROR]', success: '[OK]' };
  el.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-tag">${tagMap[level] || '[LOG]'}</span>
    <span class="log-msg">${message}${detail ? ' — ' + detail : ''}</span>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function toggleLog() {
  const overlay = document.getElementById('logOverlay');
  overlay.classList.toggle('open');
  if (overlay.classList.contains('open')) {
    errorCount = 0;
    document.getElementById('logCount').classList.remove('visible');
  }
}

function clearLog() {
  logEntries = []; errorCount = 0;
  document.getElementById('logCount').classList.remove('visible');
  document.getElementById('logBody').innerHTML = '<div class="log-empty" id="logEmpty">No log entries yet.</div>';
}

function copyLog() {
  const text = logEntries.map(e => `${e.time} [${e.level.toUpperCase()}] ${e.message}${e.detail ? ' — ' + e.detail : ''}`).join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('Log copied to clipboard', '#1f2a37'));
}

const _origError = console.error;
const _origWarn  = console.warn;
console.error = function(...args) {
  sysLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  _origError.apply(console, args);
};
console.warn = function(...args) {
  sysLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  _origWarn.apply(console, args);
};
window.addEventListener('error', e => sysLog('error', e.message, `${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => sysLog('error', 'Unhandled Promise rejection', String(e.reason)));

// ─────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────
let toastTimeout;
function showToast(msg, bg = '#1f2a37') {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  el.style.background = bg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 3200);
}
