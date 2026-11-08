// Home: Mózgol + energy, balance, unlock status, daily quests, quick habits, recent activity.
import { h, coin, fmtClock, toast, confetti } from '../ui.js';
import { brainSvg } from '../brain.js';

export function renderHome(ctx) {
  const { state, S, go, commit } = ctx;
  const now = Date.now();
  const m = S.mood(state.energy);
  const d = S.today(state, now);
  const lp = S.levelProgress(state.xp);
  const goal = state.profile.habitTime || 30;
  const doneMin = d.habitMinutes + d.focusMinutes;

  const unlockLeft = S.unlockRemaining(state, now);
  const unlockEl = h('span', {}, fmtClock(unlockLeft));
  if (unlockLeft > 0) {
    const iv = setInterval(() => {
      const left = S.unlockRemaining(state);
      unlockEl.textContent = fmtClock(left);
      if (left <= 0) { clearInterval(iv); commit(); }
    }, 1000);
    ctx.onCleanup(() => clearInterval(iv));
  }

  const favIds = (state.profile.activities || []).slice(0, 4);
  const quick = S.allHabits(state).filter((x) => favIds.some((f) => x.id.startsWith(f))).slice(0, 4);
  const quickList = quick.length ? quick : S.allHabits(state).slice(0, 4);

  return h('div', { class: 'stack' },
    h('section', { class: `buddy card mood-${m}` },
      h('div', { class: 'buddy-art', html: brainSvg(m, 150) }),
      h('div', { class: 'buddy-info' },
        h('h2', {}, state.profile.name ? `Hej, ${state.profile.name}!` : 'Hej!'),
        h('p', { class: 'muted' }, S.MOOD_TEXT[m]),
        meter('Energia Mózgola', state.energy, '%'),
        meter(`Poziom ${lp.level}`, Math.round(lp.pct * 100), '%', `${lp.toNext} XP do kolejnego`),
      ),
    ),

    h('section', { class: 'card balance' },
      h('div', {},
        h('small', { class: 'muted' }, state.settings.mode === 'battery' ? 'Bateria scrollowania' : 'Twoje monety'),
        h('div', { class: 'big' }, state.settings.mode === 'battery' ? `🔋 ${S.batteryLeft(state, now)} min` : coin(state.coins)),
        h('small', { class: 'muted' }, `≈ ${S.balanceMinutes(state, now)} min scrollowania`),
      ),
      unlockLeft > 0
        ? h('div', { class: 'unlocked-pill' }, '🔓 Odblokowane: ', unlockEl)
        : h('button', { class: 'btn small', onclick: () => go('apps') }, '🔓 Odblokuj'),
    ),

    h('section', { class: 'card' },
      h('div', { class: 'row-between' }, h('h3', {}, 'Dzisiejszy cel'), h('span', { class: 'muted' }, `${doneMin}/${goal} min`)),
      h('div', { class: 'bar' }, h('i', { style: { width: `${Math.min(100, (doneMin / goal) * 100)}%` } })),
      h('div', { class: 'stat-row' },
        mini('✅', d.habitsDone, 'nawyki'),
        mini('🎯', `${d.focusMinutes}m`, 'skupienie'),
        mini('📚', `${d.studyMinutes}m`, 'nauka'),
        mini('📱', `${d.unlockMinutes}m`, 'scroll'),
      ),
    ),

    h('section', { class: 'card' },
      h('h3', {}, '⚔️ Zadania poboczne'),
      h('div', { class: 'stack tight' }, S.questStatus(state, now).map((q) => h('div', { class: `quest ${q.done ? 'done' : ''}` },
        h('span', { class: 'q-check' }, q.claimed ? '✓' : q.done ? '!' : '○'),
        h('span', { class: 'q-text' }, q.text),
        q.done && !q.claimed
          ? h('button', { class: 'btn small primary', onclick: () => {
            const got = S.claimQuest(state, q.id);
            if (got) { confetti(40); toast(`+${got} monet!`, 'good'); commit(); }
          } }, `Odbierz +${q.coins}`)
          : h('span', { class: 'muted' }, `+${q.coins}`),
      ))),
    ),

    h('section', {},
      h('div', { class: 'row-between' }, h('h3', {}, 'Szybki start'), h('a', { href: '#/habits', class: 'link' }, 'Wszystkie →')),
      h('div', { class: 'grid2' }, quickList.map((x) => h('button', { class: 'tile habit-tile', onclick: () => go(`habit/${x.id}`) },
        h('span', { class: 'tile-emoji' }, x.emoji),
        h('b', {}, x.name),
        h('small', {}, x.type === 'timer' || x.type === 'breathing' ? `${x.minutes} min · +${S.habitReward(state, x)}` : `+${x.coins}`),
      ))),
      h('button', { class: 'btn wide', onclick: () => go('focus') }, '🎯 Sesja nauki / skupienia'),
    ),

    state.log.length ? h('section', { class: 'card' },
      h('h3', {}, 'Ostatnio'),
      h('ul', { class: 'log' }, state.log.slice(-6).reverse().map((e) => h('li', {},
        h('span', {}, e.title),
        h('span', { class: e.coins > 0 ? 'plus' : e.coins < 0 ? 'minus' : 'muted' }, e.coins > 0 ? `+${e.coins}` : e.coins < 0 ? String(e.coins) : '—'),
      ))),
    ) : null,

    state.blockedApps.length && !localStorageFlag('setupSeen') ? h('button', { class: 'card setup-cta', onclick: () => go('setup') },
      h('b', {}, '⚙️ Skonfiguruj blokadę na iPhonie'),
      h('p', { class: 'muted' }, 'Bez tego kroku TikTok i reszta nie będą zablokowane. Zajmie ok. 5 minut.'),
    ) : null,
  );
}

function meter(label, value, unit, sub) {
  return h('div', { class: 'meter' },
    h('div', { class: 'row-between' }, h('small', {}, label), h('small', { class: 'muted' }, sub || `${Math.round(value)}${unit}`)),
    h('div', { class: 'bar' }, h('i', { style: { width: `${Math.max(0, Math.min(100, value))}%` } })),
  );
}

function mini(icon, val, label) {
  return h('div', { class: 'stat' }, h('b', {}, `${icon} ${val}`), h('small', {}, label));
}

function localStorageFlag(k) {
  try { return localStorage.getItem(`odmul-${k}`) === '1'; } catch { return false; }
}
