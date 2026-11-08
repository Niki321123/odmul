import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/js/store.js';

const MON = new Date('2026-11-09T10:00:00').getTime(); // Monday
const SAT = new Date('2026-11-14T10:00:00').getTime(); // Saturday
const DAY = 24 * 3600e3;
const walk = { id: 'walk', name: 'Spacer', emoji: '🚶', cat: 'body', type: 'timer', minutes: 20 };
const study = { id: 'study-block', name: 'Nauka', emoji: '📖', cat: 'study', type: 'timer', minutes: 25 };
const dishes = { id: 'dishes', name: 'Naczynia', emoji: '🍽️', cat: 'home', type: 'photo', coins: 15 };

function fresh() {
  const s = S.defaultState(MON);
  s.onboarded = true;
  return s;
}

test('timer habit pays 1 coin per minute and counts study minutes', () => {
  const s = fresh();
  const r = S.completeHabit(s, study, { minutes: 30 }, MON);
  assert.equal(r.coins, 30);
  assert.equal(s.coins, 30);
  const d = S.today(s, MON);
  assert.equal(d.studyMinutes, 30);
  assert.equal(d.habitsDone, 1);
});

test('photo habit pays fixed reward and stores photo', () => {
  const s = fresh();
  S.completeHabit(s, dishes, { photo: 'data:image/jpeg;base64,xx' }, MON);
  assert.equal(s.coins, 15);
  assert.equal(s.photos.length, 1);
});

test('normal difficulty: 20 coins buys 10 minutes', () => {
  const s = fresh();
  s.coins = 20;
  assert.equal(S.unlockCost(s, 10, MON), 20);
  const r = S.unlockApps(s, 10, 'tiktok', MON);
  assert.ok(r.ok);
  assert.equal(s.coins, 0);
  assert.equal(S.unlockRemaining(s, MON), 10 * 60e3);
});

test('unlock fails without enough coins and reports missing amount', () => {
  const s = fresh();
  s.coins = 5;
  const r = S.unlockApps(s, 10, '', MON);
  assert.equal(r.ok, false);
  assert.equal(r.missing, 15);
  assert.equal(s.coins, 5);
});

test('consecutive unlocks stack time', () => {
  const s = fresh();
  s.coins = 100;
  S.unlockApps(s, 5, '', MON);
  S.unlockApps(s, 5, '', MON + 60e3);
  assert.equal(s.unlock.until, MON + 10 * 60e3);
});

test('weekend difficulty overrides weekday rate', () => {
  const s = fresh();
  s.settings.weekendDifficulty = 'easy';
  assert.equal(S.unlockCost(s, 10, MON), 20);
  assert.equal(S.unlockCost(s, 10, SAT), 10);
});

test('battery mode: allowance + earned minutes - used minutes', () => {
  const s = fresh();
  s.settings.mode = 'battery';
  s.settings.batteryMinutes = 30;
  assert.equal(S.batteryLeft(s, MON), 30);
  S.completeHabit(s, walk, { minutes: 20 }, MON); // 20 coins -> 10 min at normal rate
  assert.equal(S.batteryLeft(s, MON), 40);
  const coinsBefore = s.coins;
  assert.ok(S.unlockApps(s, 15, '', MON).ok);
  assert.equal(S.batteryLeft(s, MON), 25);
  assert.equal(s.coins, coinsBefore, 'battery mode does not spend coins');
  assert.equal(S.unlockApps(s, 30, '', MON).ok, false);
});

test('streak grows on consecutive days, resets after a gap, pays milestone bonus', () => {
  const s = fresh();
  S.completeHabit(s, walk, {}, MON);
  S.completeHabit(s, walk, {}, MON + DAY);
  const r = S.completeHabit(s, walk, {}, MON + 2 * DAY);
  assert.equal(s.streak.current, 3);
  assert.deepEqual(r.milestone, { days: 3, bonus: 6 });
  S.refreshStreak(s, MON + 5 * DAY);
  assert.equal(s.streak.current, 0);
  assert.equal(s.streak.best, 3);
  S.completeHabit(s, walk, {}, MON + 5 * DAY);
  assert.equal(s.streak.current, 1);
});

test('two habits on the same day count once for the streak', () => {
  const s = fresh();
  S.completeHabit(s, walk, {}, MON);
  S.completeHabit(s, study, {}, MON + 3600e3);
  assert.equal(s.streak.current, 1);
});

test('focus session pays bonus, lock-in pays more, failure drains energy', () => {
  const s = fresh();
  assert.equal(S.focusReward(s, 25, false), 38); // 25 * 1.5 = 37.5 -> 38
  assert.equal(S.focusReward(s, 25, true), 56); // 37.5 * 1.5 = 56.25 -> 56
  const e = s.energy;
  S.failFocus(s, { type: 'study', minutes: 3 }, MON);
  assert.equal(s.energy, e - 10);
  S.completeFocus(s, { type: 'study', minutes: 25, strict: true }, MON);
  assert.equal(S.today(s, MON).studyMinutes, 25);
  assert.equal(S.today(s, MON).longestFocus, 25);
});

test('loosening settings is delayed, tightening applies immediately', () => {
  const s = fresh();
  assert.equal(S.requestSetting(s, 'difficulty', 'hard', MON), 'applied');
  assert.equal(s.settings.difficulty, 'hard');
  assert.equal(S.requestSetting(s, 'difficulty', 'easy', MON), 'pending');
  assert.equal(s.settings.difficulty, 'hard');
  assert.equal(S.applyPending(s, MON + 4 * 60e3), 0);
  assert.equal(S.applyPending(s, MON + 5 * 60e3), 1);
  assert.equal(s.settings.difficulty, 'easy');
});

test('unblocking an app is delayed', () => {
  const s = fresh();
  assert.equal(S.requestSetting(s, 'unblockApp', 'tiktok', MON), 'pending');
  assert.ok(s.blockedApps.includes('tiktok'));
  S.applyPending(s, MON + 6 * 60e3);
  assert.ok(!s.blockedApps.includes('tiktok'));
});

test('settings apply immediately before onboarding is finished', () => {
  const s = S.defaultState(MON);
  assert.equal(S.requestSetting(s, 'difficulty', 'easy', MON), 'applied');
});

test('quests: 3 per day, claim only when done, only once', () => {
  const s = fresh();
  let i = 0;
  const seq = [0, 0, 0];
  S.ensureQuests(s, MON, () => seq[i++] ?? 0);
  assert.equal(s.quests.ids.length, 3);
  assert.equal(s.quests.ids[0], 'two-habits');
  assert.equal(S.claimQuest(s, 'two-habits', MON), 0);
  S.completeHabit(s, walk, {}, MON);
  S.completeHabit(s, dishes, { photo: 'x' }, MON);
  const before = s.coins;
  assert.equal(S.claimQuest(s, 'two-habits', MON), 15);
  assert.equal(s.coins, before + 15);
  assert.equal(S.claimQuest(s, 'two-habits', MON), 0);
});

test('energy: habits raise it, unlocking lowers it, idle hours decay it', () => {
  const s = fresh();
  s.energy = 50;
  S.completeHabit(s, walk, { minutes: 20 }, MON); // +10
  assert.equal(s.energy, 60);
  s.coins = 100;
  S.unlockApps(s, 10, '', MON); // -5
  assert.equal(s.energy, 55);
  s.lastEnergyTick = MON;
  S.tickEnergy(s, MON + 4 * 3600e3);
  assert.equal(s.energy, 53);
  assert.equal(S.mood(10), 'rotten');
  assert.equal(S.mood(95), 'buff');
});

test('custom habit validation', () => {
  const s = fresh();
  assert.throws(() => S.addCustomHabit(s, { name: '  ' }));
  const h = S.addCustomHabit(s, { name: 'Matma', type: 'timer', minutes: 9999 });
  assert.equal(h.minutes, 240);
  assert.ok(S.findHabit(s, h.id));
  S.removeCustomHabit(s, h.id);
  assert.equal(S.findHabit(s, h.id), undefined);
});

test('shortcut URL carries date and app scheme', () => {
  const s = fresh();
  const until = new Date('2026-11-09T18:30:05').getTime();
  const url = S.unlockShortcutUrl(s, until, 'tiktok://');
  assert.ok(url.startsWith('shortcuts://run-shortcut?name=Odmul%20Odblokuj&input=text&text='));
  assert.equal(decodeURIComponent(url.split('text=')[1]), '2026-11-09 18:30:05|tiktok://');
});

test('persistence round-trip and import validation', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = fresh();
  s.coins = 42;
  S.save(storage, s);
  assert.equal(S.load(storage).coins, 42);
  assert.equal(S.importState(S.exportState(s)).coins, 42);
  assert.throws(() => S.importState('{"version":99}'));
  assert.equal(S.load({ getItem: () => '{broken' }).coins, 0);
});

test('math challenge answer is consistent', () => {
  const c = S.mathChallenge(() => 0.5);
  assert.equal(c.q, '31 × 7 + 55');
  assert.equal(c.answer, 31 * 7 + 55);
});
