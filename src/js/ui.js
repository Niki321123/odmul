// Tiny DOM helpers: element builder, toasts, bottom sheets, confetti.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // only used with static, trusted markup (SVG mascot)
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const hh = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60);
  return m % 60 ? `${hh} h ${m % 60} min` : `${hh} h`;
}

export function coin(n) {
  return h('span', { class: 'coin-amount' }, h('span', { class: 'coin-ico', 'aria-hidden': 'true' }), String(n));
}

let toastTimer;
export function toast(msg, kind = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = msg;
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2600);
}

// Bottom sheet modal. Returns a close() function.
export function sheet(content, { onClose, dismissable = true } = {}) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'sheet-grip' }), content);
  backdrop.append(panel);
  const close = () => {
    backdrop.classList.add('closing');
    setTimeout(() => backdrop.remove(), 180);
    onClose?.();
  };
  if (dismissable) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  return close;
}

export function confirmSheet(title, text, okLabel = 'OK', cancelLabel = 'Anuluj') {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); close(); } };
    const close = sheet(h('div', { class: 'stack' },
      h('h2', {}, title),
      text ? h('p', { class: 'muted' }, text) : null,
      h('button', { class: 'btn primary', onclick: () => finish(true) }, okLabel),
      h('button', { class: 'btn ghost', onclick: () => finish(false) }, cancelLabel),
    ), { onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}

export function confetti(count = 80) {
  const colors = ['#ff7eb6', '#7ee0a1', '#ffd166', '#8fb3ff', '#c69bff'];
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    layer.append(h('i', {
      style: {
        left: `${Math.random() * 100}%`,
        background: colors[i % colors.length],
        animationDelay: `${Math.random() * 0.4}s`,
        animationDuration: `${1.4 + Math.random() * 1.2}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      },
    }));
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 3000);
}

export function vibrate(pattern = 30) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported on iOS */ }
}

// Downscale a photo File to a small JPEG data URL so it fits in localStorage.
export function shrinkPhoto(file, max = 360) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie udało się wczytać zdjęcia')); };
    img.src = url;
  });
}
