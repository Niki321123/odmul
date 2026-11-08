// Habit library + runners for timer / photo / journal / breathing habits.
import { h, clear, coin, fmtClock, toast, confetti, sheet, shrinkPhoto, vibrate, confirmSheet } from '../ui.js';
import { CATEGORIES, JOURNAL_PROMPTS } from '../data.js';
import { brainSvg } from '../brain.js';

let activeCat = 'all';

export function renderHabits(ctx) {
  const { state, S, go, commit } = ctx;
  const list = h('div', { class: 'stack tight' });
  const drawList = () => {
    clear(list);
    const items = S.allHabits(state).filter((x) => activeCat === 'all' || x.cat === activeCat || (activeCat === 'custom' && x.custom));
    items.forEach((x) => list.append(h('div', { class: 'habit-row' },
      h('button', { class: 'habit-main', onclick: () => go(`habit/${x.id}`) },
        h('span', { class: 'tile-emoji' }, x.emoji),
        h('span', { class: 'habit-text' }, h('b', {}, x.name), h('small', { class: 'muted' }, typeLabel(x))),
        h('span', { class: 'reward' }, '+', String(S.habitReward(state, x))),
      ),
      x.custom ? h('button', { class: 'icon-btn', 'aria-label': `Usuń ${x.name}`, onclick: async () => {
        if (await confirmSheet('Usunąć nawyk?', x.name, 'Usuń')) { S.removeCustomHabit(state, x.id); commit(); }
      } }, '🗑️') : null,
    )));
  };
  const cats = [{ id: 'all', label: 'Wszystkie', emoji: '✨' }, ...CATEGORIES, { id: 'custom', label: 'Moje', emoji: '⭐' }];
  const pills = h('div', { class: 'pills scroll-x' }, cats.map((c) => h('button', {
    class: `pill ${activeCat === c.id ? 'on' : ''}`,
    onclick: (e) => { activeCat = c.id; pills.querySelectorAll('.pill').forEach((p) => p.classList.remove('on')); e.currentTarget.classList.add('on'); drawList(); },
  }, `${c.emoji} ${c.label}`)));
  drawList();
  return h('div', { class: 'stack' },
    h('div', { class: 'row-between' }, h('h1', {}, 'Nawyki'), h('button', { class: 'btn small primary', onclick: () => customSheet(ctx) }, '+ Własny')),
    h('p', { class: 'muted' }, `${S.allHabits(state).length} nawyków. Nawyki z timerem dają ${state.settings.timerCoinsPerMin} monetę za minutę, ze zdjęciem: stałą nagrodę.`),
    pills,
    list,
  );
}

function typeLabel(x) {
  return {
    timer: `⏱️ Timer · ${x.minutes} min`,
    photo: '📷 Zdjęcie jako dowód',
    journal: '✍️ Wpis w dzienniku',
    breathing: `🌬️ Oddychanie · ${x.minutes} min`,
  }[x.type] || '';
}

function customSheet(ctx) {
  const { state, S, commit } = ctx;
  const f = { name: '', emoji: '⭐', cat: 'study', type: 'timer', minutes: 20, coins: 10 };
  const amount = h('label', { class: 'field' });
  const drawAmount = () => {
    clear(amount);
    if (f.type === 'timer') {
      amount.append('Czas (min)', numberInput(f.minutes, 1, 240, (v) => { f.minutes = v; }));
    } else {
      amount.append('Nagroda (monety)', numberInput(f.coins, 1, 100, (v) => { f.coins = v; }));
    }
  };
  drawAmount();
  const close = sheet(h('div', { class: 'stack' },
    h('h2', {}, 'Nowy nawyk'),
    h('label', { class: 'field' }, 'Nazwa', input(f, 'name', 'np. Matma: 10 zadań')),
    h('label', { class: 'field' }, 'Emoji', input(f, 'emoji', '⭐')),
    h('label', { class: 'field' }, 'Kategoria', select(CATEGORIES.map((c) => [c.id, `${c.emoji} ${c.label}`]), f.cat, (v) => { f.cat = v; })),
    h('label', { class: 'field' }, 'Sposób zaliczenia', select([['timer', '⏱️ Timer'], ['photo', '📷 Zdjęcie']], f.type, (v) => { f.type = v; drawAmount(); })),
    amount,
    h('button', { class: 'btn primary', onclick: () => {
      try { S.addCustomHabit(state, f); close(); toast('Dodano nawyk', 'good'); commit(); } catch (e) { toast(e.message, 'bad'); }
    } }, 'Zapisz'),
  ));
}

function input(obj, key, placeholder) {
  const el = h('input', { class: 'input', placeholder, value: obj[key], maxlength: key === 'emoji' ? '4' : '40' });
  el.addEventListener('input', () => { obj[key] = el.value; });
  return el;
}
function numberInput(val, min, max, onChange) {
  const el = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: String(min), max: String(max), value: String(val) });
  el.addEventListener('input', () => onChange(Number(el.value)));
  return el;
}
export function select(options, value, onChange) {
  const el = h('select', { class: 'input' }, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

// ---------- runner ----------
export function renderHabitRun(ctx) {
  const { state, S, params } = ctx;
  const habit = S.findHabit(state, params[0]);
  if (!habit) return h('p', {}, 'Nie znaleziono nawyku. ', h('a', { href: '#/habits' }, 'Wróć'));
  const body = { timer: timerRun, photo: photoRun, journal: journalRun, breathing: breathingRun }[habit.type] || timerRun;
  return h('div', { class: 'stack runner' },
    h('a', { href: '#/habits', class: 'link' }, '← Nawyki'),
    h('div', { class: 'runner-head' }, h('span', { class: 'runner-emoji' }, habit.emoji), h('h1', {}, habit.name)),
    body(ctx, habit),
  );
}

function reward(ctx, habit, opts) {
  const { state, S, commit, go } = ctx;
  const res = S.completeHabit(state, habit, opts);
  confetti();
  vibrate([30, 30, 60]);
  commit({ rerender: false });
  celebrate(ctx, res, () => go(''));
}

export function celebrate(ctx, res, then) {
  const { state, S } = ctx;
  const close = sheet(h('div', { class: 'stack center' },
    h('div', { class: 'hero-brain', html: brainSvg(S.mood(state.energy), 140) }),
    h('h2', {}, 'Brawo! 🎉'),
    h('div', { class: 'big' }, '+', coin(res.coins)),
    res.milestone ? h('div', { class: 'card milestone' }, h('b', {}, `🔥 Seria ${res.milestone.days} dni!`), h('p', {}, `Bonus +${res.milestone.bonus} monet`)) : null,
    h('p', { class: 'muted' }, `Seria: ${state.streak.current} ${state.streak.current === 1 ? 'dzień' : 'dni'} · Energia: ${Math.round(state.energy)}%`),
    h('button', { class: 'btn primary', onclick: () => close() }, 'Super'),
  ), { onClose: then });
}

function timerRun(ctx, habit) {
  const { state, S, commit } = ctx;
  const a = state.active;
  const mine = a && a.kind === 'timer' && a.habitId === habit.id;
  if (a && !mine) {
    return h('div', { class: 'card' }, h('p', {}, `Trwa już: ${a.title}. Najpierw ją skończ.`), h('a', { class: 'btn', href: a.kind === 'focus' ? '#/focus' : `#/habit/${a.habitId}` }, 'Przejdź'));
  }
  if (!mine) {
    let minutes = habit.minutes || 15;
    const val = h('b', { class: 'big' }, `${minutes} min`);
    const rew = h('span', {}, `Nagroda: +${S.habitReward(state, habit, minutes)} monet`);
    const set = (d) => { minutes = Math.max(5, Math.min(240, minutes + d)); val.textContent = `${minutes} min`; rew.textContent = `Nagroda: +${S.habitReward(state, habit, minutes)} monet`; };
    return h('div', { class: 'stack center' },
      h('div', { class: 'stepper' }, h('button', { class: 'icon-btn big-btn', onclick: () => set(-5), 'aria-label': 'Mniej' }, '−'), val, h('button', { class: 'icon-btn big-btn', onclick: () => set(5), 'aria-label': 'Więcej' }, '+')),
      rew,
      h('p', { class: 'muted' }, 'Timer liczy dalej, nawet jak zablokujesz telefon albo wyjdziesz z aplikacji.'),
      h('button', { class: 'btn primary', onclick: () => {
        state.active = { kind: 'timer', habitId: habit.id, title: `${habit.emoji} ${habit.name}`, startedAt: Date.now(), minutes };
        commit();
      } }, '▶ Start'),
    );
  }
  const ring = h('div', { class: 'ring' });
  const label = h('div', { class: 'ring-label' });
  const actions = h('div', { class: 'stack' });
  const total = a.minutes * 60e3;
  const tick = () => {
    const el = Date.now() - a.startedAt;
    const left = total - el;
    ring.style.setProperty('--p', `${Math.min(100, (el / total) * 100)}%`);
    label.textContent = left > 0 ? fmtClock(left) : 'Gotowe!';
    if (left <= 0 && !actions.dataset.done) {
      actions.dataset.done = '1';
      clear(actions);
      actions.append(h('button', { class: 'btn primary', onclick: () => { state.active = null; reward(ctx, habit, { minutes: a.minutes }); } }, `Odbierz +${S.habitReward(state, habit, a.minutes)} monet`));
    }
  };
  actions.append(
    h('button', { class: 'btn', onclick: () => {
      const mins = Math.floor((Date.now() - a.startedAt) / 60e3);
      state.active = null;
      if (mins >= 1) reward(ctx, habit, { minutes: mins });
      else { toast('Za krótko, żeby zarobić monety'); commit(); }
    } }, 'Zakończ wcześniej (nagroda za przepracowane minuty)'),
    h('button', { class: 'btn ghost', onclick: () => { state.active = null; commit(); } }, 'Anuluj'),
  );
  tick();
  const iv = setInterval(tick, 1000);
  ctx.onCleanup(() => clearInterval(iv));
  return h('div', { class: 'stack center' }, h('div', { class: 'ring-wrap' }, ring, label), actions);
}

function photoRun(ctx, habit) {
  const { S, state } = ctx;
  let data = '';
  const preview = h('div', { class: 'photo-preview' }, h('span', { class: 'muted' }, 'Brak zdjęcia'));
  const done = h('button', { class: 'btn primary', disabled: true, onclick: () => reward(ctx, habit, { photo: data }) }, `Zalicz +${S.habitReward(state, habit)} monet`);
  const file = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'visually-hidden', id: 'photo-in' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      data = await shrinkPhoto(f);
      clear(preview);
      preview.append(h('img', { src: data, alt: `Zdjęcie: ${habit.name}` }));
      done.disabled = false;
    } catch (e) { toast(e.message, 'bad'); }
  });
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Zrób to w realu, a potem pstryknij zdjęcie jako dowód. Zdjęcia zostają tylko na Twoim telefonie.'),
    preview,
    file,
    h('label', { for: 'photo-in', class: 'btn' }, '📷 Zrób zdjęcie'),
    done,
  );
}

function journalRun(ctx, habit) {
  const prompt = habit.id === 'gratitude' ? JOURNAL_PROMPTS[2] : JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
  const ta = h('textarea', { class: 'input', rows: '7', placeholder: 'Pisz szczerze, to tylko dla Ciebie…' });
  const count = h('small', { class: 'muted' }, '0/60 znaków');
  const done = h('button', { class: 'btn primary', disabled: true, onclick: () => reward(ctx, habit, { text: `${prompt}\n${ta.value.trim()}` }) }, `Zapisz +${habit.coins} monet`);
  ta.addEventListener('input', () => { const n = ta.value.trim().length; count.textContent = `${n}/60 znaków`; done.disabled = n < 60; });
  return h('div', { class: 'stack' }, h('div', { class: 'card prompt' }, h('b', {}, prompt)), ta, count, done);
}

function breathingRun(ctx, habit) {
  const phases = [['Wdech', 4], ['Zatrzymaj', 4], ['Wydech', 4], ['Zatrzymaj', 4]];
  const totalSec = (habit.minutes || 3) * 60;
  const circle = h('div', { class: 'breath' });
  const label = h('div', { class: 'breath-label' }, 'Gotowy/a?');
  const timer = h('small', { class: 'muted' }, fmtClock(totalSec * 1000));
  let iv;
  const start = h('button', { class: 'btn primary', onclick: () => {
    start.remove();
    let sec = 0;
    const step = () => {
      if (sec >= totalSec) { clearInterval(iv); reward(ctx, habit, { minutes: habit.minutes }); return; }
      const cyc = sec % 16;
      const idx = Math.floor(cyc / 4);
      label.textContent = `${phases[idx][0]} · ${4 - (cyc % 4)}`;
      circle.className = `breath phase-${idx}`;
      timer.textContent = fmtClock((totalSec - sec) * 1000);
      sec += 1;
    };
    step();
    iv = setInterval(step, 1000);
  } }, '▶ Zacznij oddychać');
  ctx.onCleanup(() => clearInterval(iv));
  return h('div', { class: 'stack center' }, h('p', { class: 'muted' }, 'Oddychanie pudełkowe 4-4-4-4. Zostań na tym ekranie do końca.'), h('div', { class: 'breath-wrap' }, circle, label), timer, start);
}
