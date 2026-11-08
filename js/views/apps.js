// Blocked apps, buying scroll time, and the full-screen gate opened by the iOS shortcut.
import { h, clear, coin, fmtClock, toast, sheet, vibrate } from '../ui.js';
import { APP_CATALOG, UNLOCK_DURATIONS } from '../data.js';
import { brainSvg } from '../brain.js';

const appById = (id) => APP_CATALOG.find((a) => a.id === id);

export function renderApps(ctx) {
  const { state, S, commit } = ctx;
  const now = Date.now();
  const diff = S.currentDifficulty(state, now);
  const pendingUnblock = new Set(state.pending.filter((p) => p.key === 'unblockApp').map((p) => p.value));

  return h('div', { class: 'stack' },
    h('h1', {}, 'Aplikacje'),
    unlockStatus(ctx),
    h('section', { class: 'card' },
      h('h3', {}, 'Kup czas scrollowania'),
      h('p', { class: 'muted' }, state.settings.mode === 'battery'
        ? `Tryb baterii: ${state.settings.batteryMinutes} min dziennie + minuty zarobione nawykami.`
        : `Tryb ${diff.label.toLowerCase()}: ${diff.desc}${S.isWeekend(now) && state.settings.weekendDifficulty ? ' (weekend)' : ''}.`),
      unlockGrid(ctx, ''),
    ),
    h('section', { class: 'card' },
      h('h3', {}, 'Zablokowane aplikacje'),
      h('p', { class: 'muted' }, 'Zaznacz, co Cię rozprasza. Lista musi się zgadzać z automatyzacją w Skrótach iOS.'),
      h('div', { class: 'stack tight' }, APP_CATALOG.map((app) => {
        const on = state.blockedApps.includes(app.id);
        const pend = pendingUnblock.has(app.id);
        return h('label', { class: 'toggle row' },
          h('input', { type: 'checkbox', checked: on, onchange: (e) => {
            if (e.target.checked) { S.requestSetting(state, 'blockApp', app.id); toast(`${app.name} zablokowany`, 'good'); }
            else {
              const r = S.requestSetting(state, 'unblockApp', app.id);
              toast(r === 'pending' ? `Odblokowanie ${app.name} za ${state.settings.changeDelayMin} min (ochrona przed impulsem)` : `${app.name} odblokowany`);
            }
            commit();
          } }),
          h('span', { class: 'app-ico' }, app.emoji),
          h('span', {}, app.name, pend ? h('small', { class: 'muted block' }, '⏳ zostanie usunięty z blokady') : null),
        );
      })),
    ),
    h('a', { class: 'btn wide', href: '#/setup' }, '⚙️ Instrukcja: blokada przez Skróty iOS'),
  );
}

function unlockStatus(ctx) {
  const { state, S, commit } = ctx;
  const left = S.unlockRemaining(state);
  if (left <= 0) return h('div', { class: 'card locked-banner' }, '🔒 Aplikacje są zablokowane');
  const t = h('b', {}, fmtClock(left));
  const iv = setInterval(() => {
    const l = S.unlockRemaining(state);
    t.textContent = fmtClock(l);
    if (l <= 0) { clearInterval(iv); commit(); }
  }, 1000);
  ctx.onCleanup(() => clearInterval(iv));
  return h('div', { class: 'card unlocked-banner' },
    h('div', {}, '🔓 Odblokowane jeszcze ', t),
    h('div', { class: 'row gap' },
      h('button', { class: 'btn small', onclick: () => openPicker(ctx) }, 'Otwórz aplikację'),
      h('button', { class: 'btn small ghost', onclick: () => { S.relock(state); commit(); runShortcut(ctx, Date.now() - 1000, ''); } }, 'Zablokuj teraz'),
    ),
  );
}

function unlockGrid(ctx, appId) {
  const { state, S } = ctx;
  return h('div', { class: 'grid3' }, UNLOCK_DURATIONS.map((min) => {
    const c = S.canUnlock(state, min);
    return h('button', { class: `tile unlock-tile ${c.ok ? '' : 'disabled'}`, 'aria-disabled': String(!c.ok), onclick: () => {
      if (!c.ok) { toast(`Brakuje ${c.missing} ${c.unit === 'coins' ? 'monet' : 'min'}. Zrób nawyk!`, 'bad'); vibrate(60); return; }
      tryUnlock(ctx, min, appId);
    } },
    h('b', {}, `${min} min`),
    h('small', {}, c.unit === 'coins' ? coin(c.cost) : '🔋'),
    );
  }));
}

function tryUnlock(ctx, minutes, appId) {
  const { state } = ctx;
  if (!state.settings.mathChallenge) return finishUnlock(ctx, minutes, appId);
  const ch = ctx.S.mathChallenge();
  const inp = h('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: 'Wynik' });
  const submit = () => {
    if (Number(inp.value) === ch.answer) { close(); finishUnlock(ctx, minutes, appId); }
    else { toast('Źle. Na pewno tego potrzebujesz?', 'bad'); vibrate(80); inp.value = ''; }
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  const close = sheet(h('div', { class: 'stack' },
    h('h2', {}, '🧮 Zadanie przed odblokowaniem'),
    h('p', { class: 'muted' }, 'Mały próg, żeby przerwać autopilota.'),
    h('div', { class: 'big center' }, `${ch.q} = ?`),
    inp,
    h('button', { class: 'btn primary', onclick: submit }, 'Sprawdź'),
  ));
  setTimeout(() => inp.focus(), 100);
}

function finishUnlock(ctx, minutes, appId) {
  const { state, S, commit } = ctx;
  const res = S.unlockApps(state, minutes, appId);
  if (!res.ok) { toast('Za mało środków', 'bad'); return; }
  commit({ rerender: false });
  if (appId) return runShortcut(ctx, res.until, appById(appId)?.scheme || '');
  openPicker(ctx);
  commit();
}

function openPicker(ctx) {
  const { state } = ctx;
  const apps = state.blockedApps.map(appById).filter(Boolean);
  const close = sheet(h('div', { class: 'stack' },
    h('h2', {}, '🔓 Odblokowane'),
    h('p', { class: 'muted' }, `Do ${new Date(state.unlock.until).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}. Co otworzyć?`),
    h('div', { class: 'grid3' }, apps.map((a) => h('button', { class: 'tile', onclick: () => { close(); runShortcut(ctx, state.unlock.until, a.scheme); } },
      h('span', { class: 'tile-emoji' }, a.emoji), h('small', {}, a.name)))),
    h('button', { class: 'btn ghost', onclick: () => { close(); runShortcut(ctx, state.unlock.until, ''); } }, 'Tylko zapisz odblokowanie'),
    h('p', { class: 'muted small' }, `Uruchomi skrót „${state.settings.unlockShortcut}”. Bez niego bramka w Skrótach nie wie, że masz odblokowane.`),
  ));
}

function runShortcut(ctx, until, scheme) {
  const url = ctx.S.unlockShortcutUrl(ctx.state, until, scheme);
  window.location.href = url;
}

// ---------- gate: opened by the "Odmul Bramka" shortcut when a blocked app launches ----------
export function renderGate(ctx) {
  const { state, S, go, params } = ctx;
  const appId = params[0] || '';
  const app = appById(appId);
  const m = S.mood(state.energy);
  const left = S.unlockRemaining(state);
  const wrap = h('div', { class: 'gate' });
  wrap.append(
    h('div', { class: 'hero-brain', html: brainSvg(m === 'buff' || m === 'happy' ? 'tired' : m, 150) }),
    h('h1', {}, left > 0 ? '🔓 Masz odblokowane' : app ? `${app.emoji} ${app.name} jest zablokowany` : '🔒 Rozpraszacze są zablokowane'),
    h('p', { class: 'lead' }, quote(state)),
  );
  if (left > 0) {
    wrap.append(
      h('div', { class: 'card unlocked-banner' }, `Masz jeszcze ${fmtClock(left)} odblokowania.`),
      h('button', { class: 'btn primary', onclick: () => runShortcut(ctx, state.unlock.until, app?.scheme || '') }, app ? `Otwórz ${app.name}` : 'Otwórz'),
    );
  } else {
    wrap.append(
      h('div', { class: 'card center' },
        h('small', { class: 'muted' }, 'Masz'),
        h('div', { class: 'big' }, state.settings.mode === 'battery' ? `🔋 ${S.batteryLeft(state)} min` : coin(state.coins)),
        h('small', { class: 'muted' }, 'Wydaj na:'),
        unlockGrid(ctx, appId),
      ),
    );
  }
  wrap.append(
    h('button', { class: 'btn good', onclick: () => go('habits') }, '💪 Zarób monety nawykiem'),
    h('button', { class: 'btn', onclick: () => go('focus') }, '📚 Wracam do nauki'),
    h('button', { class: 'btn ghost', onclick: () => go('') }, 'Zamknij'),
  );
  return wrap;
}

function quote(state) {
  const d = state.history[Object.keys(state.history).sort().pop()] || {};
  const lines = [
    'Serio teraz? Może najpierw 25 minut nauki?',
    'Scroll nie ucieknie. Twój egzamin też nie.',
    `Dziś odblokowałeś/aś już ${d.unlockMinutes || 0} min. Mózgol patrzy 👀`,
    'Każda minuta nauki to moneta. Każda moneta to wybór.',
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}
