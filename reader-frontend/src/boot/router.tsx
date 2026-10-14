import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, AuthGuard } from '@modules/auth/provider';
import { MotivationPreferencesProvider } from '@modules/core/preferences/motivation-preferences';
import { RouteErrorBoundary } from './route-error-boundary';
import { financePageRoute, habitsPageRoute, homePageRoute, loginPageRoute, readerPageWithIdRoute, readerPageRoute, vocabularyPageRoute, settingsPageRoute, tasksPageRoute } from './routes';

const HomePage = lazy(() => import('../modules/home/page'));
const NotFoundPage = lazy(() => import('../modules/home/not-found'));
const LoginPage = lazy(() => import('../modules/auth/login/page'));
const ReaderHome = lazy(() => import('../modules/reader/home'));
const VocabularyPage = lazy(() => import('../modules/reader/vocabulary/page'));
const PagePage = lazy(() => import('../modules/page/page'));
const SettingsPage = lazy(() => import('../modules/settings/page'));
const TasksPage = lazy(() => import('../modules/tasks/page'));
const FinancePage = lazy(() => import('../modules/finance/page'));
const HabitsPage = lazy(() => import('../modules/habits/page'));
const CalendarPage = lazy(() => import('../modules/calendar/page'));
const CapturesPage = lazy(() => import('../modules/reader/captures/page'));
const CaptureImportPage = lazy(() => import('../modules/reader/captures/import-page'));

/** Documents handle their own visibility so shared Reader pages remain public. */
export function ApplicationRoutes() {
    return <Routes>
        <Route path={homePageRoute} element={<HomePage />} />
        <Route path={readerPageWithIdRoute} element={<PagePage />} />
        <Route path={loginPageRoute} element={<LoginPage />} />
        <Route path={readerPageRoute} element={<AuthGuard><ReaderHome /></AuthGuard>} />
        <Route path="/reader/captures" element={<AuthGuard><CapturesPage /></AuthGuard>} />
        <Route path="/reader/capture" element={<AuthGuard><CaptureImportPage /></AuthGuard>} />
        <Route path={vocabularyPageRoute} element={<AuthGuard><VocabularyPage /></AuthGuard>} />
        <Route path={settingsPageRoute} element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path={tasksPageRoute} element={<AuthGuard><TasksPage /></AuthGuard>} />
        <Route path={financePageRoute} element={<AuthGuard><FinancePage /></AuthGuard>} />
        <Route path={habitsPageRoute} element={<AuthGuard><HabitsPage /></AuthGuard>} />
        <Route path="/calendar" element={<AuthGuard><CalendarPage /></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>;
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <AuthProvider>
              <MotivationPreferencesProvider>
                <RouteErrorBoundary><ApplicationRoutes /></RouteErrorBoundary>
              </MotivationPreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
