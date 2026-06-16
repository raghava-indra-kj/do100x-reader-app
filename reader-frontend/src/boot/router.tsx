import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@modules/auth/provider';
import { homePageRoute, loginPageRoute, mdParserLibDemoRoute, mdViewLibDemoRoute, pagesPageWithIdRoute, signupPageRoute } from './routes';

const HomePage = lazy(() => import('../modules/home/page'));
const MdViewLibDemoPage = lazy(() => import('../lib/md-view/demo-page'));
const MdParserLibDemoPage = lazy(() => import('../lib/md-parser/demo-page'));
const LoginPage = lazy(() => import('../modules/auth/login/page'));
const SignupPage = lazy(() => import('../modules/auth/signup/page'));
const PagePage = lazy(() => import('../modules/page/page'));

export function AppRouter() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path={homePageRoute} element={<HomePage />} />
                    <Route path={pagesPageWithIdRoute} element={<PagePage />} />
                    <Route path={mdViewLibDemoRoute} element={<MdViewLibDemoPage />} />
                    <Route path={mdParserLibDemoRoute} element={<MdParserLibDemoPage />} />
                    <Route path={loginPageRoute} element={<LoginPage />} />
                    <Route path={signupPageRoute} element={<SignupPage />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}