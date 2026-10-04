import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseDialog } from '@modules/core/ui/primitives/dialog';
import { 
    X, 
    ChevronUp, 
    ChevronDown, 
    Shuffle, 
    Copy, 
    Check, 
    Sparkles, 
    Volume2, 
    VolumeX, 
    Lightbulb, 
    Quote as QuoteIcon,
    Coffee,
    BookOpen,
    DoorOpen,
    ArrowLeft,
    Wind
} from 'lucide-react';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { TimePerspectivePanel } from './time-perspective-panel';
import { DeepBreathPanel } from './deep-breath-panel';
import { useAuthStore } from '@modules/auth/provider/store';

export interface Motivation {
    quote: string;
    meaning: string;
    by: string;
}

const GRADIENT_THEMES = [
    { from: 'from-amber-500/20', via: 'via-orange-500/15', to: 'to-rose-500/25', accent: '#f97316', ring: 'border-orange-500/30' },
    { from: 'from-rose-500/20', via: 'via-pink-500/15', to: 'to-purple-500/25', accent: '#ec4899', ring: 'border-pink-500/30' },
    { from: 'from-indigo-500/20', via: 'via-blue-500/15', to: 'to-cyan-500/25', accent: '#6366f1', ring: 'border-indigo-500/30' },
    { from: 'from-teal-500/20', via: 'via-emerald-500/15', to: 'to-green-500/25', accent: '#10b981', ring: 'border-emerald-500/30' },
    { from: 'from-purple-500/20', via: 'via-violet-500/15', to: 'to-amber-500/25', accent: '#8b5cf6', ring: 'border-purple-500/30' },
    { from: 'from-sky-500/20', via: 'via-teal-500/15', to: 'to-indigo-500/25', accent: '#0ea5e9', ring: 'border-sky-500/30' },
];

const BREAK_QUOTES = [
    {
        quote: "Almost everything will work again if you unplug it for a few minutes, including you.",
        by: "Anne Lamott",
        advice: "Take a moment to stretch, get some water or rest your eyes."
    },
    {
        quote: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.",
        by: "Ralph Marston",
        advice: "If you’re tired, pause and come back later."
    },
    {
        quote: "Tension is who you think you should be. Relaxation is who you are.",
        by: "Chinese Proverb",
        advice: "You can finish for today. Your pages will be here when you return."
    },
    {
        quote: "Sometimes the most productive thing you can do is relax.",
        by: "Mark Black",
        advice: "Take a few minutes away from the screen."
    }
];

export interface MotivationReelsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MotivationReelsDialog({ open, onOpenChange }: MotivationReelsDialogProps) {
    const authStore = useAuthStore();
    const reelIndexKey = `motivation_reels_index:${authStore.optCurrentUser?.id ?? 'anonymous'}`;
    const [quotes, setQuotes] = useState<Motivation[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<'up' | 'down' | 'none'>('none');
    const [isAnimating, setIsAnimating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isTiredBreakMode, setIsTiredBreakMode] = useState(false);
    const [isDeepBreathMode, setIsDeepBreathMode] = useState(false);
    const [breakQuoteIndex, setBreakQuoteIndex] = useState(0);

    // Touch & Drag state
    const touchStartY = useRef<number | null>(null);
    const lastWheelTime = useRef<number>(0);

    // Load motivations
    useEffect(() => {
        if (!open) return;
        setIsTiredBreakMode(false);
        setIsDeepBreathMode(false);
        setBreakQuoteIndex(Math.floor(Math.random() * BREAK_QUOTES.length));
        fetch('/motivations.json')
            .then(res => res.json())
            .then((data: Motivation[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setQuotes(data);
                    const savedIdx = parseInt(localStorage.getItem(reelIndexKey) || '0', 10);
                    setCurrentIndex(savedIdx % data.length);
                }
            })
            .catch(err => console.error('Failed to load motivations:', err));
    }, [open, reelIndexKey]);

    // Handle speech cancellation on index change or close
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [currentIndex, open, isTiredBreakMode, isDeepBreathMode]);

    useEffect(() => () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const goToNext = useCallback(() => {
        if (quotes.length === 0 || isAnimating || isTiredBreakMode || isDeepBreathMode) return;
        setIsAnimating(true);
        setDirection('up');
        setTimeout(() => {
            setCurrentIndex(prev => {
                const next = (prev + 1) % quotes.length;
                localStorage.setItem(reelIndexKey, String(next));
                return next;
            });
            setIsAnimating(false);
        }, 220);
    }, [quotes.length, isAnimating, isTiredBreakMode, isDeepBreathMode, reelIndexKey]);

    const goToPrev = useCallback(() => {
        if (quotes.length === 0 || isAnimating || isTiredBreakMode || isDeepBreathMode) return;
        setIsAnimating(true);
        setDirection('down');
        setTimeout(() => {
            setCurrentIndex(prev => {
                const next = (prev - 1 + quotes.length) % quotes.length;
                localStorage.setItem(reelIndexKey, String(next));
                return next;
            });
            setIsAnimating(false);
        }, 220);
    }, [quotes.length, isAnimating, isTiredBreakMode, isDeepBreathMode, reelIndexKey]);

    const goToRandom = useCallback(() => {
        if (quotes.length <= 1 || isAnimating || isTiredBreakMode || isDeepBreathMode) return;
        setIsAnimating(true);
        setDirection('up');
        setTimeout(() => {
            let next = Math.floor(Math.random() * quotes.length);
            if (next === currentIndex) {
                next = (next + 1) % quotes.length;
            }
            setCurrentIndex(next);
            localStorage.setItem(reelIndexKey, String(next));
            setIsAnimating(false);
        }, 220);
    }, [quotes.length, isAnimating, currentIndex, isTiredBreakMode, isDeepBreathMode, reelIndexKey]);

    // Copy Quote to clipboard
    const handleCopy = useCallback(() => {
        const current = quotes[currentIndex];
        if (!current) return;
        const text = `"${current.quote}"\n— ${current.by}\n\n${current.meaning}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    }, [quotes, currentIndex]);

    // Text to Speech
    const handleToggleSpeech = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        if (isSpeaking) {
            synth.cancel();
            setIsSpeaking(false);
            return;
        }

        const current = quotes[currentIndex];
        if (!current) return;

        const textToRead = `${current.quote}. By ${current.by}. ${current.meaning}`;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synth.cancel();
        synth.speak(utterance);
        setIsSpeaking(true);
    }, [quotes, currentIndex, isSpeaking]);

    // Wheel listener for swipe feel
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (isTiredBreakMode || isDeepBreathMode) return;
        const now = Date.now();
        if (now - lastWheelTime.current < 450) return;
        if (Math.abs(e.deltaY) < 30) return;

        lastWheelTime.current = now;
        if (e.deltaY > 0) {
            goToNext();
        } else {
            goToPrev();
        }
    }, [goToNext, goToPrev, isTiredBreakMode, isDeepBreathMode]);

    // Touch swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (isTiredBreakMode || isDeepBreathMode) return;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (isTiredBreakMode || isDeepBreathMode || touchStartY.current === null) return;
        const diffY = touchStartY.current - e.changedTouches[0].clientY;
        touchStartY.current = null;

        if (Math.abs(diffY) > 50) {
            if (diffY > 0) {
                goToNext();
            } else {
                goToPrev();
            }
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!open || isDeepBreathMode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

            if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key.toLowerCase() === 'j') {
                e.preventDefault();
                goToNext();
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key.toLowerCase() === 'k') {
                e.preventDefault();
                goToPrev();
            } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 's') {
                e.preventDefault();
                goToRandom();
            } else if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCopy();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, goToNext, goToPrev, goToRandom, handleCopy, isDeepBreathMode]);

    if (!open) return null;

    const currentQuote = quotes[currentIndex];
    const currentTheme = GRADIENT_THEMES[currentIndex % GRADIENT_THEMES.length];
    const progressPercent = quotes.length > 0 ? Math.round(((currentIndex + 1) / quotes.length) * 100) : 0;
    const currentBreakQuote = BREAK_QUOTES[breakQuoteIndex % BREAK_QUOTES.length];

    return (
        <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
            <BaseDialog.Portal>
                {/* Backdrop */}
                <BaseDialog.Backdrop className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 animate-fade-in transition-opacity" />

                {/* Full-Screen Reels & Perspective Container */}
                <BaseDialog.Popup
                    className="fixed inset-0 z-50 flex flex-col w-full h-full max-w-full max-h-full outline-none pointer-events-auto bg-[var(--color-surface-canvas)] select-none overflow-hidden"
                >
                    {/* 1. TOP HEADER */}
                    <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)]/95 backdrop-blur-md shrink-0 w-full">
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] shadow-xs">
                                <Sparkles size={15} className="animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-xs sm:text-sm font-bold text-[var(--color-text-strong)] font-[family-name:var(--font-sans)] tracking-tight">
                                    Take a break
                                </h1>
                            </div>
                        </div>

                        {/* Top Action Controls */}
                        <div className="flex items-center gap-2">
                            {/* "Deep Breath" Button */}
                            <button
                                onClick={() => {
                                    setIsDeepBreathMode(prev => !prev);
                                    if (!isDeepBreathMode) {
                                        setIsTiredBreakMode(false);
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-xs ${
                                    isDeepBreathMode
                                        ? 'bg-sky-500 hover:bg-sky-600 text-white border-sky-400 shadow-sm'
                                        : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-strong)] border-[var(--color-border-default)] hover:border-sky-500/50'
                                }`}
                                title="Breathing break"
                            >
                                <Wind size={14} className={isDeepBreathMode ? 'text-white animate-pulse' : 'text-sky-400'} />
                                <span className="hidden sm:inline">Breathe</span>
                                <span className="sm:hidden">Breathe</span>
                            </button>

                            {/* "Take a Break" Soft Break Button */}
                            <button
                                onClick={() => {
                                    setIsTiredBreakMode(prev => !prev);
                                    if (!isTiredBreakMode) {
                                        setIsDeepBreathMode(false);
                                        setBreakQuoteIndex(Math.floor(Math.random() * BREAK_QUOTES.length));
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-xs ${
                                    isTiredBreakMode
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400 shadow-sm'
                                        : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-strong)] border-[var(--color-border-default)] hover:border-amber-500/50'
                                }`}
                                title="Take a break from the screen"
                            >
                                <Coffee size={14} className={isTiredBreakMode ? 'text-white animate-bounce' : 'text-amber-400'} />
                                <span className="hidden sm:inline">Take a break</span>
                                <span className="sm:hidden">Break</span>
                            </button>

                            {/* "Continue Reading" Button */}
                            <button
                                onClick={() => onOpenChange(false)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] transition-all cursor-pointer shadow-xs active:scale-95"
                                title="Resume reading"
                            >
                                <BookOpen size={13} />
                                <span>Back to reading</span>
                            </button>

                            <button
                                onClick={() => onOpenChange(false)}
                                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                                title="Close (Esc)"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </header>

                    {/* TOP REELS PROGRESS BAR */}
                    <div className="relative z-20 w-full h-1 bg-[var(--color-surface-soft)] shrink-0 overflow-hidden">
                        <div 
                            className="h-full bg-[var(--color-brand)] transition-all duration-300 ease-out" 
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* 2. MAIN 2-COLUMN SPLIT WORKSPACE */}
                    <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden w-full max-w-full">
                        {/* Left Column: Live Time Perspective Counters (5 cols) */}
                        <div className="lg:col-span-5 h-full overflow-y-auto overflow-x-hidden scrollbar-none border-b lg:border-b-0 lg:border-r border-[var(--color-border-default)] bg-[var(--color-surface-raised)]/30">
                            <TimePerspectivePanel />
                        </div>

                        {/* Right Column: Center Quote / Deep Breath Workspace (7 cols) */}
                        <div 
                            className="lg:col-span-7 h-full flex flex-col justify-between overflow-hidden relative select-none w-full max-w-full"
                            onWheel={handleWheel}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Dynamic ambient mesh glow inside overflow-hidden to prevent scrollbars */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                                <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br ${currentTheme.from} ${currentTheme.via} ${currentTheme.to} blur-3xl opacity-70 transition-all duration-700`} />
                                <div className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr ${currentTheme.from} ${currentTheme.via} ${currentTheme.to} blur-3xl opacity-60 transition-all duration-700`} />
                            </div>

                            {/* MAIN CENTER CONTENT (Quotes / Deep Breath / Break Screen) */}
                            <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-10 overflow-y-auto overflow-x-hidden scrollbar-none w-full">
                                {isDeepBreathMode ? (
                                    <DeepBreathPanel 
                                        onClose={() => onOpenChange(false)} 
                                        onBackToQuotes={() => setIsDeepBreathMode(false)} 
                                    />
                                ) : isTiredBreakMode ? (
                                    /* Rest & Permission to Step Away Screen */
                                    <div className="max-w-xl mx-auto w-full space-y-6 animate-fade-in text-center py-2">
                                        <div className="flex flex-col items-center gap-2.5">
                                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 shadow-sm">
                                                <Coffee size={28} />
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-strong)] font-[family-name:var(--font-sans)] tracking-tight">
                                                Time for a break
                                            </h2>
                                            <p className="text-xs text-[var(--color-text-muted)] max-w-md leading-relaxed">
                                                You can stop here and return when you’re ready.
                                            </p>
                                        </div>

                                        {/* Mindful Rest Quote Card */}
                                        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] backdrop-blur-md shadow-lg text-left space-y-3">
                                            <blockquote className="text-base sm:text-lg font-medium font-[family-name:var(--font-serif)] text-[var(--color-text-strong)] leading-relaxed italic">
                                                &ldquo;{currentBreakQuote.quote}&rdquo;
                                            </blockquote>
                                            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)]">
                                                <cite className="not-italic font-semibold text-[var(--color-text-strong)]">&mdash; {currentBreakQuote.by}</cite>
                                                <span className="text-[10px] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-full font-medium">Break</span>
                                            </div>
                                            <p className="text-xs text-[var(--color-text-body)] pt-1 leading-relaxed bg-[var(--color-surface-soft)]/60 p-2.5 rounded-xl border border-[var(--color-border-subtle)]">
                                                💡 {currentBreakQuote.advice}
                                            </p>
                                        </div>

                                        {/* Break Actions */}
                                        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                                            <button
                                                onClick={() => onOpenChange(false)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-strong)] font-semibold text-xs border border-[var(--color-border-default)] transition-all cursor-pointer shadow-xs"
                                            >
                                                <DoorOpen size={14} />
                                                <span>Take a break</span>
                                            </button>
                                            <button
                                                onClick={() => onOpenChange(false)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] font-bold text-xs transition-all cursor-pointer shadow-sm"
                                            >
                                                <BookOpen size={14} />
                                                <span>Back to reading</span>
                                            </button>
                                            <button
                                                onClick={() => setIsTiredBreakMode(false)}
                                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-all cursor-pointer"
                                            >
                                                <ArrowLeft size={13} />
                                                <span>Back to quotes</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Main Quote Card */
                                    <div 
                                        className={`
                                            max-w-xl mx-auto w-full transition-all duration-200 transform
                                            ${isAnimating && direction === 'up' ? '-translate-y-6 opacity-0 scale-95' : ''}
                                            ${isAnimating && direction === 'down' ? 'translate-y-6 opacity-0 scale-95' : ''}
                                            ${!isAnimating ? 'translate-y-0 opacity-100 scale-100' : ''}
                                        `}
                                    >
                                        {currentQuote ? (
                                            <div className="space-y-5 p-6 sm:p-8 rounded-3xl bg-[var(--color-surface-card)]/90 border border-[var(--color-border-default)] backdrop-blur-md shadow-xl">
                                                {/* Decorative Quote Badge & Counter */}
                                                <div className="flex items-center justify-between">
                                                    <div 
                                                        className="flex items-center justify-center w-9 h-9 rounded-2xl shadow-xs"
                                                        style={{ backgroundColor: `${currentTheme.accent}20`, color: currentTheme.accent }}
                                                    >
                                                        <QuoteIcon size={16} />
                                                    </div>
                                                    <span className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] px-2.5 py-0.5 rounded-full border border-[var(--color-border-subtle)]">
                                                        Quote #{currentIndex + 1}
                                                    </span>
                                                </div>

                                                <blockquote className="text-xl sm:text-2xl lg:text-3xl font-medium leading-relaxed font-[family-name:var(--font-serif)] text-[var(--color-text-strong)] tracking-tight">
                                                    &ldquo;{currentQuote.quote}&rdquo;
                                                </blockquote>

                                                {/* Author Row */}
                                                <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border-subtle)]">
                                                    <div 
                                                        className="flex items-center justify-center w-9 h-9 rounded-full font-bold text-xs shadow-xs"
                                                        style={{ backgroundColor: `${currentTheme.accent}25`, color: currentTheme.accent }}
                                                    >
                                                        {currentQuote.by.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <cite className="not-italic text-sm font-bold text-[var(--color-text-strong)] font-[family-name:var(--font-sans)]">
                                                            {currentQuote.by}
                                                        </cite>
                                                    </div>
                                                </div>

                                                {/* Practical Takeaway (Clean & Professional) */}
                                                <div className="p-4 rounded-2xl bg-[var(--color-surface-soft)]/90 border border-[var(--color-border-subtle)] backdrop-blur-sm space-y-1.5 shadow-sm">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] uppercase tracking-wider">
                                                        <Lightbulb size={13} />
                                                        <span>A thought to try</span>
                                                    </div>
                                                    <p className="text-xs sm:text-sm leading-relaxed text-[var(--color-text-body)]">
                                                        {currentQuote.meaning}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-16">
                                                <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 3. FIXED FOOTER ACTIONS TOOLBAR */}
                            {!isTiredBreakMode && !isDeepBreathMode && (
                                <footer className="relative z-20 px-6 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-raised)]/95 backdrop-blur-md shrink-0 w-full">
                                    <div className="max-w-xl mx-auto w-full flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Tooltip content="Read aloud">
                                                <button
                                                    onClick={handleToggleSpeech}
                                                    className={`
                                                        p-2 rounded-full text-xs font-medium transition-all cursor-pointer border border-[var(--color-border-default)]
                                                        ${isSpeaking 
                                                            ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)]' 
                                                            : 'bg-[var(--color-surface-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)]'
                                                        }
                                                    `}
                                                    aria-label="Read aloud"
                                                >
                                                    {isSpeaking ? <Volume2 size={15} className="animate-bounce" /> : <VolumeX size={15} />}
                                                </button>
                                            </Tooltip>

                                            <Tooltip content={copied ? "Copied" : "Copy quote (C)"}>
                                                <button
                                                    onClick={handleCopy}
                                                    className={`
                                                        p-2 rounded-full text-xs font-medium transition-all cursor-pointer border border-[var(--color-border-default)]
                                                        ${copied
                                                            ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] border-[var(--color-brand)]/40'
                                                            : 'bg-[var(--color-surface-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)]'
                                                        }
                                                    `}
                                                    aria-label="Copy quote"
                                                >
                                                    {copied ? <Check size={15} className="text-[var(--color-brand)]" /> : <Copy size={15} />}
                                                </button>
                                            </Tooltip>

                                            <Tooltip content="Random quote (R)">
                                                <button
                                                    onClick={goToRandom}
                                                    className="p-2 rounded-full text-xs font-medium transition-all cursor-pointer border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)]"
                                                    aria-label="Random quote"
                                                >
                                                    <Shuffle size={15} />
                                                </button>
                                            </Tooltip>
                                        </div>

                                        {/* Next / Prev Reel Buttons */}
                                        <div className="flex items-center gap-1.5">
                                            <Tooltip content="Previous quote (↑ / K)">
                                                <button
                                                    onClick={goToPrev}
                                                    className="p-2 rounded-full bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-strong)] transition-all cursor-pointer border border-[var(--color-border-default)] shadow-xs active:scale-95"
                                                    aria-label="Previous quote"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Next quote (↓ / J / Space)">
                                                <button
                                                    onClick={goToNext}
                                                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                                                    aria-label="Next quote"
                                                >
                                                    <span>Next</span>
                                                    <ChevronDown size={14} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </footer>
                            )}
                        </div>
                    </div>
                </BaseDialog.Popup>
            </BaseDialog.Portal>
        </BaseDialog.Root>
    );
}
