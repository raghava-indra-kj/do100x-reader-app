import { AppRouter } from '@boot/router';
import { loadEnv } from '@core/models/env';
import '@di/container';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import { ThemeProvider } from '@modules/core/theme';
import { ToastProvider } from '@modules/core/ui/primitives/toast';
import { TooltipProvider } from '@modules/core/ui/primitives/tooltip';
import '@styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'reflect-metadata';

async function main() {
    const rootElement = document.getElementById('root')!;
    await loadEnv();
    createRoot(rootElement).render(
        <StrictMode>
            <ThemeProvider>
                <ToastProvider>
                    <TooltipProvider delay={400}>
                        <AppRouter />
                    </TooltipProvider>
                </ToastProvider>
            </ThemeProvider>
        </StrictMode>
    );
}

main();
