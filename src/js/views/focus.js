// Focus sessions (study / work / read / gym) with optional strict "lock-in" mode.
import { h, clear, fmtClock, toast, confetti, vibrate, confirmSheet } from '../ui.js';
import { FOCUS_TYPES, FOCUS_DURATIONS } from '../data.js';
import { celebrate } from './habits.js';

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* not supported or denied */ }
}

export function renderFocus(ctx) {
  const { state } = ctx;
  const a = state.active;
  if (a && a.kind === 'focus') return running(ctx, a);
  if (a) {
    return h('div', { class: 'card' }, h('p', {}, `Trwa: ${a.title}. Najpierw ją zakończ.`), h('a', { class: 'btn', href: `#/habit/${a.habitId}` }, 'Przejdź'));
  }
  return setup(ctx);
}

function setup(ctx) {
  const { state, S, commit } = ctx;
  const f = { type: 'study', minutes: 25, strict: state.settings.strictFocus };
  const rewardEl = h('b', {});
  const updateReward = () => { rewardEl.textContent = `+${S.focusReward(state, f.minutes, f.strict)} monet`; };
  updateReward();
  const group = (items, key, render) => {
    const wrap = h('div', { class: 'pills' });
    items.forEach((it) => {
      const v = typeof it === 'object' ? it.id : it;
      const el = h('button', { class: `pill ${f[key] === v ? 'on' : ''}` }, render(it));
      el.addEventListener('click', () => {
        f[key] = v;
        wrap.querySelectorAll('.pill').forEach((p) => p.classList.remove('on'));
        el.classList.add('on');
        updateReward();
      });
      wrap.append(el);
    });
    return wrap;
  };
  const strictBox = h('input', { type: 'checkbox', checked: f.strict });
  strictBox.addEventListener('change', () => { f.strict = strictBox.checked; updateReward(); });

  return h('div', { class: 'stack' },
    h('h1', {}, 'Sesja skupienia'),
    h('p', { class: 'muted' }, `Sesje płacą ${state.settings.focusBonus}× więcej niż zwykłe nawyki. Tryb lock-in daje dodatkowe +50%.`),
    h('h3', {}, 'Co robisz?'),
    group(FOCUS_TYPES, 'type', (t) => `${t.emoji} ${t.name}`),
    h('h3', {}, 'Jak długo?'),
    group(FOCUS_DURATIONS, 'minutes', (m) => `${m} min`),
    h('label', { class: 'toggle card' },
      strictBox,
      h('span', {}, h('b', {}, '🔐 Lock-in'), h('small', { class: 'muted block' }, 'Ekran nie zgaśnie. Jeśli wyjdziesz z aplikacji na dłużej niż 10 s, sesja przepada i Mózgol traci energię.')),
    ),
    h('div', { class: 'card row-between' }, h('span', {}, 'Nagroda'), rewardEl),
    h('button', { class: 'btn primary', onclick: () => {
      const t = FOCUS_TYPES.find((x) => x.id === f.type);
      state.active = { kind: 'focus', focusType: f.type, title: `${t.emoji} ${t.name}`, startedAt: Date.now(), minutes: f.minutes, strict: f.strict, hiddenAt: 0 };
      commit();
    } }, '▶ Start sesji'),
    h('div', { class: 'card tip' }, h('b', {}, '💡 Wskazówka do nauki'), h('p', { class: 'muted' }, 'Metoda Pomodoro: 25 min nauki, 5 min przerwy. Po 4 sesjach dłuższa przerwa. W przerwie zrób oddychanie zamiast scrollowania.')),
  );
}

function running(ctx, a) {
  const { state, S, commit, go } = ctx;
  if (a.strict) keepAwake(true);
  ctx.onCleanup(() => keepAwake(false));
  const total = a.minutes * 60e3;
  const ring = h('div', { class: 'ring focus' });
  const label = h('div', { class: 'ring-label' });
  const actions = h('div', { class: 'stack' });
  const tick = () => {
    const el = Date.now() - a.startedAt;
    const left = total - el;
    ring.style.setProperty('--p', `${Math.min(100, (el / total) * 100)}%`);
    label.textContent = left > 0 ? fmtClock(left) : 'Koniec!';
    if (left <= 0 && !actions.dataset.done) {
      actions.dataset.done = '1';
      clear(actions);
      actions.append(h('button', { class: 'btn primary', onclick: () => {
        state.active = null;
        const res = S.completeFocus(state, { type: a.focusType, minutes: a.minutes, strict: a.strict });
        confetti(); vibrate([30, 30, 80]);
        commit({ rerender: false });
        keepAwake(false);
        celebrate(ctx, res, () => go(''));
      } }, `Odbierz +${S.focusReward(state, a.minutes, a.strict)} monet`));
    }
  };
  actions.append(h('button', { class: 'btn ghost', onclick: async () => {
    const mins = Math.floor((Date.now() - a.startedAt) / 60e3);
    if (a.strict) {
      const ok = await confirmSheet('Poddać się?', 'W trybie lock-in przerwanie sesji = brak monet i spadek energii Mózgola.', 'Tak, przerywam', 'Wracam do nauki');
      if (!ok) return;
      S.failFocus(state, { type: a.title, minutes: mins });
      state.active = null;
      toast('Sesja przerwana');
      commit();
      return;
    }
    state.active = null;
    if (mins >= 1) {
      const res = S.completeFocus(state, { type: a.focusType, minutes: mins, strict: false });
      commit({ rerender: false });
      celebrate(ctx, res, () => go(''));
    } else { toast('Za krótko, żeby zarobić monety'); commit(); }
  } }, a.strict ? 'Poddaję się' : 'Zakończ (nagroda za przepracowane minuty)'));
  tick();
  const iv = setInterval(tick, 1000);
  ctx.onCleanup(() => clearInterval(iv));
  return h('div', { class: 'stack center focus-run' },
    h('h1', {}, a.title),
    a.strict ? h('p', { class: 'badge' }, '🔐 Lock-in aktywny: nie wychodź z aplikacji') : h('p', { class: 'muted' }, 'Możesz odłożyć telefon. Timer liczy w tle.'),
    h('div', { class: 'ring-wrap' }, ring, label),
    actions,
  );
}
