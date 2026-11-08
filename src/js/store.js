// Pure-ish state + economy logic. No DOM access, so it runs under `node --test`.
import { DIFFICULTIES, QUESTS, STREAK_MILESTONES, HABIT_PRESETS } from './data.js';

export const STORAGE_KEY = 'odmul-state-v1';
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const LOG_LIMIT = 300;
const PHOTO_LIMIT = 40;

export function defaultState(now = Date.now()) {
  return {
    version: 1,
    onboarded: false,
    profile: { name: '', source: '', activities: [], habitTime: 30, screenTime: '4-6', feelings: [], createdAt: now },
    coins: 0,
    energy: 60,
    xp: 0,
    settings: {
      mode: 'coins', // 'coins' | 'battery'
      difficulty: 'normal',
      weekendDifficulty: '', // '' = same as weekdays
      batteryMinutes: 30,
      mathChallenge: false,
      strictFocus: true,
      changeDelayMin: 5,
      timerCoinsPerMin: 1,
      focusBonus: 1.5,
      gateShortcut: 'Odmul Bramka',
      unlockShortcut: 'Odmul Odblokuj',
    },
    pending: [],
    blockedApps: ['tiktok', 'instagram', 'youtube'],
    customHabits: [],
    history: {},
    log: [],
    photos: [],
    journal: [],
    unlock: { until: 0, appId: '' },
    active: null,
    streak: { current: 0, best: 0, lastDay: '' },
    quests: { day: '', ids: [], claimed: [] },
    milestonesSeen: [],
    lastEnergyTick: now,
  };
}

// ---------- persistence ----------
export function load(storage, now = Date.now()) {
  const base = defaultState(now);
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return base;
    return merge(base, JSON.parse(raw));
  } catch {
    return base;
  }
}

export function save(storage, state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Storage full: drop oldest photos and retry once.
    state.photos = state.photos.slice(-10);
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
  }
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base, ...saved };
  out.settings = { ...base.settings, ...(saved.settings || {}) };
  out.profile = { ...base.profile, ...(saved.profile || {}) };
  out.streak = { ...base.streak, ...(saved.streak || {}) };
  out.unlock = { ...base.unlock, ...(saved.unlock || {}) };
  out.quests = { ...base.quests, ...(saved.quests || {}) };
  for (const k of ['pending', 'blockedApps', 'customHabits', 'log', 'photos', 'journal', 'milestonesSeen']) {
    if (!Array.isArray(out[k])) out[k] = base[k];
  }
  return out;
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(json, now = Date.now()) {
  const parsed = JSON.parse(json);
  if (!parsed || parsed.version !== 1) throw new Error('Nieprawidłowy plik kopii zapasowej');
  return merge(defaultState(now), parsed);
}

// ---------- dates ----------
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

export function lastNDays(n, now = Date.now()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(now - i * DAY));
  return out;
}

// Format Shortcuts' "Get Dates from Input" can parse reliably.
export function shortcutDate(ms) {
  const d = new Date(ms);
  return `${dayKey(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function today(state, now = Date.now()) {
  const k = dayKey(now);
  if (!state.history[k]) {
    state.history[k] = {
      earned: 0, spent: 0, habitsDone: 0, habitMinutes: 0, focusMinutes: 0, longestFocus: 0,
      studyMinutes: 0, photos: 0, breathing: 0, journals: 0, unlockMinutes: 0, unlocks: 0, failedFocus: 0,
    };
  }
  return state.history[k];
}

function addLog(state, entry, now) {
  state.log.push({ t: now, ...entry });
  if (state.log.length > LOG_LIMIT) state.log = state.log.slice(-LOG_LIMIT);
}

// ---------- buddy: energy, level, mood ----------
export function tickEnergy(state, now = Date.now()) {
  const hours = (now - (state.lastEnergyTick || now)) / HOUR;
  if (hours >= 1) {
    state.energy = clamp(state.energy - Math.floor(hours) * 0.5, 0, 100);
    state.lastEnergyTick = now - ((hours % 1) * HOUR);
  }
}

export function addEnergy(state, amount) {
  state.energy = clamp(Math.round((state.energy + amount) * 10) / 10, 0, 100);
}

export function level(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1;
}

export function levelProgress(xp) {
  const l = level(xp);
  const lo = 40 * (l - 1) ** 2;
  const hi = 40 * l ** 2;
  return { level: l, pct: (xp - lo) / (hi - lo), toNext: hi - xp };
}

export function mood(energy) {
  if (energy < 20) return 'rotten';
  if (energy < 45) return 'tired';
  if (energy < 70) return 'ok';
  if (energy < 90) return 'happy';
  return 'buff';
}

export const MOOD_TEXT = {
  rotten: 'Mózgol gnije od scrollowania. Zrób coś w realu!',
  tired: 'Mózgol jest zmęczony. Krótki nawyk postawi go na nogi.',
  ok: 'Mózgol daje radę. Jeszcze jeden nawyk?',
  happy: 'Mózgol jest zadowolony i skupiony!',
  buff: 'Mózgol jest napakowany. Jesteś w formie!',
};

// ---------- streaks ----------
export function refreshStreak(state, now = Date.now()) {
  const { lastDay } = state.streak;
  if (!lastDay) return;
  if (lastDay !== dayKey(now) && lastDay !== dayKey(now - DAY)) state.streak.current = 0;
}

// Returns a milestone number when one is reached for the first time.
function bumpStreak(state, now) {
  const t = dayKey(now);
  if (state.streak.lastDay === t) return null;
  state.streak.current = state.streak.lastDay === dayKey(now - DAY) ? state.streak.current + 1 : 1;
  state.streak.lastDay = t;
  state.streak.best = Math.max(state.streak.best, state.streak.current);
  const m = STREAK_MILESTONES.find((x) => x === state.streak.current);
  if (m && !state.milestonesSeen.includes(m)) {
    state.milestonesSeen.push(m);
    const bonus = m * 2;
    state.coins += bonus;
    today(state, now).earned += bonus;
    addLog(state, { kind: 'streak', title: `Seria ${m} dni!`, coins: bonus }, now);
    return { days: m, bonus };
  }
  return null;
}

// ---------- habits ----------
export function allHabits(state) {
  return [...HABIT_PRESETS, ...state.customHabits];
}

export function findHabit(state, id) {
  return allHabits(state).find((h) => h.id === id);
}

export function habitReward(state, habit, minutes) {
  if (habit.type === 'photo' || habit.type === 'journal') return habit.coins || 10;
  const m = minutes ?? habit.minutes ?? 10;
  return Math.max(1, Math.round(m * state.settings.timerCoinsPerMin));
}

function earn(state, coins, now) {
  state.coins += coins;
  state.xp += coins;
  today(state, now).earned += coins;
  addEnergy(state, Math.min(25, coins / 2));
}

// kind-specific counters are bumped by the caller; this handles coins, streak, log.
export function completeHabit(state, habit, { minutes, photo, text } = {}, now = Date.now()) {
  const coins = habitReward(state, habit, minutes);
  const d = today(state, now);
  earn(state, coins, now);
  d.habitsDone += 1;
  const mins = habit.type === 'timer' || habit.type === 'breathing' ? (minutes ?? habit.minutes ?? 0) : 0;
  d.habitMinutes += mins;
  if (habit.cat === 'study') d.studyMinutes += mins;
  if (habit.type === 'breathing') d.breathing += 1;
  if (habit.type === 'journal') {
    d.journals += 1;
    if (text) state.journal.push({ t: now, habitId: habit.id, text });
  }
  if (photo) {
    d.photos += 1;
    state.photos.push({ t: now, habitId: habit.id, name: habit.name, data: photo });
    if (state.photos.length > PHOTO_LIMIT) state.photos = state.photos.slice(-PHOTO_LIMIT);
  }
  addLog(state, { kind: 'habit', title: `${habit.emoji} ${habit.name}`, coins, minutes: mins }, now);
  const milestone = bumpStreak(state, now);
  return { coins, milestone };
}

export function addCustomHabit(state, h) {
  const name = String(h.name || '').trim().slice(0, 40);
  if (!name) throw new Error('Podaj nazwę nawyku');
  const type = ['timer', 'photo'].includes(h.type) ? h.type : 'timer';
  const habit = {
    id: `custom-${Date.now().toString(36)}`,
    name,
    emoji: String(h.emoji || '⭐').slice(0, 4),
    cat: h.cat || 'study',
    type,
    custom: true,
  };
  if (type === 'timer') habit.minutes = clamp(Math.round(Number(h.minutes) || 15), 1, 240);
  else habit.coins = clamp(Math.round(Number(h.coins) || 10), 1, 100);
  state.customHabits.push(habit);
  return habit;
}

export function removeCustomHabit(state, id) {
  state.customHabits = state.customHabits.filter((h) => h.id !== id);
}

// ---------- focus sessions ----------
export function focusReward(state, minutes, strict) {
  const base = minutes * state.settings.timerCoinsPerMin * state.settings.focusBonus;
  return Math.round(strict ? base * 1.5 : base);
}

export function completeFocus(state, { type, minutes, strict }, now = Date.now()) {
  const coins = focusReward(state, minutes, strict);
  const d = today(state, now);
  earn(state, coins, now);
  d.focusMinutes += minutes;
  d.longestFocus = Math.max(d.longestFocus, minutes);
  if (type === 'study' || type === 'read') d.studyMinutes += minutes;
  addLog(state, { kind: 'focus', title: `Sesja: ${type}${strict ? ' (lock-in)' : ''}`, coins, minutes }, now);
  const milestone = bumpStreak(state, now);
  return { coins, milestone };
}

export function failFocus(state, { type, minutes }, now = Date.now()) {
  today(state, now).failedFocus += 1;
  addEnergy(state, -10);
  addLog(state, { kind: 'fail', title: `Przerwana sesja: ${type}`, coins: 0, minutes }, now);
}

// ---------- unlocking ----------
export function isWeekend(now = Date.now()) {
  const d = new Date(now).getDay();
  return d === 0 || d === 6;
}

export function currentDifficulty(state, now = Date.now()) {
  const id = isWeekend(now) && state.settings.weekendDifficulty ? state.settings.weekendDifficulty : state.settings.difficulty;
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];
}

export function unlockCost(state, minutes, now = Date.now()) {
  return minutes * currentDifficulty(state, now).rate;
}

// Battery mode: daily allowance + minutes bought with today's earnings - minutes used today.
export function batteryLeft(state, now = Date.now()) {
  const d = today(state, now);
  const rate = currentDifficulty(state, now).rate;
  return Math.max(0, state.settings.batteryMinutes + Math.floor(d.earned / rate) - d.unlockMinutes);
}

export function balanceMinutes(state, now = Date.now()) {
  if (state.settings.mode === 'battery') return batteryLeft(state, now);
  return Math.floor(state.coins / currentDifficulty(state, now).rate);
}

export function canUnlock(state, minutes, now = Date.now()) {
  if (state.settings.mode === 'battery') {
    const left = batteryLeft(state, now);
    return { ok: left >= minutes, cost: minutes, unit: 'min', missing: Math.max(0, minutes - left) };
  }
  const cost = unlockCost(state, minutes, now);
  return { ok: state.coins >= cost, cost, unit: 'coins', missing: Math.max(0, cost - state.coins) };
}

export function unlockRemaining(state, now = Date.now()) {
  return Math.max(0, (state.unlock.until || 0) - now);
}

export function unlockApps(state, minutes, appId = '', now = Date.now()) {
  const check = canUnlock(state, minutes, now);
  if (!check.ok) return { ok: false, ...check };
  const d = today(state, now);
  if (state.settings.mode === 'coins') {
    state.coins -= check.cost;
    d.spent += check.cost;
  }
  d.unlockMinutes += minutes;
  d.unlocks += 1;
  addEnergy(state, -minutes / 2);
  const start = Math.max(now, state.unlock.until || 0);
  state.unlock = { until: start + minutes * 60e3, appId };
  addLog(state, { kind: 'unlock', title: `Odblokowano na ${minutes} min`, coins: -(state.settings.mode === 'coins' ? check.cost : 0), minutes }, now);
  return { ok: true, until: state.unlock.until, cost: check.cost };
}

export function relock(state) {
  state.unlock = { until: 0, appId: '' };
}

export function unlockShortcutUrl(state, until, scheme = '') {
  const text = `${shortcutDate(until)}|${scheme}`;
  return `shortcuts://run-shortcut?name=${encodeURIComponent(state.settings.unlockShortcut)}&input=text&text=${encodeURIComponent(text)}`;
}

// Math challenge: simple but annoying enough to break autopilot.
export function mathChallenge(rng = Math.random) {
  const a = 12 + Math.floor(rng() * 38);
  const b = 3 + Math.floor(rng() * 9);
  const c = 10 + Math.floor(rng() * 90);
  return { q: `${a} × ${b} + ${c}`, answer: a * b + c };
}

// ---------- quests ----------
export function ensureQuests(state, now = Date.now(), rng = Math.random) {
  const k = dayKey(now);
  if (state.quests.day === k) return;
  const pool = [...QUESTS];
  const ids = [];
  while (ids.length < 3 && pool.length) ids.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
  state.quests = { day: k, ids, claimed: [] };
}

export function questStatus(state, now = Date.now()) {
  ensureQuests(state, now);
  const d = today(state, now);
  const hour = new Date(now).getHours();
  return state.quests.ids.map((id) => {
    const q = QUESTS.find((x) => x.id === id);
    return { ...q, done: q.check(d, hour), claimed: state.quests.claimed.includes(id) };
  });
}

export function claimQuest(state, id, now = Date.now()) {
  const q = questStatus(state, now).find((x) => x.id === id);
  if (!q || !q.done || q.claimed) return 0;
  state.quests.claimed.push(id);
  earn(state, q.coins, now);
  addLog(state, { kind: 'quest', title: `Zadanie: ${q.text}`, coins: q.coins }, now);
  return q.coins;
}

// ---------- protected settings (delayed loosening) ----------
const RATE = { easy: 1, normal: 2, hard: 3 };

export function isLoosening(state, key, value) {
  const s = state.settings;
  switch (key) {
    case 'difficulty': return RATE[value] < RATE[s.difficulty];
    case 'weekendDifficulty': {
      const cur = RATE[s.weekendDifficulty || s.difficulty];
      return RATE[value || s.difficulty] < cur;
    }
    case 'batteryMinutes': return Number(value) > s.batteryMinutes;
    case 'mathChallenge': return s.mathChallenge && !value;
    case 'strictFocus': return s.strictFocus && !value;
    case 'changeDelayMin': return Number(value) < s.changeDelayMin;
    case 'mode': return value !== s.mode;
    case 'timerCoinsPerMin': return Number(value) > s.timerCoinsPerMin;
    case 'unblockApp': return true;
    default: return false;
  }
}

// Returns 'applied' or 'pending'.
export function requestSetting(state, key, value, now = Date.now()) {
  if (state.onboarded && state.settings.changeDelayMin > 0 && isLoosening(state, key, value)) {
    state.pending = state.pending.filter((p) => p.key !== key || key === 'unblockApp');
    state.pending.push({ key, value, applyAt: now + state.settings.changeDelayMin * 60e3 });
    return 'pending';
  }
  applySetting(state, key, value);
  return 'applied';
}

function applySetting(state, key, value) {
  if (key === 'unblockApp') state.blockedApps = state.blockedApps.filter((a) => a !== value);
  else if (key === 'blockApp') { if (!state.blockedApps.includes(value)) state.blockedApps.push(value); }
  else state.settings[key] = value;
}

export function applyPending(state, now = Date.now()) {
  const due = state.pending.filter((p) => p.applyAt <= now);
  due.forEach((p) => applySetting(state, p.key, p.value));
  state.pending = state.pending.filter((p) => p.applyAt > now);
  return due.length;
}

export function cancelPending(state, index) {
  state.pending.splice(index, 1);
}

// ---------- onboarding ----------
export function finishOnboarding(state, profile, now = Date.now()) {
  state.profile = { ...state.profile, ...profile, createdAt: now };
  state.onboarded = true;
  state.coins += 20; // starter coins, enough for one 10-minute unlock on normal
  state.xp += 20;
  addLog(state, { kind: 'quest', title: 'Bonus powitalny', coins: 20 }, now);
}

export function yearsOnPhone(hoursPerDay, age = 20) {
  const yearsLeft = Math.max(0, 80 - age);
  return Math.round(((hoursPerDay * 365 * yearsLeft) / (24 * 365)) * 10) / 10;
}

// ---------- stats ----------
export function weekStats(state, now = Date.now()) {
  return lastNDays(7, now).map((k) => ({ day: k, ...(state.history[k] || {}) }));
}

export function totals(state) {
  return Object.values(state.history).reduce((acc, d) => {
    acc.earned += d.earned || 0;
    acc.spent += d.spent || 0;
    acc.habits += d.habitsDone || 0;
    acc.focus += d.focusMinutes || 0;
    acc.habitMinutes += d.habitMinutes || 0;
    acc.unlockMinutes += d.unlockMinutes || 0;
    return acc;
  }, { earned: 0, spent: 0, habits: 0, focus: 0, habitMinutes: 0, unlockMinutes: 0 });
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
