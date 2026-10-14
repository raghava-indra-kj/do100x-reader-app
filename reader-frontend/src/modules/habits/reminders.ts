import { dayStatus, localDate, localTime, planOn, scheduled, weekProgress, type Habit } from '@reader/habit-core';

export function dueReminders(habits: Habit[], now: Date) {
  return habits.flatMap(habit => {
    const date = localDate(habit.timezone, now), time = localTime(habit.timezone, now), plan = planOn(habit, date);
    if (!plan || habit.archivedAt || !scheduled(habit, date) || ['done', 'skipped'].includes(dayStatus(habit, date, date))) return [];
    if (plan.frequency === 'WEEKLY') { const progress = weekProgress(habit, date, date); if (progress.done >= progress.target) return []; }
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    return plan.reminders.filter(reminder => minutes(time) >= minutes(reminder) && minutes(time) - minutes(reminder) < 2).map(reminder => ({ habit, date, time: reminder, key: `${habit.id}/${date}/${reminder}` }));
  });
}
