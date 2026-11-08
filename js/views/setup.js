// Step-by-step guide for wiring iOS Shortcuts into a real app blocker.
import { h, toast } from '../ui.js';
import { APP_CATALOG } from '../data.js';

function copyBtn(text, label = 'Kopiuj') {
  return h('button', { class: 'btn small', onclick: async () => {
    try { await navigator.clipboard.writeText(text); toast('Skopiowano', 'good'); } catch { toast('Zaznacz i skopiuj ręcznie'); }
  } }, label);
}

function code(text) {
  return h('div', { class: 'code-row' }, h('code', {}, text), copyBtn(text));
}

function step(n, title, ...body) {
  return h('section', { class: 'card step' }, h('div', { class: 'step-n' }, String(n)), h('div', { class: 'stack tight' }, h('h3', {}, title), ...body));
}

export function renderSetup(ctx) {
  const { state, S } = ctx;
  const base = `${location.origin}${location.pathname}`;
  const gateUrl = `${base}#/gate`;
  const gateName = state.settings.gateShortcut;
  const unlockName = state.settings.unlockShortcut;
  const apps = state.blockedApps.map((id) => APP_CATALOG.find((a) => a.id === id)?.name).filter(Boolean).join(', ') || 'TikTok, Instagram…';
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

  return h('div', { class: 'stack setup' },
    h('h1', {}, 'Blokada na iPhonie'),
    h('p', { class: 'muted' }, 'iPhone nie pozwala zwykłym stronom blokować aplikacji, więc robimy to Skrótami (wbudowana apka „Skróty”). Raz skonfigurujesz, potem działa samo. Około 5 minut.'),

    standalone ? h('div', { class: 'card warn' }, h('b', {}, '⚠️ Otwórz Odmuł w Safari, nie z ikonki „Do ekranu początkowego”.'),
      h('p', {}, 'iOS trzyma osobne dane dla Safari i dla aplikacji z ekranu początkowego. Bramka ze Skrótów otwiera Safari, więc tam muszą być Twoje monety. Ikonkę zrobisz w kroku 5.')) : null,

    h('div', { class: 'card how-flow' },
      h('b', {}, 'Jak to działa'),
      h('ol', {},
        h('li', {}, `Otwierasz np. TikToka → automatyzacja uruchamia skrót „${gateName}”.`),
        h('li', {}, 'Skrót sprawdza, czy masz wykupiony czas. Jeśli nie, otwiera bramkę Odmułu.'),
        h('li', {}, `W bramce płacisz monetami → Odmuł uruchamia skrót „${unlockName}”, który zapisuje czas odblokowania i otwiera aplikację.`),
      ),
    ),

    step(1, `Skrót „${unlockName}”`,
      h('p', {}, 'Skróty → + (nowy skrót) → nazwij go dokładnie:'), code(unlockName),
      h('p', {}, 'Dodaj akcje po kolei:'),
      h('ol', { class: 'actions' },
        h('li', {}, h('b', {}, 'Podziel tekst'), ' (Split Text): Wejście skrótu, separator ', h('b', {}, 'Własny'), ': ', h('code', {}, '|')),
        h('li', {}, h('b', {}, 'Pobierz element z listy'), ' (Get Item from List): ', h('b', {}, 'Pierwszy element'), ' → ', h('b', {}, 'Zapisz plik'), ' (Save File): zapytaj gdzie ', h('b', {}, 'WYŁ.'), ', ścieżka ', h('code', {}, 'Odmul/unlock.txt'), ', zastąp ', h('b', {}, 'WŁ.')),
        h('li', {}, h('b', {}, 'Pobierz element z listy'), ' z wyniku „Podziel tekst”: ', h('b', {}, 'Ostatni element')),
        h('li', {}, h('b', {}, 'Jeżeli'), ' (If) Element z listy ', h('b', {}, 'ma dowolną wartość'), ' → ', h('b', {}, 'Otwórz URL'), ' (Open URLs): Element z listy → ', h('b', {}, 'Koniec Jeżeli')),
      ),
      h('p', { class: 'muted small' }, 'Odmuł wysyła do skrótu tekst w formacie „2026-11-08 18:30:00|tiktok://”: datę końca odblokowania i adres aplikacji.'),
      h('button', { class: 'btn small', onclick: () => { window.location.href = S.unlockShortcutUrl(state, Date.now() + 60e3, ''); } }, '🧪 Testuj skrót (1 min, za darmo)'),
    ),

    step(2, `Skrót „${gateName}”`,
      h('p', {}, 'Nowy skrót, nazwa:'), code(gateName),
      h('ol', { class: 'actions' },
        h('li', {}, h('b', {}, 'Pobierz plik'), ' (Get File) z folderu Skróty, ścieżka ', h('code', {}, 'Odmul/unlock.txt'), ', ', h('b', {}, 'Błąd, jeśli nie znaleziono: WYŁ.')),
        h('li', {}, h('b', {}, 'Pobierz daty z'), ' (Get Dates from Input): Plik'),
        h('li', {}, h('b', {}, 'Jeżeli'), ' Daty ', h('b', {}, 'jest po'), ' (is after) ', h('b', {}, 'Bieżąca data'), ' → ', h('b', {}, 'Zatrzymaj ten skrót'), ' (Stop This Shortcut)'),
        h('li', {}, h('b', {}, 'W przeciwnym razie'), ' (Otherwise) → ', h('b', {}, 'Otwórz URL'), ':'),
      ),
      code(gateUrl),
      h('p', {}, '5. ', h('b', {}, 'Koniec Jeżeli'), ' (End If)'),
      h('p', { class: 'muted small' }, 'Brak pliku = brak odblokowania = bramka. Proste i odporne.'),
    ),

    step(3, 'Automatyzacja: blokuj aplikacje',
      h('ol', { class: 'actions' },
        h('li', {}, 'Skróty → zakładka ', h('b', {}, 'Automatyzacja'), ' → ', h('b', {}, '+'), ' → ', h('b', {}, 'Aplikacja'), '.'),
        h('li', {}, 'Wybierz: ', h('b', {}, apps), ' · zaznacz ', h('b', {}, 'Jest otwarta'), '.'),
        h('li', {}, 'Wybierz ', h('b', {}, 'Uruchom natychmiast'), ' (Run Immediately) i wyłącz powiadomienie.'),
        h('li', {}, 'Akcja: ', h('b', {}, 'Uruchom skrót'), ' → ', h('b', {}, gateName), '.'),
      ),
      h('p', { class: 'muted small' }, 'Gdy coś dodasz do zablokowanych w Odmule, dodaj to też tutaj.'),
    ),

    step(4, 'Sprawdź',
      h('ol', { class: 'actions' },
        h('li', {}, 'Otwórz TikToka (albo inną zablokowaną apkę) → powinna pojawić się bramka Odmułu.'),
        h('li', {}, 'Kup 5 minut → Skróty zapiszą odblokowanie i otworzą aplikację.'),
        h('li', {}, 'Po 5 minutach przy kolejnym otwarciu znowu zobaczysz bramkę.'),
      ),
      h('p', { class: 'muted small' }, 'Uwaga: iOS nie pozwala wyrzucić Cię z aplikacji w trakcie. Bramka działa przy każdym otwarciu, więc nie trzymaj apki w tle: zamknij ją po czasie.'),
    ),

    step(5, 'Ikonka Odmułu na ekranie początkowym',
      h('p', {}, 'Nowy skrót z akcją ', h('b', {}, 'Otwórz URL'), ':'), code(base),
      h('p', {}, 'Potem: przycisk udostępniania skrótu → ', h('b', {}, 'Dodaj do ekranu początkowego'), '. Otwiera Safari, więc monety zawsze się zgadzają.'),
    ),

    step(6, 'Bonus: wzmocnij blokadę',
      h('p', {}, 'Ustawienia iOS → Czas przed ekranem → ', h('b', {}, 'Limity aplikacji'), ': dodaj twardy limit dzienny (np. 1 h) jako siatkę bezpieczeństwa. Kod czasu przed ekranem niech ustawi ktoś zaufany.'),
    ),

    h('button', { class: 'btn primary', onclick: () => {
      try { localStorage.setItem('odmul-setupSeen', '1'); } catch { /* ignore */ }
      toast('Gotowe! Powodzenia w nauce 📚', 'good');
      ctx.go('');
    } }, 'Skonfigurowane ✓'),
  );
}
