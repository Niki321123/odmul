// Stats: streak, 7-day chart (real-life minutes vs scroll minutes), totals, photo journal, history.
import { h, fmtMinutes } from '../ui.js';
import { STREAK_MILESTONES } from '../data.js';

const DAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

export function renderStats(ctx) {
  const { state, S } = ctx;
  const week = S.weekStats(state);
  const tot = S.totals(state);
  const max = Math.max(30, ...week.map((d) => Math.max((d.habitMinutes || 0) + (d.focusMinutes || 0), d.unlockMinutes || 0)));
  const nextMs = STREAK_MILESTONES.find((m) => m > state.streak.current);

  return h('div', { class: 'stack' },
    h('h1', {}, 'Statystyki'),
    h('section', { class: 'card streak-card' },
      h('div', { class: 'flame' }, '🔥'),
      h('div', {},
        h('div', { class: 'big' }, `${state.streak.current} ${state.streak.current === 1 ? 'dzień' : 'dni'}`),
        h('small', { class: 'muted' }, `Najdłuższa seria: ${state.streak.best} · następny kamień milowy: ${nextMs ?? '—'} dni`),
      ),
    ),
    h('section', { class: 'card' },
      h('h3', {}, 'Ostatnie 7 dni'),
      h('div', { class: 'legend' }, h('span', { class: 'lg real' }, 'życie w realu'), h('span', { class: 'lg scroll' }, 'scroll')),
      h('div', { class: 'chart', role: 'img', 'aria-label': 'Wykres minut nawyków i scrollowania z 7 dni' }, week.map((d) => {
        const real = (d.habitMinutes || 0) + (d.focusMinutes || 0);
        const scroll = d.unlockMinutes || 0;
        const dow = DAYS[new Date(`${d.day}T12:00:00`).getDay()];
        return h('div', { class: 'col', title: `${d.day}: ${real} min w realu, ${scroll} min scrolla` },
          h('div', { class: 'bars2' },
            h('i', { class: 'real', style: { height: `${(real / max) * 100}%` } }),
            h('i', { class: 'scroll', style: { height: `${(scroll / max) * 100}%` } }),
          ),
          h('small', {}, dow),
        );
      })),
    ),
    h('section', { class: 'grid2' },
      tile('🪙', tot.earned, 'monet zarobione'),
      tile('💸', tot.spent, 'monet wydane'),
      tile('✅', tot.habits, 'nawyków'),
      tile('🎯', fmtMinutes(tot.focus), 'skupienia'),
      tile('🌱', fmtMinutes(tot.habitMinutes), 'nawyków z timerem'),
      tile('📱', fmtMinutes(tot.unlockMinutes), 'odblokowanego scrolla'),
    ),
    state.photos.length ? h('section', { class: 'card' },
      h('h3', {}, '📷 Dziennik zdjęć'),
      h('div', { class: 'photo-grid' }, state.photos.slice().reverse().map((p) => h('figure', {},
        h('img', { src: p.data, alt: p.name, loading: 'lazy' }),
        h('figcaption', {}, p.name),
      ))),
    ) : null,
    state.journal.length ? h('section', { class: 'card' },
      h('h3', {}, '📓 Dziennik'),
      h('div', { class: 'stack tight' }, state.journal.slice(-10).reverse().map((j) => h('details', {},
        h('summary', {}, new Date(j.t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })),
        h('p', { class: 'pre' }, j.text),
      ))),
    ) : null,
    h('section', { class: 'card' },
      h('h3', {}, 'Historia'),
      state.log.length ? h('ul', { class: 'log' }, state.log.slice(-40).reverse().map((e) => h('li', {},
        h('span', {}, h('small', { class: 'muted' }, new Date(e.t).toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })), ' ', e.title),
        h('span', { class: e.coins > 0 ? 'plus' : e.coins < 0 ? 'minus' : 'muted' }, e.coins > 0 ? `+${e.coins}` : e.coins < 0 ? String(e.coins) : '—'),
      ))) : h('p', { class: 'muted' }, 'Jeszcze nic. Zrób pierwszy nawyk!'),
    ),
  );
}

function tile(icon, val, label) {
  return h('div', { class: 'card stat-tile' }, h('b', {}, `${icon} ${val}`), h('small', { class: 'muted' }, label));
}
