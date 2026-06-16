import { loginPageRoute, pagesPageWithIdRouteValue } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { BookMarked, BookOpen, Brain, Eye, Lightbulb } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';

const features = [
    {
        icon: BookOpen,
        title: 'Small, gentle parts',
        description: 'Long text broken into bite-sized pieces.',
    },
    {
        icon: Eye,
        title: 'Easy on your eyes',
        description: 'Clean, soft layout that keeps eyes fresh.',
    },
    {
        icon: BookMarked,
        title: 'Instant word meanings',
        description: 'Tap any word — see its meaning instantly.',
    },
    {
        icon: Lightbulb,
        title: 'Help when stuck',
        description: 'AI explains with real-world examples.',
    },
    {
        icon: Brain,
        title: 'Remember what you read',
        description: 'Quizzes lock learning in after each part.',
    },
];

function HeroSection() {
    const navigate = useNavigate();
    const authStore = useAuthStore();

    return (
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
            <div className="flex max-w-xl flex-col items-center gap-6 text-center">
                <img src="/logo.png" alt="Reader" className="h-14 w-14 sm:h-16 sm:w-16" />
                <div className="flex flex-col items-center gap-1.5">
                    <h1 className="font-[family-name:var(--font-serif)] text-4xl font-bold tracking-tight text-[var(--color-text-strong)] sm:text-5xl">
                        Reader
                    </h1>
                    <p className="font-[family-name:var(--font-serif)] text-base italic text-[var(--color-text-muted)] sm:text-lg">
                        Read, Organize, Revisit.
                    </p>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-[var(--color-text-body)] sm:text-base">
                    Reading long things is hard — eyes tire, words confuse, meaning slips away.
                    Reader breaks text into gentle parts, calms your eyes, explains the hard bits,
                    and helps you remember what matters.
                </p>
                <Observer>
                    {() => {
                        if (authStore.isAuthenticated) {
                            const redirectUrl = pagesPageWithIdRouteValue(authStore.currentUser.homepageId);
                            return <Button size="lg" onClick={() => navigate(redirectUrl)}>Open Reader</Button>;
                        }
                        return <Button size="lg" onClick={() => navigate(loginPageRoute)}>Open Reader</Button>;
                    }}
                </Observer>
            </div>
        </section>
    );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ size: number; className: string }>; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 transition-colors hover:border-[var(--color-border-default)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)]">
                <Icon size={16} className="text-[var(--color-brand-on-soft)]" />
            </div>
            <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold text-[var(--color-text-strong)] sm:text-sm">{title}</h3>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)] sm:text-sm">{description}</p>
            </div>
        </div>
    );
}

function FeaturesSection() {
    return (
        <section className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-4xl">
                <h2 className="mb-4 text-center font-[family-name:var(--font-serif)] text-lg font-semibold text-[var(--color-text-strong)] sm:mb-6 sm:text-xl">
                    Why Reader?
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default function HomePage() {
    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <AppBar />
            <div className="flex flex-1 flex-col overflow-y-auto">
                <HeroSection />
                <FeaturesSection />
            </div>
        </div>
    );
}
