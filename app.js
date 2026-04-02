// ========== API CONFIG ==========
const NEKOS_BASE = 'https://nekos.best/api/v2';
const WAIFU_BASE = 'https://api.waifu.pics/sfw';

// Separate PFP and Banner pools for proper combos
const SOURCES = {
  boys: {
    aesthetic: {
      static: { pfp: ['husbando'], banner: ['husbando'] },
      gif: { pfp: ['husbando'], banner: ['husbando'] },
    },
    cute: {
      static: { pfp: ['husbando'], banner: ['husbando'] },
      gif: { pfp: ['husbando'], banner: ['husbando'] },
    },
    cool: {
      static: { pfp: ['husbando'], banner: ['husbando'] },
      gif: { pfp: ['husbando'], banner: ['husbando'] },
    },
    smug: {
      static: { pfp: ['husbando'], banner: ['husbando'] },
      gif: { pfp: ['husbando'], banner: ['husbando'] },
    },
  },
  girls: {
    aesthetic: {
      static: { pfp: ['neko', 'waifu'], banner: ['waifu', 'kitsune'] },
      gif: { pfp: ['smile', 'wink', 'blush'], banner: ['dance', 'happy', 'wave'] },
    },
    cute: {
      static: { pfp: ['neko', 'kitsune'], banner: ['waifu', 'neko'] },
      gif: { pfp: ['blush', 'nya', 'happy'], banner: ['wag', 'smile', 'wave'] },
    },
    cool: {
      static: { pfp: ['waifu'], banner: ['waifu'] },
      gif: { pfp: ['smug', 'spin', 'shrug'], banner: ['dance', 'think'] },
    },
    smug: {
      static: { pfp: ['waifu', 'neko'], banner: ['waifu'] },
      gif: { pfp: ['smug', 'bleh', 'think'], banner: ['smug', 'shrug'] },
    },
  },
  couple: {
    aesthetic: {
      static: { pfp: ['hug', 'cuddle'], banner: ['handhold', 'lappillow'] },
      gif: { pfp: ['hug', 'cuddle'], banner: ['handhold', 'lappillow'] },
    },
    cute: {
      static: { pfp: ['pat', 'cuddle'], banner: ['happy', 'hug'] },
      gif: { pfp: ['pat', 'cuddle'], banner: ['happy', 'hug'] },
    },
    cool: {
      static: { pfp: ['kabedon', 'carry'], banner: ['hug', 'kiss'] },
      gif: { pfp: ['kabedon', 'carry'], banner: ['hug', 'kiss'] },
    },
    smug: {
      static: { pfp: ['blowkiss', 'wink'], banner: ['kiss', 'handhold'] },
      gif: { pfp: ['blowkiss', 'wink'], banner: ['kiss', 'handhold'] },
    },
  },
};

// ========== STATE ==========
let currentGender = 'girls';
let currentStyle = 'aesthetic';
let currentMedia = 'static';
let pfpLocked = false;
let bannerLocked = false;
let currentPfpUrl = '';
let currentBannerUrl = '';
// Image cache to avoid duplicates within same session
let seenUrls = new Set();

// ========== HELPERS ==========
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fetch a single random image from nekos.best
async function fetchNekos(endpoint) {
  try {
    const res = await fetch(`${NEKOS_BASE}/${endpoint}`, {
      headers: { 'User-Agent': 'AnimePFPStudio/1.0' }
    });
    const data = await res.json();
    return data.results[0].url;
  } catch (err) {
    console.error('nekos.best error:', err);
    return null;
  }
}

// Fetch from waifu.pics
async function fetchWaifu(endpoint) {
  try {
    const res = await fetch(`${WAIFU_BASE}/${endpoint}`);
    const data = await res.json();
    return data.url;
  } catch (err) {
    console.error('waifu.pics error:', err);
    return null;
  }
}

// Fetch a single image from the right API based on endpoint
async function fetchImage(endpoint) {
  // waifu.pics endpoints (the ones not in nekos.best)
  const waifuOnly = ['megumin', 'shinobu', 'awoo'];
  if (waifuOnly.includes(endpoint)) {
    return fetchWaifu(endpoint);
  }
  // Try nekos.best first, fallback to waifu.pics
  const url = await fetchNekos(endpoint);
  if (url) return url;
  return fetchWaifu(endpoint === 'husbando' ? 'waifu' : endpoint);
}

// Fetch multiple unique images using nekos.best bulk API
async function fetchBulk(endpoint, count = 12) {
  try {
    const amount = Math.min(count, 20);
    const res = await fetch(`${NEKOS_BASE}/${endpoint}?amount=${amount}`, {
      headers: { 'User-Agent': 'AnimePFPStudio/1.0' }
    });
    const data = await res.json();
    return data.results.map(r => r.url).filter(u => !seenUrls.has(u));
  } catch (err) {
    console.error('Bulk fetch error:', err);
    return [];
  }
}

function getEndpoints(type) {
  const g = SOURCES[currentGender];
  const s = g[currentStyle] || g.aesthetic;
  const m = s[currentMedia] || s.static;
  return m[type] || m.pfp;
}

// ========== IMAGE LOADING ==========
function loadImageWithShimmer(imgEl, shimmerEl, url) {
  if (!url) return;
  imgEl.classList.remove('img-loaded');
  imgEl.classList.add('img-loading');
  if (shimmerEl) shimmerEl.classList.remove('hidden');
  const temp = new Image();
  temp.onload = () => {
    imgEl.src = url;
    imgEl.classList.remove('img-loading');
    imgEl.classList.add('img-loaded');
    if (shimmerEl) shimmerEl.classList.add('hidden');
  };
  temp.onerror = () => {
    if (shimmerEl) shimmerEl.classList.add('hidden');
    imgEl.classList.remove('img-loading');
  };
  temp.src = url;
}

// ========== CORE ==========
async function shufflePfp() {
  if (pfpLocked) return;
  const endpoints = getEndpoints('pfp');
  const endpoint = pickRandom(endpoints);
  const url = await fetchImage(endpoint);
  if (url) {
    currentPfpUrl = url;
    seenUrls.add(url);
    loadImageWithShimmer(document.getElementById('pfp-img'), document.getElementById('pfp-shimmer'), url);
    updateDiscordPreview();
  }
}

async function shuffleBanner() {
  if (bannerLocked) return;
  const endpoints = getEndpoints('banner');
  const endpoint = pickRandom(endpoints);
  const url = await fetchImage(endpoint);
  if (url) {
    currentBannerUrl = url;
    seenUrls.add(url);
    loadImageWithShimmer(document.getElementById('banner-img'), document.getElementById('banner-shimmer'), url);
    updateDiscordPreview();
  }
}

async function shuffleBoth() {
  await Promise.all([shufflePfp(), shuffleBanner()]);
}

function togglePfpLock() {
  pfpLocked = !pfpLocked;
  document.getElementById('pfp-lock-btn').classList.toggle('locked', pfpLocked);
}
function toggleBannerLock() {
  bannerLocked = !bannerLocked;
  document.getElementById('banner-lock-btn').classList.toggle('locked', bannerLocked);
}

function updateDiscordPreview() {
  if (currentPfpUrl) document.getElementById('dc-pfp-img').src = currentPfpUrl;
  if (currentBannerUrl) document.getElementById('dc-banner-img').src = currentBannerUrl;
}

// ========== MODE SWITCHING ==========
function setGender(g) {
  currentGender = g;
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-gender="${g}"]`).classList.add('active');
  const note = document.getElementById('boys-note');
  if (note) note.style.display = g === 'boys' ? 'block' : 'none';
  seenUrls.clear();
  shuffleBoth();
  loadGallery();
}

function setStyle(s) {
  currentStyle = s;
  document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-style="${s}"]`).classList.add('active');
  seenUrls.clear();
  shuffleBoth();
  loadGallery();
}

function setMedia(m) {
  currentMedia = m;
  document.querySelectorAll('.media-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-media="${m}"]`).classList.add('active');
  seenUrls.clear();
  shuffleBoth();
  loadGallery();
}

// ========== GALLERY ==========
async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = '<div class="shimmer"></div>';
    grid.appendChild(item);
  }

  // Get all unique endpoints for current mode
  const pfpEndpoints = getEndpoints('pfp');
  const bannerEndpoints = getEndpoints('banner');
  const allEndpoints = [...new Set([...pfpEndpoints, ...bannerEndpoints])];

  // Bulk fetch from each endpoint for max variety
  const allUrls = [];
  const perEndpoint = Math.ceil(14 / allEndpoints.length);
  const fetches = allEndpoints.map(ep => fetchBulk(ep, perEndpoint));
  const results = await Promise.allSettled(fetches);
  results.forEach(r => {
    if (r.status === 'fulfilled') allUrls.push(...r.value);
  });

  // Shuffle and take 12
  const shuffled = allUrls.sort(() => Math.random() - 0.5).slice(0, 12);

  grid.innerHTML = '';
  if (shuffled.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px">Loading failed. Try refreshing.</p>';
    return;
  }
  shuffled.forEach(url => {
    seenUrls.add(url);
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      <img src="${url}" alt="Anime artwork" loading="lazy" />
      <div class="gallery-item-overlay">
        <div class="gallery-use-btns">
          <button class="gallery-use-btn pfp-btn" onclick="useAsPfp('${url}')">Use as PFP</button>
          <button class="gallery-use-btn banner-btn" onclick="useAsBanner('${url}')">Banner</button>
        </div>
      </div>
    `;
    grid.appendChild(item);
  });
}

function useAsPfp(url) {
  currentPfpUrl = url;
  loadImageWithShimmer(document.getElementById('pfp-img'), document.getElementById('pfp-shimmer'), url);
  updateDiscordPreview();
  document.getElementById('generator').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function useAsBanner(url) {
  currentBannerUrl = url;
  loadImageWithShimmer(document.getElementById('banner-img'), document.getElementById('banner-shimmer'), url);
  updateDiscordPreview();
  document.getElementById('generator').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ========== SEARCH ==========
async function searchAnime() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  const grid = document.getElementById('search-results');
  const section = document.getElementById('search-section');
  section.style.display = 'block';
  grid.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = '<div class="shimmer"></div>';
    grid.appendChild(item);
  }
  const urls = [];
  try {
    const [imgRes, gifRes] = await Promise.allSettled([
      fetch(`${NEKOS_BASE}/search?query=${encodeURIComponent(query)}&type=1&amount=10`, {
        headers: { 'User-Agent': 'AnimePFPStudio/1.0' }
      }).then(r => r.json()),
      fetch(`${NEKOS_BASE}/search?query=${encodeURIComponent(query)}&type=2&amount=10`, {
        headers: { 'User-Agent': 'AnimePFPStudio/1.0' }
      }).then(r => r.json()),
    ]);
    if (imgRes.status === 'fulfilled' && imgRes.value.results)
      imgRes.value.results.forEach(r => urls.push(r.url));
    if (gifRes.status === 'fulfilled' && gifRes.value.results)
      gifRes.value.results.forEach(r => urls.push(r.url));
  } catch (err) { console.error('Search error:', err); }
  grid.innerHTML = '';
  if (urls.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px">No results found. Try a different anime or artist name.</p>';
    return;
  }
  urls.forEach(url => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      <img src="${url}" alt="Search result" loading="lazy" />
      <div class="gallery-item-overlay">
        <div class="gallery-use-btns">
          <button class="gallery-use-btn pfp-btn" onclick="useAsPfp('${url}')">Use as PFP</button>
          <button class="gallery-use-btn banner-btn" onclick="useAsBanner('${url}')">Banner</button>
        </div>
      </div>
    `;
    grid.appendChild(item);
  });
}

function handleSearchKey(e) { if (e.key === 'Enter') searchAnime(); }

// ========== BANNER EDITOR ==========
function syncEditorBanner() {
  const edImg = document.getElementById('editor-banner-img');
  if (currentBannerUrl && edImg.src !== currentBannerUrl) {
    edImg.src = currentBannerUrl;
  }
}

function handleBannerUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    currentBannerUrl = dataUrl;
    document.getElementById('editor-banner-img').src = dataUrl;
    document.getElementById('banner-img').src = dataUrl;
    updateDiscordPreview();
  };
  reader.readAsDataURL(file);
}

// Called after banner changes
const origUpdateDiscord = updateDiscordPreview;
updateDiscordPreview = function() {
  origUpdateDiscord();
  syncEditorBanner();
};

function updateEditorFilters() {
  const b = document.getElementById('ed-brightness').value;
  const c = document.getElementById('ed-contrast').value;
  const s = document.getElementById('ed-saturate').value;
  const bl = document.getElementById('ed-blur').value;
  const tintColor = document.getElementById('ed-tint-color').value;
  const tintOp = document.getElementById('ed-tint-opacity').value;

  const img = document.getElementById('editor-banner-img');
  img.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${bl}px)`;

  const tint = document.getElementById('editor-tint');
  tint.style.background = tintColor;
  tint.style.opacity = tintOp / 100;
}

function updateEditorText() {
  const text = document.getElementById('ed-text').value;
  const color = document.getElementById('ed-text-color').value;
  const size = document.getElementById('ed-text-size').value;
  const glow = document.getElementById('ed-text-glow').value;
  const font = document.getElementById('ed-text-font').value;
  const spacing = document.getElementById('ed-text-spacing').value;
  const outline = document.getElementById('ed-text-outline').checked;

  const overlay = document.getElementById('editor-text-overlay');
  overlay.textContent = text;
  overlay.style.color = outline ? 'transparent' : color;
  overlay.style.fontSize = size + 'px';
  overlay.style.fontFamily = `'${font}', sans-serif`;
  overlay.style.letterSpacing = spacing + 'px';
  overlay.style.textShadow = glow === 'none' ? 'none' : glow;
  overlay.style.webkitTextStroke = outline ? `2px ${color}` : 'none';
}

function resetEditor() {
  document.getElementById('ed-brightness').value = 100;
  document.getElementById('ed-contrast').value = 100;
  document.getElementById('ed-saturate').value = 100;
  document.getElementById('ed-blur').value = 0;
  document.getElementById('ed-tint-opacity').value = 0;
  document.getElementById('ed-tint-color').value = '#7C3AED';
  document.getElementById('ed-text').value = '';
  document.getElementById('ed-text-color').value = '#ffffff';
  document.getElementById('ed-text-size').value = 28;
  document.getElementById('ed-text-glow').value = 'none';
  document.getElementById('ed-text-font').value = 'Fredoka';
  document.getElementById('ed-text-spacing').value = 0;
  document.getElementById('ed-text-outline').checked = false;
  document.getElementById('ed-text-anim').value = 'none';
  document.getElementById('ed-bg-effect').value = 'none';
  updateEditorFilters();
  updateEditorText();
  setTextAnimation();
  setBgEffect();
}

function addSymbol(sym) {
  const input = document.getElementById('ed-text');
  input.value += sym;
  updateEditorText();
}

// ========== TEXT ANIMATION ==========
function setTextAnimation() {
  const overlay = document.getElementById('editor-text-overlay');
  overlay.className = 'editor-text-overlay';
  const anim = document.getElementById('ed-text-anim').value;
  if (anim !== 'none') overlay.classList.add(`text-anim-${anim}`);
}

// ========== BACKGROUND EFFECTS ==========
let bgEffectId = null;
let bgParticles = [];

function setBgEffect() {
  if (bgEffectId) { cancelAnimationFrame(bgEffectId); bgEffectId = null; }
  const canvas = document.getElementById('editor-fx-canvas');
  const ctx = canvas.getContext('2d');
  const effect = document.getElementById('ed-bg-effect').value;

  // Size canvas to match preview
  const preview = document.getElementById('editor-preview');
  canvas.width = preview.offsetWidth;
  canvas.height = preview.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (effect === 'none') return;
  bgParticles = [];
  const W = canvas.width, H = canvas.height;

  if (effect === 'particles') {
    for (let i = 0; i < 40; i++) bgParticles.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*3+1, vx: (Math.random()-0.5)*0.8, vy: -Math.random()*1-0.3, a: Math.random() });
  } else if (effect === 'rain') {
    for (let i = 0; i < 60; i++) bgParticles.push({ x: Math.random()*W, y: Math.random()*H, speed: Math.random()*4+2, len: Math.random()*15+5, char: String.fromCharCode(0x30A0 + Math.random()*96) });
  } else if (effect === 'sparkle') {
    for (let i = 0; i < 25; i++) bgParticles.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*3+1, phase: Math.random()*Math.PI*2 });
  } else if (effect === 'gradient') {
    bgParticles = [{ offset: 0 }];
  } else if (effect === 'smoke') {
    for (let i = 0; i < 15; i++) bgParticles.push({ x: Math.random()*W, y: H+Math.random()*20, r: Math.random()*30+20, vx: (Math.random()-0.5)*0.5, vy: -Math.random()*0.8-0.3, a: Math.random()*0.3 });
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    if (effect === 'particles') {
      bgParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.a += 0.02;
        if (p.y < -5) { p.y = H+5; p.x = Math.random()*W; }
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(124,58,237,${0.3+Math.sin(p.a)*0.3})`;
        ctx.fill();
      });
    } else if (effect === 'rain') {
      ctx.font = '12px monospace';
      bgParticles.forEach(p => {
        p.y += p.speed;
        if (p.y > H) { p.y = -p.len; p.x = Math.random()*W; p.char = String.fromCharCode(0x30A0 + Math.random()*96); }
        ctx.fillStyle = `rgba(0,255,70,${0.6})`;
        ctx.fillText(p.char, p.x, p.y);
      });
    } else if (effect === 'sparkle') {
      bgParticles.forEach(p => {
        p.phase += 0.05;
        const a = Math.abs(Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * a, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${a*0.8})`;
        ctx.fill();
        if (a < 0.05) { p.x = Math.random()*W; p.y = Math.random()*H; }
      });
    } else if (effect === 'gradient') {
      bgParticles[0].offset = (bgParticles[0].offset + 0.005) % 1;
      const o = bgParticles[0].offset;
      const grad = ctx.createLinearGradient(W*o-W*0.3, 0, W*o+W*0.3, H);
      grad.addColorStop(0, 'rgba(124,58,237,0)');
      grad.addColorStop(0.5, 'rgba(124,58,237,0.25)');
      grad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (effect === 'smoke') {
      bgParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += 0.1;
        if (p.y < -p.r) { p.y = H+20; p.x = Math.random()*W; p.r = Math.random()*30+20; p.a = Math.random()*0.3; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(200,200,200,${p.a * 0.5})`;
        ctx.fill();
      });
    }
    bgEffectId = requestAnimationFrame(animate);
  }
  animate();
}

// ========== GIF EXPORT ==========
function exportGif() {
  const btn = document.getElementById('gif-export-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Rendering...';

  const W = 600, H = 240;
  const totalFrames = 30;
  const delay = 80; // ms per frame

  // Load banner image
  const bannerImg = new Image();
  bannerImg.crossOrigin = 'anonymous';
  bannerImg.onload = () => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: W,
      height: H,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Read all editor settings
    const b = document.getElementById('ed-brightness').value;
    const c = document.getElementById('ed-contrast').value;
    const s = document.getElementById('ed-saturate').value;
    const bl = document.getElementById('ed-blur').value;
    const tintColor = document.getElementById('ed-tint-color').value;
    const tintOp = document.getElementById('ed-tint-opacity').value / 100;
    const text = document.getElementById('ed-text').value;
    const textColor = document.getElementById('ed-text-color').value;
    const textSize = parseInt(document.getElementById('ed-text-size').value);
    const textFont = document.getElementById('ed-text-font').value;
    const textSpacing = parseInt(document.getElementById('ed-text-spacing').value);
    const textOutline = document.getElementById('ed-text-outline').checked;
    const textGlow = document.getElementById('ed-text-glow').value;
    const textAnim = document.getElementById('ed-text-anim').value;
    const bgEffect = document.getElementById('ed-bg-effect').value;

    // Init particles for GIF
    const gfxParts = [];
    if (bgEffect === 'particles') {
      for (let i = 0; i < 30; i++) gfxParts.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*3+1, vx: (Math.random()-0.5)*1, vy: -Math.random()*1.5-0.5, a: Math.random() });
    } else if (bgEffect === 'rain') {
      for (let i = 0; i < 40; i++) gfxParts.push({ x: Math.random()*W, y: Math.random()*H, speed: Math.random()*6+3, char: String.fromCharCode(0x30A0 + Math.random()*96) });
    } else if (bgEffect === 'sparkle') {
      for (let i = 0; i < 20; i++) gfxParts.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*3+1, phase: Math.random()*Math.PI*2 });
    }

    for (let f = 0; f < totalFrames; f++) {
      const t = f / totalFrames;

      // Draw banner with filters
      ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${bl}px)`;
      const iw = bannerImg.width, ih = bannerImg.height;
      const scale = Math.max(W / iw, H / ih);
      ctx.drawImage(bannerImg, (W - iw*scale)/2, (H - ih*scale)/2, iw*scale, ih*scale);
      ctx.filter = 'none';

      // Tint
      if (tintOp > 0) {
        ctx.globalAlpha = tintOp;
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Background effect
      if (bgEffect === 'particles') {
        gfxParts.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.a += 0.1;
          if (p.y < -5) { p.y = H+5; p.x = Math.random()*W; }
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          ctx.fillStyle = `rgba(124,58,237,${0.3+Math.sin(p.a)*0.3})`;
          ctx.fill();
        });
      } else if (bgEffect === 'rain') {
        ctx.font = '12px monospace';
        gfxParts.forEach(p => {
          p.y += p.speed; if (p.y > H) { p.y = -10; p.x = Math.random()*W; }
          ctx.fillStyle = 'rgba(0,255,70,0.6)';
          ctx.fillText(p.char, p.x, p.y);
        });
      } else if (bgEffect === 'sparkle') {
        gfxParts.forEach(p => {
          p.phase += 0.2;
          const a = Math.abs(Math.sin(p.phase));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r*a, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,255,255,${a*0.8})`; ctx.fill();
        });
      } else if (bgEffect === 'gradient') {
        const o = t;
        const grad = ctx.createLinearGradient(W*o-W*0.3, 0, W*o+W*0.3, H);
        grad.addColorStop(0, 'rgba(124,58,237,0)');
        grad.addColorStop(0.5, 'rgba(124,58,237,0.25)');
        grad.addColorStop(1, 'rgba(124,58,237,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      } else if (bgEffect === 'smoke') {
        for (let i = 0; i < 8; i++) {
          const sx = W*0.15 + i*W*0.1;
          const sy = H - 20 + Math.sin(t*Math.PI*2 + i)*10;
          const sr = 25 + Math.sin(t*Math.PI*2 + i*0.5)*10;
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(200,200,200,0.12)'; ctx.fill();
        }
      }

      // Text with animation transform
      if (text) {
        ctx.save();
        ctx.font = `bold ${textSize}px ${textFont}, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        // Apply animation transforms
        let tx = W/2, ty = H/2, sc = 1, rot = 0, alpha = 1;
        if (textAnim === 'pulse') { sc = 1 + 0.15*Math.sin(t*Math.PI*2); alpha = 0.8 + 0.2*Math.cos(t*Math.PI*2); }
        else if (textAnim === 'bounce') { ty = H/2 - 12*Math.abs(Math.sin(t*Math.PI*2)); }
        else if (textAnim === 'flicker') { alpha = (Math.sin(t*20) > 0.3) ? 1 : 0.3; }
        else if (textAnim === 'wave') { rot = Math.sin(t*Math.PI*2)*0.05; sc = 1 + 0.1*Math.sin(t*Math.PI*2); }

        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        ctx.globalAlpha = alpha;

        if (textGlow !== 'none') {
          const glowColor = textGlow.match(/#[0-9A-Fa-f]+/)?.[0] || '#fff';
          ctx.shadowColor = glowColor; ctx.shadowBlur = 20;
        }

        if (textSpacing > 0) {
          const chars = [...text];
          let totalW = 0;
          chars.forEach(ch => totalW += ctx.measureText(ch).width + textSpacing);
          totalW -= textSpacing;
          let x = -totalW/2;
          chars.forEach(ch => {
            const cw = ctx.measureText(ch).width;
            if (textOutline) { ctx.strokeStyle = textColor; ctx.lineWidth = 2; ctx.strokeText(ch, x+cw/2, 0); }
            else { ctx.fillStyle = textColor; ctx.fillText(ch, x+cw/2, 0); }
            x += cw + textSpacing;
          });
        } else {
          if (textOutline) { ctx.strokeStyle = textColor; ctx.lineWidth = 2; ctx.strokeText(text, 0, 0); }
          else { ctx.fillStyle = textColor; ctx.fillText(text, 0, 0); }
        }
        ctx.restore();
      }

      gif.addFrame(ctx, { copy: true, delay: delay });
    }

    gif.on('finished', blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'animated-banner.gif';
      a.click();
      URL.revokeObjectURL(a.href);
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg> Export GIF`;
    });

    gif.render();
  };
  bannerImg.onerror = () => {
    btn.disabled = false;
    btn.innerHTML = `Export GIF`;
    alert('Cannot export: image blocked by CORS. Try uploading a local image first.');
  };
  bannerImg.src = currentBannerUrl;
}

function downloadEditedBanner() {
  const img = document.getElementById('editor-banner-img');
  if (!img.src || !currentBannerUrl) return;

  const canvas = document.createElement('canvas');
  const W = 600, H = 240;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Draw image with filters
  const b = document.getElementById('ed-brightness').value;
  const c = document.getElementById('ed-contrast').value;
  const s = document.getElementById('ed-saturate').value;
  const bl = document.getElementById('ed-blur').value;
  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${bl}px)`;

  const tempImg = new Image();
  tempImg.crossOrigin = 'anonymous';
  tempImg.onload = () => {
    // Cover fit
    const iw = tempImg.width, ih = tempImg.height;
    const scale = Math.max(W / iw, H / ih);
    const sw = iw * scale, sh = ih * scale;
    ctx.drawImage(tempImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
    ctx.filter = 'none';

    // Tint
    const tintOp = document.getElementById('ed-tint-opacity').value / 100;
    if (tintOp > 0) {
      ctx.globalAlpha = tintOp;
      ctx.fillStyle = document.getElementById('ed-tint-color').value;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Text
    const text = document.getElementById('ed-text').value;
    if (text) {
      const size = parseInt(document.getElementById('ed-text-size').value);
      const color = document.getElementById('ed-text-color').value;
      const glow = document.getElementById('ed-text-glow').value;
      const font = document.getElementById('ed-text-font').value;
      const spacing = parseInt(document.getElementById('ed-text-spacing').value);
      const outline = document.getElementById('ed-text-outline').checked;

      ctx.font = `bold ${size}px ${font}, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (glow !== 'none') {
        const glowColor = glow.match(/#[0-9A-Fa-f]+/)?.[0] || '#fff';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
      }

      // Draw with letter spacing
      if (spacing > 0) {
        const chars = [...text];
        let totalW = 0;
        chars.forEach(ch => totalW += ctx.measureText(ch).width + spacing);
        totalW -= spacing;
        let x = (W - totalW) / 2;
        chars.forEach(ch => {
          const cw = ctx.measureText(ch).width;
          if (outline) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeText(ch, x + cw / 2, H / 2);
          } else {
            ctx.fillStyle = color;
            ctx.fillText(ch, x + cw / 2, H / 2);
          }
          x += cw + spacing;
        });
      } else {
        if (outline) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeText(text, W / 2, H / 2);
        } else {
          ctx.fillStyle = color;
          ctx.fillText(text, W / 2, H / 2);
        }
      }
      ctx.shadowBlur = 0;
    }

    // Download
    canvas.toBlob(blob => {
      if (!blob) { window.open(currentBannerUrl, '_blank'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'edited-banner.png';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };
  tempImg.onerror = () => window.open(currentBannerUrl, '_blank');
  tempImg.src = currentBannerUrl;
}

// ========== NAME GENERATORS ==========
const ANIME_FIRST = [
  'Akira','Haruka','Yuki','Ren','Sora','Kaito','Hana','Riku','Mei','Shin',
  'Aoi','Takumi','Sakura','Izumi','Ryuu','Kira','Nao','Hinata','Asuka','Zen',
  'Kazuki','Miku','Hikari','Daichi','Yui','Kenji','Amaya','Tsubasa','Kohaku','Rei',
  'Shinji','Mikasa','Levi','Eren','Gojo','Itachi','Kakashi','Sasuke','Naruto','Nezuko',
  'Tanjiro','Zenitsu','Gon','Killua','Kurapika','Todoroki','Deku','Bakugo','Zoro','Luffy',
  'Raiden','Ayaka','Xiao','Hu Tao','Keqing','Zhongli','Venti','Ganyu','Ei','Tartaglia'
];
const ANIME_LAST = [
  'Takahashi','Yamamoto','Nakamura','Suzuki','Watanabe','Tanaka','Fujimoto','Hayashi',
  'Ito','Kobayashi','Sasaki','Shimizu','Arakawa','Kurosawa','Minamoto','Uchiha',
  'Kamado','Uzumaki','Hatake','Midoriya','Todoroki','Ackerman','Yeager','Zoldyck',
  'Freecss','Gojo','Sukuna','Ryomen','Kamisato','Kaedehara','Raiden','Sangonomiya'
];
const ANIME_TITLES = [
  'the Shadow','of the Mist','the Crimson','the Silent','of Moonlight',
  'the Wanderer','the Blade','of Starlight','the Phantom','the Eternal',
  'the Thunder','of Ashes','the Void','the Divine','of Chaos'
];
const NAME_MEANINGS = [
  'Bright spirit','Silent warrior','Moonlit wanderer','Crimson flame','Shadow dancer',
  'Storm bringer','Star guardian','Eternal bloom','Thunder blade','Void walker',
  'Celestial heir','Frozen heart','Sacred protector','Wild tempest','Dream weaver'
];

const DISCORD_PREFIX = [
  'Dark','Shadow','Neon','Void','Phantom','Crimson','Astral','Cyber','Toxic',
  'Lunar','Solar','Frost','Storm','Silent','Mystic','Chaos','Ghost','Demon',
  'Angel','Cosmic','Pixel','Glitch','Hyper','Ultra','Zero','Nova','Echo','Apex'
];
const DISCORD_CORE = [
  'Wolf','Blade','Soul','Reaper','Knight','Sage','Ninja','Ronin','Samurai','Ace',
  'Vibe','King','Queen','Lord','Fury','Fang','Claw','Strike','Edge','Flame',
  'Weeb','Otaku','Senpai','Waifu','Neko','Kitsune','Shinobi','Sensei','Oni','Ryuu'
];
const DISCORD_SUFFIX = [
  'X','_','xx','69','420','777','999','001','kun','san','chan','sama',
  'YT','TTV','_v2','HD','PRO','GOD','OP','GG','uwu','xo','jp','ZZ'
];
const DISCORD_STYLES = [
  'Edgy','Aesthetic','Weeb','Clean','Gaming','Chill','Dark','Kawaii'
];

function generateAnimeName() {
  const first = pickRandom(ANIME_FIRST);
  const last = pickRandom(ANIME_LAST);
  const addTitle = Math.random() > 0.6;
  const title = addTitle ? `, ${pickRandom(ANIME_TITLES)}` : '';
  const name = `${first} ${last}${title}`;
  const meaning = pickRandom(NAME_MEANINGS);
  
  const display = document.getElementById('anime-name-display');
  const sub = document.getElementById('anime-name-meaning');
  display.textContent = name;
  sub.textContent = `"${meaning}"`;
  display.style.animation = 'none';
  display.offsetHeight;
  display.style.animation = 'nameReveal 0.4s ease';
}

function generateDiscordName() {
  const style = Math.floor(Math.random() * 4);
  let name;
  const prefix = pickRandom(DISCORD_PREFIX);
  const core = pickRandom(DISCORD_CORE);
  const suffix = pickRandom(DISCORD_SUFFIX);
  
  switch(style) {
    case 0: name = `${prefix}${core}${suffix}`; break;
    case 1: name = `${prefix}_${core}`; break;
    case 2: name = `x${core}${prefix}x`; break;
    case 3: name = `${core.toLowerCase()}.${prefix.toLowerCase()}`; break;
  }
  
  const styleLabel = pickRandom(DISCORD_STYLES);
  const display = document.getElementById('discord-name-display');
  const sub = document.getElementById('discord-name-style');
  display.textContent = name;
  sub.textContent = `Style: ${styleLabel}`;
  display.style.animation = 'none';
  display.offsetHeight;
  display.style.animation = 'nameReveal 0.4s ease';
}

function copyName(id) {
  const text = document.getElementById(id).textContent;
  if (text === 'Click generate') return;
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById(id);
    const orig = el.textContent;
    el.textContent = 'Copied!';
    setTimeout(() => el.textContent = orig, 1000);
  });
}

// ========== DOWNLOAD ==========
function downloadPfp() { if (currentPfpUrl) window.open(currentPfpUrl, '_blank'); }
function downloadBanner() { if (currentBannerUrl) window.open(currentBannerUrl, '_blank'); }

// ========== SCROLL ANIMATION ==========
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  shuffleBoth();
  loadGallery();
});
