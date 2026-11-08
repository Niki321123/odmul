// Multi-step onboarding: welcome, name, chat with Mózgol, quiz, impact visual, commitment, plan.
import { h, clear, confetti, vibrate } from '../ui.js';
import { brainSvg } from '../brain.js';
import { ONBOARDING } from '../data.js';

const CHAT = [
  { brain: 'Hej {name}! Szczerze: ile razy dziś odblokowałeś/aś telefon „tylko na chwilę”?', replies: ['Za dużo 😅', 'Nie liczę...', 'Wolę nie wiedzieć'] },
  { brain: 'Spokojnie, to nie Twoja wina. Aplikacje są projektowane tak, żeby wciągać. Ale zjadają czas na naukę i sen.', replies: ['No właśnie', 'Czuję to'] },
  { brain: 'Mam pomysł: zamiast zakazywać, zróbmy wymianę. Najpierw robisz coś dla siebie, potem scrollujesz.', replies: ['Pokaż jak! 👀'] },
];

export function renderOnboarding(ctx) {
  const { state, S } = ctx;
  const data = { name: '', source: '', activities: [], habitTime: 30, screenTime: '4-6', feelings: [] };
  let step = 0;
  let chatIdx = 0;
  const wrap = h('div', { class: 'onb' });

  const steps = [
    () => screen(
      h('div', { class: 'hero-brain', html: brainSvg('happy', 190) }),
      h('h1', { class: 'logo' }, 'Odmuł'),
      h('p', { class: 'lead' }, 'Zasłuż na swój czas przed ekranem.'),
      h('ul', { class: 'proof' }, h('li', {}, '📚 Najpierw nauka'), h('li', {}, '🪙 Potem monety'), h('li', {}, '📱 Na końcu scroll')),
      next('Zaczynamy'),
    ),
    () => screen(
      h('div', { class: 'hero-brain', html: brainSvg('ok', 170) }),
      h('h2', {}, 'Cześć, jestem Mózgol 👋'),
      h('p', { class: 'lead' }, 'Mieszkam w tej aplikacji. Rosnę, kiedy robisz coś w realu, i gniję, kiedy za dużo scrollujesz.'),
      next('Miło Cię poznać'),
    ),
    () => {
      const input = h('input', { class: 'input', placeholder: 'Twoje imię', maxlength: '24', value: data.name, autocomplete: 'given-name' });
      const btn = h('button', { class: 'btn primary', disabled: !data.name.trim(), onclick: () => advance() }, 'Dalej');
      input.addEventListener('input', () => { data.name = input.value; btn.disabled = !input.value.trim(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) advance(); });
      setTimeout(() => input.focus(), 50);
      return screen(h('h2', {}, 'Jak masz na imię?'), input, btn);
    },
    () => screen(
      h('h2', {}, 'Skąd o nas wiesz?'),
      choiceList(ONBOARDING.sources.map((s) => ({ id: s, label: s })), (id) => { data.source = id; advance(); }),
    ),
    () => chatScreen(),
    () => screen(
      h('div', { class: 'jail' }, h('span', {}, '📱'), h('span', { class: 'bars' })),
      h('h2', {}, 'Jak to działa?'),
      h('ol', { class: 'how' },
        h('li', {}, h('b', {}, 'Blokujesz'), ' rozpraszacze: TikTok, Instagram, YouTube…'),
        h('li', {}, h('b', {}, 'Zarabiasz monety'), ': nauka, spacer, trening, porządki, sesje skupienia.'),
        h('li', {}, h('b', {}, 'Wydajesz monety'), ' na minuty scrollowania. Np. 20 monet = 10 minut.'),
      ),
      next('Rozumiem'),
    ),
    () => multiScreen('Co chcesz robić zamiast scrollowania?', ONBOARDING.activities, 'activities'),
    () => screen(
      h('h2', {}, 'Ile czasu dziennie chcesz dać na nawyki?'),
      h('div', { class: 'grid2' }, ONBOARDING.habitTime.map((m) => h('button', {
        class: `tile ${data.habitTime === m ? 'on' : ''}`, onclick: () => { data.habitTime = m; advance(); },
      }, h('b', {}, `${m} min`), h('small', {}, m >= 60 ? 'ambitnie' : m >= 30 ? 'solidnie' : 'na start')))),
    ),
    () => screen(
      h('h2', {}, 'Ile czasu dziennie spędzasz na telefonie?'),
      choiceList(ONBOARDING.screenTime, (id) => { data.screenTime = id; advance(); }),
    ),
    () => impactScreen(),
    () => multiScreen('Jak się czujesz po długim scrollowaniu?', ONBOARDING.feelings.map((f) => ({ id: f, label: f })), 'feelings'),
    () => screen(
      h('div', { class: 'hero-brain', html: brainSvg('happy', 150) }),
      h('h2', {}, `${data.name}, dasz radę.`),
      h('p', { class: 'lead' }, `Wystarczy ${data.habitTime} minut dziennie dla siebie, żeby odzyskać kontrolę. Mózgol będzie pilnował, a Ty będziesz zbierać monety.`),
      compareChart(),
      next('Jasne!'),
    ),
    () => commitScreen(),
    () => planLoading(),
    () => planReady(),
  ];

  function screen(...children) {
    const total = steps.length;
    return h('section', { class: 'onb-screen' },
      h('div', { class: 'progress' }, h('i', { style: { width: `${Math.round(((step + 1) / total) * 100)}%` } })),
      step > 0 && step < steps.length - 2 ? h('button', { class: 'back', onclick: back, 'aria-label': 'Wstecz' }, '←') : null,
      h('div', { class: 'onb-body' }, ...children),
    );
  }
  function next(label) { return h('button', { class: 'btn primary', onclick: advance }, label); }
  function advance() { step = Math.min(step + 1, steps.length - 1); draw(); }
  function back() { step = Math.max(0, step - 1); chatIdx = 0; draw(); }
  function draw() { clear(wrap); wrap.append(steps[step]()); }

  function choiceList(items, onPick) {
    return h('div', { class: 'choices' }, items.map((it) => h('button', { class: 'choice', onclick: () => onPick(it.id) }, it.label)));
  }

  function multiScreen(title, items, key) {
    const btn = h('button', { class: 'btn primary', disabled: !data[key].length, onclick: advance }, 'Dalej');
    return screen(
      h('h2', {}, title),
      h('p', { class: 'muted' }, 'Możesz wybrać kilka.'),
      h('div', { class: 'pills' }, items.map((it) => {
        const el = h('button', { class: `pill ${data[key].includes(it.id) ? 'on' : ''}`, 'aria-pressed': String(data[key].includes(it.id)) },
          it.emoji ? `${it.emoji} ` : '', it.label);
        el.addEventListener('click', () => {
          data[key] = data[key].includes(it.id) ? data[key].filter((x) => x !== it.id) : [...data[key], it.id];
          el.classList.toggle('on');
          el.setAttribute('aria-pressed', String(data[key].includes(it.id)));
          btn.disabled = !data[key].length;
        });
        return el;
      })),
      btn,
    );
  }

  function chatScreen() {
    const log = h('div', { class: 'chat' });
    const replies = h('div', { class: 'replies' });
    const show = () => {
      clear(replies);
      const turn = CHAT[chatIdx];
      log.append(h('div', { class: 'bubble brain' }, turn.brain.replace('{name}', data.name)));
      turn.replies.forEach((r) => replies.append(h('button', { class: 'pill', onclick: () => {
        log.append(h('div', { class: 'bubble me' }, r));
        chatIdx += 1;
        if (chatIdx < CHAT.length) setTimeout(show, 350);
        else { clear(replies); setTimeout(advance, 600); }
      } }, r)));
      log.scrollTop = log.scrollHeight;
    };
    chatIdx = 0;
    setTimeout(show, 200);
    return screen(h('div', { class: 'chat-head', html: brainSvg('ok', 56) }), h('h2', {}, 'Rozmowa z Mózgolem'), log, replies);
  }

  function impactScreen() {
    const opt = ONBOARDING.screenTime.find((s) => s.id === data.screenTime) || ONBOARDING.screenTime[2];
    const years = S.yearsOnPhone(opt.hours);
    const dayShare = opt.hours / 16; // share of waking hours
    const daysPerYear = Math.round(opt.hours * 365 / 24);
    const dots = h('div', { class: 'year-grid', 'aria-label': `${daysPerYear} z 365 dni rocznie na telefonie` });
    for (let i = 0; i < 365; i++) dots.append(h('i', { class: i < daysPerYear ? 'lost' : '' }));
    return screen(
      h('h2', {}, 'To jest rok Twojego życia'),
      h('p', { class: 'muted' }, `Każda kropka to dzień. Przy ~${opt.hours} h dziennie spędzasz ${daysPerYear} pełnych dób rocznie na telefonie.`),
      dots,
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, `${Math.round(dayShare * 100)}%`), h('small', {}, 'czasu na jawie')),
        h('div', { class: 'stat' }, h('b', {}, `${years} lat`), h('small', {}, 'do 80. roku życia')),
      ),
      next('Chcę to zmienić'),
    );
  }

  function compareChart() {
    // Simple two-line SVG: scrolling vs living over 3 weeks.
    return h('div', { class: 'compare', html: `<svg viewBox="0 0 300 140" role="img" aria-label="Z Odmułem czas na nawyki rośnie, scrollowanie spada">
      <path d="M10 40 C 90 42, 160 60, 290 118" stroke="#e05a7a" stroke-width="4" fill="none"/>
      <path d="M10 118 C 90 112, 170 70, 290 28" stroke="#3fbf7f" stroke-width="4" fill="none"/>
      <text x="200" y="134" font-size="12" fill="currentColor">scrollowanie</text>
      <text x="196" y="22" font-size="12" fill="currentColor">życie w realu</text>
      <text x="10" y="134" font-size="11" fill="currentColor" opacity=".6">dziś</text>
      <text x="150" y="134" font-size="11" fill="currentColor" opacity=".6">3 tyg.</text></svg>` });
  }

  function commitScreen() {
    const ring = h('div', { class: 'hold-ring' });
    const btn = h('button', { class: 'hold-btn', 'aria-label': 'Przytrzymaj, aby się zobowiązać' }, '☝️');
    let t;
    const start = (e) => { e.preventDefault(); ring.classList.add('filling'); vibrate(20); t = setTimeout(() => { vibrate([40, 40, 80]); advance(); }, 1600); };
    const stop = () => { clearTimeout(t); ring.classList.remove('filling'); };
    btn.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
    return screen(
      h('h2', {}, `${data.name}, zobowiązujesz się?`),
      h('p', { class: 'lead' }, 'Od dziś najpierw robię coś dla siebie, a dopiero potem scrolluję. Nauka przed TikTokiem.'),
      h('div', { class: 'hold' }, ring, btn),
      h('p', { class: 'muted center' }, 'Przytrzymaj odcisk palca'),
    );
  }

  function planLoading() {
    const items = ['Analizuję Twoje odpowiedzi', 'Dobieram nawyki', 'Ustawiam ceny scrollowania'].map((t) => h('li', {}, h('span', { class: 'check' }, '○'), t));
    items.forEach((li, i) => setTimeout(() => { li.classList.add('done'); li.firstChild.textContent = '✓'; }, 500 + i * 650));
    setTimeout(advance, 2600);
    return screen(h('div', { class: 'hero-brain spin', html: brainSvg('ok', 140) }), h('h2', {}, 'Tworzę Twój plan…'), h('ul', { class: 'loading-list' }, items));
  }

  function planReady() {
    const weeks = [
      { t: 'Tydzień 1', d: 'Detoks: blokujesz 3 najgorsze aplikacje, 1–2 nawyki dziennie.' },
      { t: 'Tydzień 2', d: `Rytm: ${data.habitTime} min nawyków dziennie, sesje nauki po 25 min.` },
      { t: 'Tydzień 3', d: 'Kontrola: tryb twardy, scroll tylko za zarobione monety.' },
    ];
    return screen(
      h('div', { class: 'hero-brain', html: brainSvg('buff', 150) }),
      h('h2', {}, 'Twój plan na 3 tygodnie'),
      h('div', { class: 'stack' }, weeks.map((w) => h('div', { class: 'card' }, h('b', {}, w.t), h('p', { class: 'muted' }, w.d)))),
      h('button', { class: 'btn primary', onclick: () => {
        S.finishOnboarding(state, data);
        confetti();
        ctx.commit({ rerender: false });
        ctx.go('setup');
      } }, 'Zaczynam odmulanie 🚀'),
      h('p', { class: 'muted center' }, 'Na start dostajesz 20 monet.'),
    );
  }

  draw();
  return wrap;
}
