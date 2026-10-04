import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, AuthGuard } from '@modules/auth/provider';
import { MotivationPreferencesProvider } from '@modules/core/preferences/motivation-preferences';
import { homePageRoute, loginPageRoute, mdParserLibDemoRoute, mdViewLibDemoRoute, pagesPageWithIdRoute, readerPageRoute, settingsPageRoute, tasksPageRoute } from './routes';

const HomePage = lazy(() => import('../modules/home/page'));
const MdViewLibDemoPage = lazy(() => import('../lib/md-view-demo'));
const MdParserLibDemoPage = lazy(() => import('../lib/md-parser/demo-page'));
const LoginPage = lazy(() => import('../modules/auth/login/page'));
const ReaderHome = lazy(() => import('../modules/reader/home'));
const PagePage = lazy(() => import('../modules/page/page'));
const SettingsPage = lazy(() => import('../modules/settings/page'));
const TasksPage = lazy(() => import('../modules/tasks/page'));

export function AppRouter() {
    return (
        <BrowserRouter>
            <AuthProvider>
              <MotivationPreferencesProvider>
                <Routes>
                    <Route path={homePageRoute} element={<HomePage />} />
                    <Route path={pagesPageWithIdRoute} element={<PagePage />} />
                    <Route path={mdViewLibDemoRoute} element={<MdViewLibDemoPage />} />
                    <Route path={mdParserLibDemoRoute} element={<MdParserLibDemoPage />} />
                    <Route path={loginPageRoute} element={<LoginPage />} />
                    <Route path={readerPageRoute} element={<AuthGuard><ReaderHome /></AuthGuard>} />
                    <Route path={settingsPageRoute} element={<AuthGuard><SettingsPage /></AuthGuard>} />
                    <Route path={tasksPageRoute} element={<AuthGuard><TasksPage /></AuthGuard>} />
                </Routes>
              </MotivationPreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
