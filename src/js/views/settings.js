// Settings. Anything that makes scrolling easier goes through a delay (anti-impulse).
import { h, toast, confirmSheet, fmtClock } from '../ui.js';
import { DIFFICULTIES } from '../data.js';
import { select } from './habits.js';

const LABELS = {
  mode: 'Tryb', difficulty: 'Poziom trudności', weekendDifficulty: 'Poziom w weekend', batteryMinutes: 'Bateria dzienna',
  mathChallenge: 'Zadanie matematyczne', strictFocus: 'Lock-in domyślnie', changeDelayMin: 'Opóźnienie zmian',
  timerCoinsPerMin: 'Monety za minutę', unblockApp: 'Odblokowanie aplikacji',
};

export function renderSettings(ctx) {
  const { state, S, commit } = ctx;
  const s = state.settings;
  const set = (key, value) => {
    const r = S.requestSetting(state, key, value);
    toast(r === 'pending' ? `Zmiana wejdzie za ${s.changeDelayMin} min (ochrona przed impulsem)` : 'Zapisano', r === 'pending' ? '' : 'good');
    commit();
  };
  const diffOpts = DIFFICULTIES.map((d) => [d.id, `${d.label} (${d.desc})`]);

  return h('div', { class: 'stack' },
    h('h1', {}, 'Ustawienia'),

    state.pending.length ? h('section', { class: 'card warn' },
      h('h3', {}, '⏳ Oczekujące zmiany'),
      h('ul', { class: 'log' }, state.pending.map((p, i) => h('li', {},
        h('span', {}, `${LABELS[p.key] || p.key}: ${valueLabel(p.value)}`,h('small', { class: 'muted block' }, `za ${fmtClock(p.applyAt - Date.now())}`)),
        h('button', { class: 'btn small ghost', onclick: () => { S.cancelPending(state, i); commit(); } }, 'Anuluj'),
      ))),
    ) : null,

    h('section', { class: 'card stack tight' },
      h('h3', {}, 'Ekonomia'),
      field('Tryb', select([['coins', '🪙 Monety: zarabiasz i wydajesz'], ['battery', '🔋 Bateria: dzienny limit + doładowanie nawykami']], s.mode, (v) => set('mode', v))),
      field('Poziom trudności', select(diffOpts, s.difficulty, (v) => set('difficulty', v))),
      field('Poziom w weekend', select([['', 'Tak jak w tygodniu'], ...diffOpts], s.weekendDifficulty, (v) => set('weekendDifficulty', v))),
      s.mode === 'battery' ? field('Bateria dzienna (min)', num(s.batteryMinutes, 0, 240, (v) => set('batteryMinutes', v))) : null,
      field('Monety za minutę nawyku', select([['0.5', '0,5'], ['1', '1'], ['1.5', '1,5'], ['2', '2']], String(s.timerCoinsPerMin), (v) => set('timerCoinsPerMin', Number(v)))),
    ),

    h('section', { class: 'card stack tight' },
      h('h3', {}, 'Tarcie i ochrona'),
      toggle('🧮 Zadanie matematyczne przed odblokowaniem', s.mathChallenge, (v) => set('mathChallenge', v)),
      toggle('🔐 Lock-in jako domyślny w sesjach', s.strictFocus, (v) => set('strictFocus', v)),
      field('Opóźnienie zmian, które ułatwiają scroll', select([['0', 'Brak'], ['5', '5 min'], ['15', '15 min'], ['60', '1 godzina']], String(s.changeDelayMin), (v) => set('changeDelayMin', Number(v)))),
      h('p', { class: 'muted small' }, 'Zaostrzanie działa od razu. Luzowanie (łatwiejszy poziom, wyłączenie blokady, większa bateria) czeka, żeby impuls zdążył minąć.'),
    ),

    h('section', { class: 'card stack tight' },
      h('h3', {}, 'Skróty iOS'),
      field('Nazwa skrótu bramki', text(s.gateShortcut, (v) => { s.gateShortcut = v; commit({ rerender: false }); })),
      field('Nazwa skrótu odblokowania', text(s.unlockShortcut, (v) => { s.unlockShortcut = v; commit({ rerender: false }); })),
      h('a', { class: 'btn', href: '#/setup' }, 'Instrukcja konfiguracji'),
    ),

    h('section', { class: 'card stack tight' },
      h('h3', {}, 'Profil'),
      field('Imię', text(state.profile.name, (v) => { state.profile.name = v.slice(0, 24); commit({ rerender: false }); })),
      field('Dzienny cel (min)', num(state.profile.habitTime, 5, 300, (v) => { state.profile.habitTime = v; commit({ rerender: false }); })),
    ),

    h('section', { class: 'card stack tight' },
      h('h3', {}, 'Kopia zapasowa'),
      h('p', { class: 'muted small' }, 'Dane są tylko na tym telefonie (w Safari). Zrób kopię co jakiś czas.'),
      h('button', { class: 'btn', onclick: () => download(S.exportState(state)) }, '⬇️ Eksportuj'),
      importBtn(ctx),
      h('button', { class: 'btn ghost danger', onclick: async () => {
        if (!(await confirmSheet('Zresetować wszystko?', 'Stracisz monety, serię i historię. Tego nie da się cofnąć.', 'Resetuj', 'Anuluj'))) return;
        Object.assign(state, S.defaultState());
        commit();
        ctx.go('onboarding');
      } }, 'Resetuj aplikację'),
    ),
    h('p', { class: 'muted small center' }, 'Odmuł · aplikacja działa offline, bez kont i bez serwera.'),
  );
}

function valueLabel(v) {
  if (v === true) return 'włącz';
  if (v === false) return 'wyłącz';
  if (v === '') return 'jak w tygodniu';
  const named = { coins: 'monety', battery: 'bateria', ...Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d.label])) };
  return named[v] ?? String(v);
}

function field(label, control) {
  return h('label', { class: 'field' }, label, control);
}
function toggle(label, value, onChange) {
  return h('label', { class: 'toggle row' }, h('input', { type: 'checkbox', checked: value, onchange: (e) => onChange(e.target.checked) }), h('span', {}, label));
}
function num(value, min, max, onChange) {
  const el = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: String(min), max: String(max), value: String(value) });
  el.addEventListener('change', () => onChange(Math.min(max, Math.max(min, Math.round(Number(el.value) || 0)))));
  return el;
}
function text(value, onChange) {
  const el = h('input', { class: 'input', value, maxlength: '40' });
  el.addEventListener('change', () => onChange(el.value.trim()));
  return el;
}

function download(json) {
  const blob = new Blob([json], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `odmul-kopia-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function importBtn(ctx) {
  const input = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', id: 'import-in' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const next = ctx.S.importState(await f.text());
      Object.assign(ctx.state, next);
      toast('Przywrócono kopię', 'good');
      ctx.commit();
    } catch (e) { toast(e.message || 'Błędny plik', 'bad'); }
  });
  return h('div', {}, input, h('label', { for: 'import-in', class: 'btn' }, '⬆️ Importuj'));
}
