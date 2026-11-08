// App shell: state, hash router, tab bar, global session/lock-in watchdog.
import * as S from './store.js';
import { h, clear, toast, fmtClock, coin } from './ui.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderHome } from './views/home.js';
import { renderHabits, renderHabitRun } from './views/habits.js';
import { renderFocus } from './views/focus.js';
import { renderApps, renderGate } from './views/apps.js';
import { renderSetup } from './views/setup.js';
import { renderStats } from './views/stats.js';
import { renderSettings } from './views/settings.js';

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const state = S.load(storage);
const root = document.getElementById('app');
let cleanups = [];

const ROUTES = {
  '': renderHome,
  habits: renderHabits,
  habit: renderHabitRun,
  focus: renderFocus,
  apps: renderApps,
  gate: renderGate,
  setup: renderSetup,
  stats: renderStats,
  settings: renderSettings,
  onboarding: renderOnboarding,
};

const TABS = [
  { route: '', label: 'Start', icon: '🏠' },
  { route: 'habits', label: 'Nawyki', icon: '✅' },
  { route: 'focus', label: 'Skupienie', icon: '🎯' },
  { route: 'apps', label: 'Aplikacje', icon: '🔒' },
  { route: 'stats', label: 'Statystyki', icon: '📊' },
];

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', params: parts.slice(1) };
}

export function go(path) {
  location.hash = `#/${path}`;
}

function commit({ rerender = true } = {}) {
  S.save(storage, state);
  if (rerender) render();
}

function housekeeping() {
  const now = Date.now();
  S.tickEnergy(state, now);
  S.refreshStreak(state, now);
  S.ensureQuests(state, now);
  const applied = S.applyPending(state, now);
  if (applied) toast(`Zastosowano ${applied} oczekującą zmianę ustawień`);
  S.save(storage, state);
}

function render() {
  cleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  cleanups = [];
  let { name, params } = parseRoute();
  if (!state.onboarded && name !== 'onboarding') name = 'onboarding';
  const view = ROUTES[name] || renderHome;
  const ctx = { state, commit, go, params, onCleanup: (fn) => cleanups.push(fn), S };
  const full = name === 'onboarding' || name === 'gate';
  clear(root);
  root.className = full ? 'full' : '';
  if (!full) root.append(header(name));
  if (!full && state.active && name !== 'habit' && name !== 'focus') root.append(activeBanner(ctx));
  const main = h('main', { class: 'view' });
  root.append(main);
  main.append(view(ctx));
  if (!full) root.append(tabBar(name));
  window.scrollTo(0, 0);
}

function header(name) {
  const t = S.levelProgress(state.xp);
  return h('header', { class: 'topbar' },
    h('button', { class: 'chip', onclick: () => go('stats'), 'aria-label': 'Seria dni' }, '🔥 ', String(state.streak.current)),
    h('button', { class: 'chip', onclick: () => go('apps'), 'aria-label': 'Monety' },
      state.settings.mode === 'battery' ? `🔋 ${S.batteryLeft(state)} min` : coin(state.coins)),
    h('span', { class: 'chip soft' }, `Poz. ${t.level}`),
    h('button', { class: 'icon-btn', onclick: () => go('settings'), 'aria-label': 'Ustawienia', 'aria-current': name === 'settings' ? 'page' : null }, '⚙️'),
  );
}

function activeBanner(ctx) {
  const a = state.active;
  const label = h('span', {}, '');
  const update = () => {
    const left = a.startedAt + a.minutes * 60e3 - Date.now();
    label.textContent = left > 0 ? `${a.title} · ${fmtClock(left)}` : `${a.title} · gotowe! Odbierz monety`;
  };
  update();
  const iv = setInterval(update, 1000);
  ctx.onCleanup(() => clearInterval(iv));
  const target = a.kind === 'focus' ? 'focus' : `habit/${a.habitId}`;
  return h('button', { class: 'active-banner', onclick: () => go(target) }, '⏱️ ', label);
}

function tabBar(name) {
  return h('nav', { class: 'tabbar', 'aria-label': 'Nawigacja' },
    TABS.map((t) => h('a', {
      href: `#/${t.route}`,
      class: name === t.route || (t.route === 'habits' && name === 'habit') ? 'active' : '',
      'aria-current': name === t.route ? 'page' : null,
    }, h('span', { class: 'tab-ico', 'aria-hidden': 'true' }, t.icon), h('span', {}, t.label))),
  );
}

// Lock-in focus: leaving the app for more than GRACE ms ends the session without reward.
const GRACE = 10e3;
document.addEventListener('visibilitychange', () => {
  const a = state.active;
  if (!a || a.kind !== 'focus' || !a.strict) return;
  if (document.hidden) {
    a.hiddenAt = Date.now();
    S.save(storage, state);
    return;
  }
  const away = a.hiddenAt ? Date.now() - a.hiddenAt : 0;
  a.hiddenAt = 0;
  const endsAt = a.startedAt + a.minutes * 60e3;
  if (away > GRACE && Date.now() < endsAt + GRACE) {
    S.failFocus(state, { type: a.title, minutes: Math.round((Date.now() - a.startedAt) / 60e3) });
    state.active = null;
    toast('Wyszedłeś z aplikacji podczas lock-in. Sesja przerwana 😵', 'bad');
  }
  commit();
});

// If iOS killed the tab while it was hidden, no visibilitychange arrives: check on boot instead.
function checkLockInOnBoot() {
  const a = state.active;
  if (!a || a.kind !== 'focus' || !a.strict || !a.hiddenAt) return;
  if (Date.now() - a.hiddenAt > GRACE) {
    S.failFocus(state, { type: a.title, minutes: Math.round((a.hiddenAt - a.startedAt) / 60e3) });
    state.active = null;
    setTimeout(() => toast('Wyszedłeś z aplikacji podczas lock-in. Sesja przerwana 😵', 'bad'), 300);
  }
}

window.addEventListener('hashchange', render);
setInterval(() => { housekeeping(); }, 30e3);
checkLockInOnBoot();
housekeeping();
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
try { navigator.storage?.persist?.(); } catch { /* optional */ }
