import { BookOpen, ListTodo, Wallet } from 'lucide-react';
import { financePageRoute, readerPageRoute, tasksPageRoute } from '@boot/routes';

/** One navigation catalog for the suite launcher and every workspace switcher. */
export const suiteApps = [
    { id: 'reader', name: 'Reader', route: readerPageRoute, icon: BookOpen, description: 'Read and organize your pages.' },
    { id: 'finance', name: 'Finance', route: financePageRoute, icon: Wallet, description: 'Track spending and upcoming bills.' },
    { id: 'tasks', name: 'Tasks', route: tasksPageRoute, icon: ListTodo, description: 'Plan tasks and track your time.' },
] as const;

export function activeSuiteApp(pathname: string) {
    return suiteApps.find(app => pathname === app.route || pathname.startsWith(`${app.route}/`));
}
