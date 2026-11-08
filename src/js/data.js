// Static content: habit library, focus types, apps, onboarding options, quests.

export const CATEGORIES = [
  { id: 'study', label: 'Nauka', emoji: '📚' },
  { id: 'body', label: 'Ruch', emoji: '🏃' },
  { id: 'mind', label: 'Głowa', emoji: '🧘' },
  { id: 'home', label: 'Dom', emoji: '🧹' },
  { id: 'social', label: 'Ludzie', emoji: '🤝' },
];

// type: 'timer' = earn coins per minute; 'photo' = snap a proof photo for a fixed reward
export const HABIT_PRESETS = [
  { id: 'study-block', name: 'Blok nauki', emoji: '📖', cat: 'study', type: 'timer', minutes: 25 },
  { id: 'flashcards', name: 'Powtórka fiszek', emoji: '🗂️', cat: 'study', type: 'timer', minutes: 15 },
  { id: 'exercises', name: 'Rozwiąż zadania', emoji: '✏️', cat: 'study', type: 'timer', minutes: 30 },
  { id: 'notes', name: 'Zrób notatki', emoji: '📝', cat: 'study', type: 'photo', coins: 20 },
  { id: 'read', name: 'Czytanie książki', emoji: '📕', cat: 'study', type: 'timer', minutes: 20 },
  { id: 'language', name: 'Język obcy', emoji: '🗣️', cat: 'study', type: 'timer', minutes: 15 },
  { id: 'mindmap', name: 'Mapa myśli z rozdziału', emoji: '🧠', cat: 'study', type: 'photo', coins: 25 },
  { id: 'walk', name: 'Spacer', emoji: '🚶', cat: 'body', type: 'timer', minutes: 20 },
  { id: 'run', name: 'Bieganie', emoji: '🏃', cat: 'body', type: 'timer', minutes: 30 },
  { id: 'gym', name: 'Siłownia', emoji: '🏋️', cat: 'body', type: 'timer', minutes: 45 },
  { id: 'pushups', name: '30 pompek', emoji: '💪', cat: 'body', type: 'photo', coins: 10 },
  { id: 'stretch', name: 'Rozciąganie', emoji: '🤸', cat: 'body', type: 'timer', minutes: 10 },
  { id: 'bike', name: 'Rower', emoji: '🚴', cat: 'body', type: 'timer', minutes: 30 },
  { id: 'water', name: 'Wypij 2 szklanki wody', emoji: '💧', cat: 'body', type: 'photo', coins: 5 },
  { id: 'meditate', name: 'Medytacja', emoji: '🧘', cat: 'mind', type: 'timer', minutes: 10 },
  { id: 'breathing', name: 'Głębokie oddychanie', emoji: '🌬️', cat: 'mind', type: 'breathing', minutes: 3 },
  { id: 'journal', name: 'Dziennik', emoji: '📓', cat: 'mind', type: 'journal', coins: 15 },
  { id: 'gratitude', name: '3 rzeczy, za które dziękuję', emoji: '🙏', cat: 'mind', type: 'journal', coins: 10 },
  { id: 'plan', name: 'Zaplanuj jutro', emoji: '🗓️', cat: 'mind', type: 'photo', coins: 10 },
  { id: 'dishes', name: 'Pozmywaj naczynia', emoji: '🍽️', cat: 'home', type: 'photo', coins: 15 },
  { id: 'clean', name: 'Posprzątaj pokój', emoji: '🧹', cat: 'home', type: 'photo', coins: 20 },
  { id: 'bed', name: 'Pościel łóżko', emoji: '🛏️', cat: 'home', type: 'photo', coins: 5 },
  { id: 'desk', name: 'Ogarnij biurko', emoji: '🗄️', cat: 'home', type: 'photo', coins: 10 },
  { id: 'cook', name: 'Ugotuj posiłek', emoji: '🍳', cat: 'home', type: 'photo', coins: 20 },
  { id: 'call', name: 'Zadzwoń do bliskiej osoby', emoji: '📞', cat: 'social', type: 'timer', minutes: 10 },
  { id: 'friends', name: 'Spotkanie offline', emoji: '☕', cat: 'social', type: 'timer', minutes: 30 },
  { id: 'help', name: 'Pomóż komuś', emoji: '🫶', cat: 'social', type: 'photo', coins: 15 },
];

export const FOCUS_TYPES = [
  { id: 'study', name: 'Nauka', emoji: '📚' },
  { id: 'focus', name: 'Skupienie', emoji: '🎯' },
  { id: 'work', name: 'Praca', emoji: '💼' },
  { id: 'read', name: 'Czytanie', emoji: '📖' },
  { id: 'gym', name: 'Trening', emoji: '🏋️' },
];

export const FOCUS_DURATIONS = [15, 25, 45, 60, 90];

// URL schemes let the iOS "unlock" shortcut jump straight back into the app.
export const APP_CATALOG = [
  { id: 'tiktok', name: 'TikTok', emoji: '🎵', scheme: 'tiktok://' },
  { id: 'instagram', name: 'Instagram', emoji: '📸', scheme: 'instagram://' },
  { id: 'youtube', name: 'YouTube', emoji: '▶️', scheme: 'youtube://' },
  { id: 'facebook', name: 'Facebook', emoji: '👍', scheme: 'fb://' },
  { id: 'x', name: 'X / Twitter', emoji: '✖️', scheme: 'twitter://' },
  { id: 'snapchat', name: 'Snapchat', emoji: '👻', scheme: 'snapchat://' },
  { id: 'reddit', name: 'Reddit', emoji: '👽', scheme: 'reddit://' },
  { id: 'netflix', name: 'Netflix', emoji: '🎬', scheme: 'nflx://' },
  { id: 'discord', name: 'Discord', emoji: '💬', scheme: 'discord://' },
  { id: 'twitch', name: 'Twitch', emoji: '🟣', scheme: 'twitch://' },
  { id: 'games', name: 'Gry', emoji: '🎮', scheme: '' },
];

export const UNLOCK_DURATIONS = [5, 10, 15, 30, 60];

export const DIFFICULTIES = [
  { id: 'easy', label: 'Łatwy', rate: 1, desc: '1 moneta = 1 min scrollowania' },
  { id: 'normal', label: 'Normalny', rate: 2, desc: '2 monety = 1 min scrollowania' },
  { id: 'hard', label: 'Twardy', rate: 3, desc: '3 monety = 1 min scrollowania' },
];

export const ONBOARDING = {
  sources: ['App Store / sklep', 'TikTok', 'Instagram', 'YouTube', 'Znajomi', 'Inne'],
  activities: [
    { id: 'study', label: 'Nauka', emoji: '📚' },
    { id: 'read', label: 'Czytanie', emoji: '📖' },
    { id: 'run', label: 'Bieganie', emoji: '🏃' },
    { id: 'gym', label: 'Siłownia', emoji: '🏋️' },
    { id: 'walk', label: 'Spacery', emoji: '🚶' },
    { id: 'meditate', label: 'Medytacja', emoji: '🧘' },
    { id: 'journal', label: 'Dziennik', emoji: '📓' },
    { id: 'clean', label: 'Porządki', emoji: '🧹' },
    { id: 'language', label: 'Języki', emoji: '🗣️' },
    { id: 'cook', label: 'Gotowanie', emoji: '🍳' },
  ],
  habitTime: [15, 30, 60, 90],
  screenTime: [
    { id: '1-2', label: '1–2 godziny', hours: 1.5 },
    { id: '2-4', label: '2–4 godziny', hours: 3 },
    { id: '4-6', label: '4–6 godzin', hours: 5 },
    { id: '6-8', label: '6–8 godzin', hours: 7 },
    { id: '8+', label: 'Ponad 8 godzin', hours: 9 },
  ],
  feelings: ['Zmęczony/a', 'Rozkojarzony/a', 'Winny/a', 'Niespokojny/a', 'Pusty/a w środku', 'Spoko, ale czas ucieka'],
};

// Daily side quests. `check(day)` gets today's stats object from the store.
export const QUESTS = [
  { id: 'two-habits', text: 'Zrób 2 nawyki', coins: 15, check: (d) => d.habitsDone >= 2 },
  { id: 'three-habits', text: 'Zrób 3 nawyki', coins: 25, check: (d) => d.habitsDone >= 3 },
  { id: 'focus-25', text: 'Sesja skupienia min. 25 min', coins: 20, check: (d) => d.longestFocus >= 25 },
  { id: 'focus-60', text: 'Łącznie 60 min skupienia', coins: 30, check: (d) => d.focusMinutes >= 60 },
  { id: 'photo', text: 'Zalicz nawyk ze zdjęciem', coins: 10, check: (d) => d.photos >= 1 },
  { id: 'breath', text: 'Ćwiczenie oddechowe', coins: 10, check: (d) => d.breathing >= 1 },
  { id: 'journal', text: 'Wpis w dzienniku', coins: 10, check: (d) => d.journals >= 1 },
  { id: 'study-45', text: '45 min nauki (nawyki + sesje)', coins: 25, check: (d) => d.studyMinutes >= 45 },
  { id: 'low-scroll', text: 'Odblokuj max 15 min dziś (sprawdzane wieczorem)', coins: 20, check: (d, hour) => hour >= 20 && d.unlockMinutes <= 15 },
];

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

export const JOURNAL_PROMPTS = [
  'Co dziś poszło dobrze?',
  'Czego się dziś nauczyłem/am?',
  'Za co jestem dziś wdzięczny/a? (3 rzeczy)',
  'Co mnie dziś rozpraszało i jak to ograniczę jutro?',
  'Jaki jeden krok przybliży mnie jutro do celu?',
];
