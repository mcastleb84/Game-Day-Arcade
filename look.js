// Game Day Arcade: "Colors and text" for the lobby. Saved on this device only (localStorage "gd.look").
// Background style (the standard paint dashes, solid, checks, stripes, dots, fade, plaid), main and second color,
// button color, 20 text styles, bold, text color, and a photo behind the page.
(()=>{
  const KEY = 'gd.look';
  const hexOk = c => /^#[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).toLowerCase() : '';
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const lum = h => rgb(h).map(v => (v /= 255) <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const readable = (c, bg, min) => { let x = c; const to = lum(bg) > .4 ? '#000000' : '#ffffff'; for (let i = 0; i < 12 && contrast(x, bg) < (min || 4.5); i++) x = mix(x, to, .18); return x; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const FONTS = {
    std: ['Standard', ''],
    playfair: ['Playfair', "'Playfair Display', Georgia, serif", 'Playfair+Display:wght@400;700;900'],
    lora: ['Lora', "'Lora', Georgia, serif", 'Lora:wght@400;700'],
    merri: ['Merriweather', "'Merriweather', Georgia, serif", 'Merriweather:wght@400;900'],
    abril: ['Abril Fatface', "'Abril Fatface', Georgia, serif", 'Abril+Fatface'],
    cinzel: ['Cinzel', "'Cinzel', Georgia, serif", 'Cinzel:wght@400;800'],
    bebas: ['Bebas Neue', "'Bebas Neue', Impact, sans-serif", 'Bebas+Neue'],
    oswald: ['Oswald', "'Oswald', Impact, sans-serif", 'Oswald:wght@400;700'],
    anton: ['Anton', "'Anton', Impact, sans-serif", 'Anton'],
    montserrat: ['Montserrat', "'Montserrat', system-ui, sans-serif", 'Montserrat:wght@400;800'],
    poppins: ['Poppins', "'Poppins', system-ui, sans-serif", 'Poppins:wght@400;800'],
    raleway: ['Raleway', "'Raleway', system-ui, sans-serif", 'Raleway:wght@400;800'],
    josefin: ['Josefin Sans', "'Josefin Sans', system-ui, sans-serif", 'Josefin+Sans:wght@400;700'],
    righteous: ['Righteous', "'Righteous', system-ui, sans-serif", 'Righteous'],
    lobster: ['Lobster', "'Lobster', cursive", 'Lobster'],
    pacifico: ['Pacifico', "'Pacifico', cursive", 'Pacifico'],
    dancing: ['Dancing Script', "'Dancing Script', cursive", 'Dancing+Script:wght@400;700'],
    vibes: ['Great Vibes', "'Great Vibes', cursive", 'Great+Vibes'],
    marker: ['Marker', "'Permanent Marker', cursive", 'Permanent+Marker'],
    typewriter: ['Typewriter', "'Courier Prime', 'Courier New', monospace", 'Courier+Prime:wght@400;700']
  };
  const loaded = new Set();
  const loadFonts = keys => {
    const need = keys.filter(k => FONTS[k] && FONTS[k][2] && !loaded.has(k)); if (!need.length) return;
    need.forEach(k => loaded.add(k));
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + need.map(k => 'family=' + FONTS[k][2]).join('&') + '&display=swap';
    document.head.appendChild(l);
  };

  const PATTERNS = {
    paint: ['Paint dashes', null],
    solid: ['Solid color', () => ['none', 'auto']],
    checks: ['Checks', c => [`conic-gradient(${c} 25%,transparent 0 50%,${c} 0 75%,transparent 0)`, '36px 36px']],
    bigchecks: ['Big checks', c => [`conic-gradient(${c} 25%,transparent 0 50%,${c} 0 75%,transparent 0)`, '96px 96px']],
    stripes: ['Stripes', c => [`repeating-linear-gradient(90deg,${c} 0 18px,transparent 18px 36px)`, 'auto']],
    diagonal: ['Slanted stripes', c => [`repeating-linear-gradient(45deg,${c} 0 14px,transparent 14px 28px)`, 'auto']],
    dots: ['Dots', c => [`radial-gradient(${c} 24%,transparent 26%)`, '30px 30px']],
    fade: ['Fade', c => [`linear-gradient(170deg,transparent 0%,${c} 100%)`, 'auto']],
    plaid: ['Plaid mix', c => { const a = `rgba(${rgb(c).join(',')},.5)`; return [`repeating-linear-gradient(90deg,${a} 0 22px,transparent 22px 44px),repeating-linear-gradient(0deg,${a} 0 22px,transparent 22px 44px)`, 'auto']; }]
  };
  const photoOk = u => /^data:image\/(jpeg|png|webp)[;,][^"'()\s]*$/i.test(u || '') ? u : '';
  const clean = v => {
    v = v && typeof v === 'object' ? v : {}; const o = {};
    if (PATTERNS[v.pattern] && v.pattern !== 'paint') o.pattern = v.pattern;
    ['bg', 'c2', 'accent', 'tcolor'].forEach(k => { if (hexOk(v[k])) o[k] = hexOk(v[k]); });
    if (FONTS[v.font] && v.font !== 'std') o.font = v.font;
    if (v.all === true) o.all = true;
    if (v.tlight === true) o.tlight = true;
    if (photoOk(v.photo)) o.photo = v.photo;
    if (v.fade != null && isFinite(+v.fade)) o.fade = Math.min(85, Math.max(0, +v.fade));
    return o;
  };
  const getLook = () => { try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return {}; } };
  const saveLook = v => { try { const c = clean(v); if (Object.keys(c).length) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); return true; } catch (e) { return false; } };

  let paintLayer = '';
  function render(){
    const L = getLook(), body = document.body; if (!body) return;
    if (!paintLayer) { const bi = getComputedStyle(body).backgroundImage || ''; const m = bi.match(/^url\((?:"[^"]*"|[^)]*)\)/); paintLayer = m ? m[0] : 'none'; }
    const STD = '#0e6466', bg = L.bg || STD, dark = lum(bg) < .4, pat = L.pattern || 'paint';
    const c2 = L.c2 || (dark ? '#f28c28' : '#0e6466');
    let css = '';
    if (L.bg) {
      const panel = dark ? mix(bg, '#000000', .38) : mix(bg, '#ffffff', .55), ink = dark ? '#f3efe4' : '#1d1a14';
      css += `:root{--ink:${bg};--panel:${panel};--panel2:${mix(panel, ink, .08)};--line:${mix(panel, ink, .22)};--chalk:${ink};--muted:${mix(ink, panel, .28)};color-scheme:${dark ? 'dark' : 'light'}}`
        + `.chips{background:${mix(bg, dark ? '#000000' : '#ffffff', .15)}!important}`
        + (dark ? '' : 'header,.ghead{text-shadow:0 1px 4px rgba(255,255,255,.7)!important}');
    }
    const paint = L.c2 ? paintLayer.replace(/(%23|#)[0-9a-f]{6}/gi, '%23' + L.c2.slice(1)) : paintLayer;
    if (pat === 'paint') { if (L.bg || L.c2) css += `body{background:${paint} 0 0/420px 420px,radial-gradient(120% 80% at 50% 0%,${mix(bg, '#ffffff', .1)} 0%,${bg} 45%,${mix(bg, '#000000', .2)} 100%);background-color:${bg}}`; }
    else { const [img, size] = PATTERNS[pat][1](c2); css += `body{background:${bg};background-image:${img};background-size:${size}}`; }
    const busy = (pat !== 'paint' && pat !== 'solid') || !!L.photo;
    if (busy) css += `.ghead,header,.lede,.crumb{text-shadow:0 0 6px ${bg},0 0 14px ${bg},0 0 2px ${bg}!important}`;
    if (L.accent) css += `:root{--gold:${L.accent}}.play,.ptr.ready{color:${lum(L.accent) > .4 ? '#1b1405' : '#ffffff'}!important}`;
    if (L.font) { loadFonts([L.font]); css += `:root{--display:${FONTS[L.font][1]}${L.all ? ';--body:' + FONTS[L.font][1] : ''}}`; }
    if (L.tlight) css += `h1,h2,.side-title,.play{font-weight:400!important;-webkit-text-stroke:0}` + (L.all ? 'body,.nav-item,.chip,.menu-btn,.refresh-btn{font-weight:500!important}' : '');
    if (L.tcolor) {
      const cs = getComputedStyle(document.documentElement), panel = hexOk((cs.getPropertyValue('--panel') || '').trim()) || '#0a3c3e';
      css += `h1,.ghead h2,.side-title{color:${readable(L.tcolor, bg, 3)}}.card h2{color:${readable(L.tcolor, L.bg ? (dark ? mix(bg, '#000000', .38) : mix(bg, '#ffffff', .55)) : panel, 3)}}`;
    }
    let st = document.getElementById('gd-look'); if (!st) { st = document.createElement('style'); st.id = 'gd-look'; document.head.appendChild(st); }
    st.textContent = css;
    let ph = document.getElementById('gd-photo');
    if (L.photo) {
      if (!ph) { ph = document.createElement('div'); ph.id = 'gd-photo'; ph.setAttribute('aria-hidden', 'true'); ph.style.cssText = 'position:fixed;inset:0;z-index:-1;background-position:center;background-size:cover;background-repeat:no-repeat;pointer-events:none'; body.prepend(ph); }
      const a = ((L.fade ?? 45) / 100).toFixed(2), x = rgb(bg).join(',');
      ph.style.backgroundImage = `linear-gradient(rgba(${x},${a}),rgba(${x},${a})),url("${L.photo}")`;
      st.textContent += 'body{background:transparent!important}html{background:' + bg + '}';
    } else if (ph) ph.remove();
  }

  /* ---------- panel ---------- */
  const BG_COLORS = [['', 'Standard teal'], ['#0f1b33', 'Midnight'], ['#173a2b', 'Forest'], ['#1f1f22', 'Charcoal'], ['#5e1527', 'Maroon'], ['#2b1a4a', 'Royal'], ['#3b2417', 'Espresso'], ['#f4efe8', 'Light'], ['#ff8243', 'Orange'], ['#111111', 'Black']];
  const C2_COLORS = [['', 'Standard'], ['#ffffff', 'White'], ['#111111', 'Black'], ['#f28c28', 'Orange'], ['#f2b33d', 'Gold'], ['#40c4b8', 'Teal'], ['#c4222b', 'Red'], ['#1c3d7a', 'Blue'], ['#f2a7b8', 'Pink'], ['#2f6b3a', 'Green']];
  const BTN_COLORS = [['', 'Standard gold'], ['#f28c28', 'Orange'], ['#40c4b8', 'Teal'], ['#c4222b', 'Red'], ['#5aa8ff', 'Blue'], ['#7bd389', 'Green'], ['#f2a7b8', 'Pink'], ['#ffffff', 'White'], ['#b48cff', 'Purple']];
  const TEXT_COLORS = [['', 'Standard'], ['#ffffff', 'White'], ['#111111', 'Black'], ['#f2b33d', 'Gold'], ['#f28c28', 'Orange'], ['#40c4b8', 'Teal'], ['#c4222b', 'Red'], ['#5aa8ff', 'Blue'], ['#f2a7b8', 'Pink'], ['#7bd389', 'Green']];
  const row = (key, label, list, cur) => `<div class="lk-sec" data-k="${key}"><p class="lk-h">${label}</p><div class="lk-sw" role="group" aria-label="${esc(label)}">${list.map(([c, n]) =>
    `<button type="button" class="lk-dot" data-v="${c}" aria-label="${esc(n)}" aria-pressed="${(cur || '') === c}" style="background:${c || 'conic-gradient(#0e6466 0 50%,#f2b33d 0)'}"></button>`).join('')
    }<label class="lk-dot lk-any"${cur && !list.some(([c]) => c === cur) ? ` data-on="1" style="background:${cur}"` : ''} title="Pick any color"><input type="color" value="${cur || '#ffffff'}" aria-label="Pick any color for ${esc(label)}"></label></div></div>`;

  const css = `
.lk-open{margin-left:0;font-family:var(--body);font-size:16px;font-weight:700;letter-spacing:.06em;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:6px;cursor:pointer;background:var(--panel);color:var(--chalk);border:1px solid var(--line);touch-action:manipulation}
.lk-open svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.lk-open:hover{border-color:var(--gold)}.lk-open:focus-visible,.lk-panel button:focus-visible,.lk-panel input:focus-visible{outline:3px solid #5aa8ff;outline-offset:2px}
.nav-look{display:grid;grid-template-columns:26px 1fr;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 12px;border-radius:8px;background:transparent;border:1px solid var(--line);color:var(--chalk);font-family:var(--body);font-size:19px;font-weight:600;cursor:pointer;margin-top:6px}
.nav-look svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;color:var(--gold)}
.lk-scrim{position:fixed;inset:0;z-index:70;background:rgba(5,9,7,.6)}
.lk-panel{position:fixed;inset:0 0 0 auto;z-index:71;width:min(380px,92vw);background:var(--panel);color:var(--chalk);border-left:1px solid var(--line);overflow-y:auto;
  padding:max(16px,env(safe-area-inset-top,0px)) 16px max(20px,env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:14px;font-family:"Barlow Condensed",Arial,sans-serif;font-size:17px}
.lk-panel h2{font-family:"Graduate",Georgia,serif;font-weight:400;font-size:24px;margin:0}
.lk-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.lk-x{background:transparent;border:1px solid var(--line);color:var(--chalk);font-size:24px;width:38px;height:38px;border-radius:6px;cursor:pointer}
.lk-note{margin:0;color:var(--muted);font-size:16px}
.lk-sec{display:flex;flex-direction:column;gap:8px}
.lk-h{margin:0;font-weight:700;font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.lk-sw{display:flex;flex-wrap:wrap;gap:8px}
.lk-dot{width:36px;height:36px;border-radius:50%;border:3px solid var(--panel);box-shadow:0 0 0 1px var(--line);padding:0;flex:none;position:relative;overflow:hidden;cursor:pointer;margin:0}
.lk-dot[aria-pressed="true"],.lk-dot[data-on="1"]{box-shadow:0 0 0 2px var(--chalk)}
.lk-any{background:conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)}
.lk-any input{position:absolute;inset:0;opacity:0;width:100%;height:100%;border:0;padding:0;cursor:pointer}
.lk-chips{display:flex;flex-wrap:wrap;gap:6px}
.lk-chips button{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--panel2);color:var(--chalk);border-radius:999px;padding:7px 12px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit}
.lk-chips button[aria-pressed="true"]{background:var(--chalk);color:var(--panel);border-color:var(--chalk)}
.lk-chips button span{width:20px;height:20px;border-radius:5px;border:1px solid rgba(255,255,255,.25);flex:none}
.lk-check{display:flex;gap:10px;align-items:center;font-size:17px;font-weight:600;cursor:pointer}
.lk-check input{width:20px;height:20px;accent-color:var(--gold)}
.lk-btn{font-family:inherit;font-size:16px;font-weight:700;padding:9px 14px;border-radius:6px;border:1px solid var(--line);background:var(--panel2);color:var(--chalk);cursor:pointer;position:relative;overflow:hidden;align-self:flex-start}
.lk-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
.lk-now{display:flex;gap:10px;align-items:center}.lk-now img{width:56px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
.lk-panel input[type=range]{width:100%;accent-color:var(--gold)}
.lk-err{margin:0;color:#ff9b8a;font-size:15px}.lk-err:empty{display:none}
@media (max-width:520px){.lk-open span{display:none}.lk-open{padding:7px 9px}}`;

  let panel, scrim, opener;
  function draw(){
    const L = getLook(), pat = L.pattern || 'paint', bg = L.bg || '#0e6466', c2 = L.c2 || (lum(bg) < .4 ? '#f28c28' : '#0e6466');
    loadFonts(Object.keys(FONTS));
    panel.querySelector('.lk-body').innerHTML =
      `<div class="lk-sec"><p class="lk-h">Background style</p><div class="lk-chips" data-k="pattern">${Object.keys(PATTERNS).map(k => {
        const look = k === 'paint' ? `background:${bg};background-image:repeating-linear-gradient(120deg,transparent 0 5px,${c2} 5px 7px,transparent 7px 14px)` : (() => { const [i, s] = PATTERNS[k][1](c2); return `background-color:${bg};background-image:${i};background-size:${s === 'auto' ? 'auto' : '10px 10px'}`; })();
        return `<button type="button" data-v="${k}" aria-pressed="${k === pat}"><span aria-hidden="true" style="${look}"></span>${esc(PATTERNS[k][0])}</button>`; }).join('')}</div></div>`
      + row('bg', 'Main color', BG_COLORS, L.bg)
      + (pat !== 'solid' ? row('c2', pat === 'paint' ? 'Paint color' : 'Second color', C2_COLORS, L.c2) : '')
      + row('accent', 'Button color', BTN_COLORS, L.accent)
      + `<div class="lk-sec"><p class="lk-h">Text style</p><div class="lk-chips" data-k="font">${Object.keys(FONTS).map(k => `<button type="button" data-v="${k}" aria-pressed="${(L.font || 'std') === k}"${FONTS[k][1] ? ` style="font-family:${FONTS[k][1]}"` : ''}>${esc(FONTS[k][0])}</button>`).join('')}</div>
        <label class="lk-check"><input type="checkbox" data-k="all"${L.all ? ' checked' : ''}> Use this style for all words, not just titles</label>
        <label class="lk-check"><input type="checkbox" data-k="bold"${L.tlight ? '' : ' checked'}> Bold words</label></div>`
      + row('tcolor', 'Title color', TEXT_COLORS, L.tcolor)
      + `<div class="lk-sec"><p class="lk-h">Photo behind the page</p>
        ${L.photo ? `<div class="lk-now"><img src="${esc(L.photo)}" alt="Your background photo"><button type="button" class="lk-btn" data-act="rm">Remove photo</button></div>` : ''}
        <label class="lk-btn">${L.photo ? 'Pick a different photo' : 'Add a photo'}<input type="file" accept="image/*" data-act="up"></label>
        ${L.photo ? `<label class="lk-h" style="display:flex;justify-content:space-between" for="lk-fade">Color over the photo <span>${L.fade ?? 45}%</span></label><input type="range" id="lk-fade" min="0" max="85" data-k="fade" value="${L.fade ?? 45}"><p class="lk-note">More color makes words easier to read.</p>` : ''}
        <p class="lk-err" role="alert"></p></div>
      <button type="button" class="lk-btn" data-act="reset">Back to the standard look</button>`;
  }
  function set(patch){
    const v = Object.assign(getLook(), patch);
    Object.keys(patch).forEach(k => { if (patch[k] === '' || patch[k] === false) delete v[k]; });
    const ok = saveLook(v); render(); return ok;
  }
  function open(){
    opener = document.activeElement; draw();
    scrim.hidden = false; panel.hidden = false; document.body.style.overflow = 'hidden';
    panel.querySelector('.lk-x').focus();
  }
  function close(){
    if (panel.hidden) return;
    scrim.hidden = true; panel.hidden = true; document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  }
  function shrink(file){
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .68)); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('read')); };
      img.src = url;
    });
  }
  function setup(){
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7" r="1.1"/><circle cx="14.5" cy="7" r="1.1"/></svg>';
    const refresh = document.getElementById('refreshBtn');
    if (refresh) { const b = document.createElement('button'); b.type = 'button'; b.className = 'lk-open'; b.id = 'lookBtn'; b.setAttribute('aria-label', 'Colors and text'); b.innerHTML = ICON + '<span>COLORS</span>'; refresh.after(b); b.addEventListener('click', open); }
    const nav = document.querySelector('.side .nav');
    if (nav) { const b = document.createElement('button'); b.type = 'button'; b.className = 'nav-look'; b.innerHTML = ICON + '<span>Colors and text</span>'; nav.after(b); b.addEventListener('click', () => { const sc = document.getElementById('sideClose'); if (sc && document.getElementById('side').classList.contains('open')) sc.click(); open(); }); }
    scrim = document.createElement('div'); scrim.className = 'lk-scrim'; scrim.hidden = true;
    panel = document.createElement('aside'); panel.className = 'lk-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'lk-title');
    panel.innerHTML = '<div class="lk-top"><h2 id="lk-title">Colors and text</h2><button type="button" class="lk-x" aria-label="Close colors and text">×</button></div><p class="lk-note">Make the arcade look the way you like. This only changes it on this phone or computer.</p><div class="lk-body" style="display:flex;flex-direction:column;gap:16px"></div>';
    document.body.append(scrim, panel);
    scrim.addEventListener('click', close);
    panel.querySelector('.lk-x').addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    panel.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'rm') { set({ photo: '' }); draw(); return; }
      if (b.dataset.act === 'reset') { saveLook({}); render(); draw(); return; }
      const grp = b.closest('[data-k]'); if (!grp) return; const k = grp.dataset.k, v = b.dataset.v;
      if (k === 'pattern') set({ pattern: v === 'paint' ? '' : v });
      else if (k === 'font') set({ font: v === 'std' ? '' : v });
      else if (b.classList.contains('lk-dot')) set({ [k]: v });
      else return;
      draw(); const again = panel.querySelector(`[data-k="${k}"] [data-v="${v}"]`); if (again) again.focus();
    });
    panel.addEventListener('input', e => {
      const t = e.target;
      if (t.type === 'color') { const sec = t.closest('[data-k]'), c = hexOk(t.value); if (!c) return; const l = t.closest('label'); l.dataset.on = '1'; l.style.background = c; sec.querySelectorAll('.lk-dot[data-v]').forEach(d => d.setAttribute('aria-pressed', 'false')); set({ [sec.dataset.k]: c }); return; }
      if (t.dataset.k === 'fade') { set({ fade: +t.value }); const s = t.previousElementSibling && t.previousElementSibling.querySelector('span'); if (s) s.textContent = t.value + '%'; }
    });
    panel.addEventListener('change', async e => {
      const t = e.target;
      if (t.dataset.k === 'all') return set({ all: t.checked });
      if (t.dataset.k === 'bold') return set({ tlight: !t.checked });
      if (t.type === 'color') return draw();
      if (t.dataset.act === 'up') {
        const f = t.files[0]; t.value = ''; if (!f) return;
        const m = panel.querySelector('.lk-err');
        if (!/^image\//.test(f.type)) { m.textContent = 'Pick a photo.'; return; }
        try { const url = await shrink(f); if (!set({ photo: url, fade: getLook().fade ?? 45 })) { m.textContent = 'That photo is too big to save on this device. Try a smaller one.'; return; } draw(); }
        catch (err) { m.textContent = "That photo didn't open. Try another one."; }
      }
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
