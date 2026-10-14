/** Calendar dates stay as YYYY-MM-DD strings. Never interpret them in machine-local time. */
export type HabitFrequency = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'INTERVAL';
export type HabitGoal = 'CHECK' | 'COUNT';
export type HabitPlan = {
  id: string; effectiveFrom: string; startDate: string; endDate: string | null;
  frequency: HabitFrequency; weekdays: number[]; intervalDays: number; weeklyTarget: number;
  goalType: HabitGoal; target: number; unit: string; step: number; reminders: string[];
};
export type HabitLog = {
  id: string; habitId: string; date: string; value: number; status: 'RECORDED' | 'SKIPPED' | 'NONE';
  note: string; mood: number | null; version: number; createdAt: string; updatedAt: string;
};
export type Habit = {
  id: string; name: string; description: string; icon: string; color: string; section: string;
  timezone: string; sortOrder: number; version: number; archivedAt: string | null;
  pauses: { from: string; to: string | null }[]; plans: HabitPlan[]; logs: HabitLog[];
  createdAt: string; updatedAt: string;
};
export type HabitDraft = Pick<Habit, 'name' | 'description' | 'icon' | 'color' | 'section' | 'timezone'> & {
  plan: Omit<HabitPlan, 'id' | 'effectiveFrom'>;
};
export const HABIT_COLORS = ['orange', 'green', 'blue', 'violet', 'rose', 'teal'] as const;
export const HABIT_ICONS = ['sprout', 'book', 'water', 'walk', 'moon', 'sun', 'heart', 'brain', 'pen', 'dumbbell', 'coffee', 'music'] as const;
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY = 86_400_000;

export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(date: string, amount: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + amount * DAY).toISOString().slice(0, 10);
}
export function dayDiff(from: string, to: string): number { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY); }
export function weekday(date: string): number { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
export function monday(date: string): string { return addDays(date, -((weekday(date) + 6) % 7)); }
export function dateRange(from: string, to: string): string[] {
  const length = dayDiff(from, to) + 1;
  if (length < 0 || length > 36_600) throw new Error('Date range is too large.');
  return Array.from({ length }, (_, index) => addDays(from, index));
}
export function localDate(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function localTime(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
export function planOn(habit: Pick<Habit, 'plans'>, date: string): HabitPlan | undefined {
  return habit.plans.filter(plan => plan.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function scheduled(habit: Pick<Habit, 'plans' | 'pauses'>, date: string): boolean {
  const plan = planOn(habit, date);
  if (!plan || date < plan.startDate || (plan.endDate && date > plan.endDate)) return false;
  if (habit.pauses.some(pause => date >= pause.from && (!pause.to || date < pause.to))) return false;
  if (plan.frequency === 'WEEKDAYS') return plan.weekdays.includes(weekday(date));
  if (plan.frequency === 'INTERVAL') return dayDiff(plan.startDate, date) % plan.intervalDays === 0;
  return true;
}
export type DayStatus = 'done' | 'partial' | 'skipped' | 'missed' | 'pending' | 'available' | 'off' | 'future';
export function dayStatus(habit: Habit, date: string, today = localDate(habit.timezone)): DayStatus {
  const log = habit.logs.find(item => item.date === date), plan = planOn(habit, date);
  if (date > today) return 'future';
  if (log?.status === 'SKIPPED') return 'skipped';
  if (log?.status === 'RECORDED' && plan && log.value >= plan.target) return 'done';
  if (log?.status === 'RECORDED' && log.value > 0) return 'partial';
  if (!scheduled(habit, date)) return 'off';
  if (plan?.frequency === 'WEEKLY' && date < today) return 'available';
  return date < today ? 'missed' : 'pending';
}
export function weekProgress(habit: Habit, date: string, today = localDate(habit.timezone)) {
  const start = monday(date), end = addDays(start, 6), plan = planOn(habit, date);
  const days = dateRange(start, end).filter(day => scheduled(habit, day));
  return { done: days.filter(day => dayStatus(habit, day, today) === 'done').length, target: Math.min(plan?.weeklyTarget ?? 1, days.length), start, end };
}
export function scheduleLabel(plan: HabitPlan): string {
  if (plan.frequency === 'DAILY') return 'Every day';
  if (plan.frequency === 'WEEKLY') return `${plan.weeklyTarget} days a week`;
  if (plan.frequency === 'INTERVAL') return `Every ${plan.intervalDays} days`;
  return plan.weekdays.map(day => WEEKDAYS[day]).join(', ');
}
export function goalLabel(plan: HabitPlan): string { return plan.goalType === 'CHECK' ? 'Once a day' : `${plan.target} ${plan.unit} a day`; }
export function quantityLabel(value: number, unit: string) {
  const singular: Record<string, string> = { pages: 'page', glasses: 'glass', minutes: 'minute', hours: 'hour', words: 'word', steps: 'step', 'check-ins': 'check-in' };
  return `${value.toLocaleString()} ${value === 1 ? singular[unit] ?? unit : unit}`;
}
export function roundValue(value: number): number { return Math.round((value + Number.EPSILON) * 1000) / 1000; }

/** Keep unlike quantities separate when a habit changes from, for example, pages to minutes. */
export function quantityTotals(habit: Habit, today = localDate(habit.timezone)) {
  const totals = new Map<string, number>();
  for (const log of habit.logs) {
    const plan = planOn(habit, log.date);
    if (log.date > today || log.status !== 'RECORDED' || !plan || !log.value) continue;
    const unit = plan.goalType === 'CHECK' ? 'check-ins' : plan.unit;
    totals.set(unit, roundValue((totals.get(unit) ?? 0) + log.value));
  }
  return [...totals].map(([unit, value]) => ({ unit, value }));
}

/** An unfinished current day/week does not break a streak. Excused days neither add nor break it. */
export function habitStats(habit: Habit, today = localDate(habit.timezone)) {
  const current = planOn(habit, today) ?? habit.plans[0];
  if (!current) return { total: 0, currentStreak: 0, bestStreak: 0, streakUnit: 'days' as const, completionRate: 0, completed: 0, expected: 0 };
  const start = habit.plans.reduce((date, plan) => plan.startDate < date ? plan.startDate : date, current.startDate);
  const days = start <= today ? dateRange(start, today) : [];
  const completed = days.filter(day => dayStatus(habit, day, today) === 'done').length;
  const total = habit.logs.reduce((sum, log) => sum + (log.date <= today && log.status === 'RECORDED' ? log.value : 0), 0);
  const periods: { key: string; end: string; done: boolean; excused: boolean; expected: number; completed: number }[] = [];
  for (const date of days) {
    const plan = planOn(habit, date);
    if (!plan || !scheduled(habit, date)) continue;
    if (plan.frequency === 'WEEKLY') {
      const week = weekProgress(habit, date, today);
      if (periods.some(period => period.key === week.start)) continue;
      periods.push({ key: week.start, end: week.end, done: week.done >= week.target, excused: week.target === 0, expected: week.target, completed: Math.min(week.done, week.target) });
    } else {
      const status = dayStatus(habit, date, today);
      periods.push({ key: date, end: date, done: status === 'done', excused: status === 'skipped', expected: 1, completed: status === 'done' ? 1 : 0 });
    }
  }
  // Streak units follow the current frequency. A frequency change starts a new series.
  const lastDifferent = [...habit.plans].filter(plan => plan.effectiveFrom <= today && (plan.frequency === 'WEEKLY') !== (current.frequency === 'WEEKLY')).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const streakStart = lastDifferent ? habit.plans.filter(plan => plan.effectiveFrom > lastDifferent.effectiveFrom).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0]?.effectiveFrom ?? start : start;
  let currentStreak = 0, bestStreak = 0;
  for (const period of periods.filter(period => period.end >= streakStart)) {
    if (period.excused) continue;
    if (period.done) { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
    else if (period.end < today) currentStreak = 0;
  }
  const counted = periods.filter(period => !period.excused && (period.end < today || period.done));
  const expected = counted.reduce((sum, period) => sum + period.expected, 0);
  const earned = counted.reduce((sum, period) => sum + period.completed, 0);
  return { total: roundValue(total), currentStreak, bestStreak, streakUnit: current.frequency === 'WEEKLY' ? 'weeks' as const : 'days' as const, completionRate: expected ? Math.round(earned / expected * 100) : 0, completed, expected };
}

export const HABIT_TEMPLATES = [
  { name: 'Read a little', description: 'Make room for an idea worth keeping.', icon: 'book', color: 'orange', section: 'Learning', target: 2, unit: 'pages', step: 1 },
  { name: 'Drink water', description: 'A glass at a time.', icon: 'water', color: 'blue', section: 'Health', target: 8, unit: 'glasses', step: 1 },
  { name: 'Go for a walk', description: 'Step outside and move.', icon: 'walk', color: 'green', section: 'Movement', target: 20, unit: 'minutes', step: 5 },
  { name: 'Quiet time', description: 'A few minutes to pause.', icon: 'brain', color: 'violet', section: 'Mind', target: 5, unit: 'minutes', step: 1 },
  { name: 'Write a journal', description: 'One thought is enough.', icon: 'pen', color: 'teal', section: 'Mind', target: 1, unit: '', step: 1 },
  { name: 'Exercise', description: 'Start small and keep showing up.', icon: 'dumbbell', color: 'rose', section: 'Movement', target: 20, unit: 'minutes', step: 5 },
  { name: 'Sleep on time', description: 'Give tomorrow a good start.', icon: 'moon', color: 'violet', section: 'Health', target: 1, unit: '', step: 1 },
  { name: 'Learn new words', description: 'A small addition to your vocabulary.', icon: 'book', color: 'blue', section: 'Learning', target: 5, unit: 'words', step: 1 },
  { name: 'Practice music', description: 'Keep your practice simple.', icon: 'music', color: 'rose', section: 'Creative', target: 10, unit: 'minutes', step: 5 },
  { name: 'Morning stretch', description: 'Ease into the day.', icon: 'sun', color: 'orange', section: 'Movement', target: 1, unit: '', step: 1 },
  { name: 'Connect with someone', description: 'Make time for a meaningful conversation.', icon: 'heart', color: 'rose', section: 'Personal', target: 1, unit: '', step: 1 },
  { name: 'Plan tomorrow', description: 'Choose one thing that matters.', icon: 'sprout', color: 'green', section: 'Personal', target: 1, unit: '', step: 1 },
] as const;
