import { CalendarIcon, FinanceIcon, HabitsIcon, ReaderIcon, TasksIcon } from '@modules/core/branding';
import { calendarPageRoute, financePageRoute, habitsPageRoute, readerPageRoute, tasksPageRoute } from '@boot/routes';

/** One navigation catalog for the suite launcher and every workspace switcher. */
export const suiteApps = [
    { id: 'reader', name: 'Reader', route: readerPageRoute, icon: ReaderIcon, description: 'Read and organize your pages.' },
    { id: 'finance', name: 'Finance', route: financePageRoute, icon: FinanceIcon, description: 'Track spending and upcoming bills.' },
    { id: 'tasks', name: 'Tasks', route: tasksPageRoute, icon: TasksIcon, description: 'Plan tasks and track your time.' },
    { id: 'calendar', name: 'Calendar', route: calendarPageRoute, icon: CalendarIcon, description: 'Make time for tasks, events and habits.' },
    { id: 'habits', name: 'Habits', route: habitsPageRoute, icon: HabitsIcon, description: 'Build routines and see your progress.' },
] as const;

export function activeSuiteApp(pathname: string) {
    return suiteApps.find(app => pathname === app.route || pathname.startsWith(`${app.route}/`));
}
