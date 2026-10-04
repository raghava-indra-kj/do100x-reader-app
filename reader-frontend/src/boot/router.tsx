import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, AuthGuard } from '@modules/auth/provider';
import { MotivationPreferencesProvider } from '@modules/core/preferences/motivation-preferences';
import { financePageRoute, homePageRoute, loginPageRoute, readerPageWithIdRoute, readerPageRoute, settingsPageRoute, tasksPageRoute } from './routes';

const HomePage = lazy(() => import('../modules/home/page'));
const NotFoundPage = lazy(() => import('../modules/home/not-found'));
const LoginPage = lazy(() => import('../modules/auth/login/page'));
const ReaderHome = lazy(() => import('../modules/reader/home'));
const PagePage = lazy(() => import('../modules/page/page'));
const SettingsPage = lazy(() => import('../modules/settings/page'));
const TasksPage = lazy(() => import('../modules/tasks/page'));
const FinancePage = lazy(() => import('../modules/finance/page'));

/** Documents handle their own visibility so shared Reader pages remain public. */
export function ApplicationRoutes() {
    return <Routes>
        <Route path={homePageRoute} element={<HomePage />} />
        <Route path={readerPageWithIdRoute} element={<PagePage />} />
        <Route path={loginPageRoute} element={<LoginPage />} />
        <Route path={readerPageRoute} element={<AuthGuard><ReaderHome /></AuthGuard>} />
        <Route path={settingsPageRoute} element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path={tasksPageRoute} element={<AuthGuard><TasksPage /></AuthGuard>} />
        <Route path={financePageRoute} element={<AuthGuard><FinancePage /></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>;
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <AuthProvider>
              <MotivationPreferencesProvider>
                <ApplicationRoutes />
              </MotivationPreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
