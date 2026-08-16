import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Wind, 
    Play, 
    Pause, 
    RotateCcw, 
    BookOpen, 
    ArrowLeft 
} from 'lucide-react';

export interface BreathingPattern {
    id: string;
    name: string;
    purpose: string;
    inhale: number;
    hold1: number;
    exhale: number;
    hold2: number;
    accentColor: string;
    gradientClass: string;
}

const BREATHING_PATTERNS: BreathingPattern[] = [
    {
        id: 'box',
        name: 'Box Breathing (4-4-4-4)',
        purpose: 'Reset focus, steady nerves, and eliminate brain fog',
        inhale: 4,
        hold1: 4,
        exhale: 4,
        hold2: 4,
        accentColor: '#0ea5e9',
        gradientClass: 'from-sky-500 to-teal-500',
    },
    {
        id: 'relax-478',
        name: '4-7-8 Calm Breath',
        purpose: 'Soothe the nervous system and release reading tension',
        inhale: 4,
        hold1: 7,
        exhale: 8,
        hold2: 0,
        accentColor: '#8b5cf6',
        gradientClass: 'from-violet-500 to-indigo-500',
    },
    {
        id: 'quick',
        name: 'Quick Refresh (3-3-3)',
        purpose: 'Fast 1-minute mental reset between study sections',
        inhale: 3,
        hold1: 3,
        exhale: 3,
        hold2: 3,
        accentColor: '#10b981',
        gradientClass: 'from-emerald-500 to-teal-500',
    },
];

type BreathPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

export interface DeepBreathPanelProps {
    onClose: () => void;
    onBackToQuotes: () => void;
}

export function DeepBreathPanel({ onClose, onBackToQuotes }: DeepBreathPanelProps) {
    const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(BREATHING_PATTERNS[0]);
    const [isActive, setIsActive] = useState(true);
    const [phase, setPhase] = useState<BreathPhase>('inhale');
    const [secondsRemaining, setSecondsRemaining] = useState(BREATHING_PATTERNS[0].inhale);
    const [completedCycles, setCompletedCycles] = useState(0);

    const patternRef = useRef(selectedPattern);
    patternRef.current = selectedPattern;

    const phaseRef = useRef<BreathPhase>('inhale');
    phaseRef.current = phase;

    const secondsRef = useRef(secondsRemaining);
    secondsRef.current = secondsRemaining;

    // Reset when pattern changes
    const handleSelectPattern = (pattern: BreathingPattern) => {
        setSelectedPattern(pattern);
        setPhase('inhale');
        setSecondsRemaining(pattern.inhale);
        setCompletedCycles(0);
        setIsActive(true);
    };

    const handleReset = useCallback(() => {
        setPhase('inhale');
        setSecondsRemaining(selectedPattern.inhale);
        setCompletedCycles(0);
        setIsActive(true);
    }, [selectedPattern]);

    // Timer Loop
    useEffect(() => {
        if (!isActive) return;

        const timer = setInterval(() => {
            const pattern = patternRef.current;
            const currentPhase = phaseRef.current;
            const currentSec = secondsRef.current;

            if (currentSec > 1) {
                setSecondsRemaining(currentSec - 1);
            } else {
                // Transition to next phase
                if (currentPhase === 'inhale') {
                    if (pattern.hold1 > 0) {
                        setPhase('hold1');
                        setSecondsRemaining(pattern.hold1);
                    } else {
                        setPhase('exhale');
                        setSecondsRemaining(pattern.exhale);
                    }
                } else if (currentPhase === 'hold1') {
                    setPhase('exhale');
                    setSecondsRemaining(pattern.exhale);
                } else if (currentPhase === 'exhale') {
                    if (pattern.hold2 > 0) {
                        setPhase('hold2');
                        setSecondsRemaining(pattern.hold2);
                    } else {
                        setPhase('inhale');
                        setSecondsRemaining(pattern.inhale);
                        setCompletedCycles(c => c + 1);
                    }
                } else if (currentPhase === 'hold2') {
                    setPhase('inhale');
                    setSecondsRemaining(pattern.inhale);
                    setCompletedCycles(c => c + 1);
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive]);

    // Phase guidance text & visual scaling
    const phaseInfo = (() => {
        switch (phase) {
            case 'inhale':
                return {
                    label: 'Inhale Slowly',
                    subtext: 'Breathe in through your nose, filling your lungs',
                    orbScale: 'scale-125',
                    glowOpacity: 'opacity-90',
                    ringColor: 'border-sky-400',
                    textColor: 'text-sky-500 dark:text-sky-400',
                };
            case 'hold1':
                return {
                    label: 'Hold Gently',
                    subtext: 'Keep your chest open and muscles relaxed',
                    orbScale: 'scale-125',
                    glowOpacity: 'opacity-100',
                    ringColor: 'border-violet-400',
                    textColor: 'text-violet-500 dark:text-violet-400',
                };
            case 'exhale':
                return {
                    label: 'Exhale Completely',
                    subtext: 'Release all tension out through your mouth',
                    orbScale: 'scale-75',
                    glowOpacity: 'opacity-40',
                    ringColor: 'border-teal-400',
                    textColor: 'text-teal-500 dark:text-teal-400',
                };
            case 'hold2':
                return {
                    label: 'Pause & Rest',
                    subtext: 'Feel the stillness before your next breath',
                    orbScale: 'scale-75',
                    glowOpacity: 'opacity-30',
                    ringColor: 'border-emerald-400',
                    textColor: 'text-emerald-500 dark:text-emerald-400',
                };
        }
    })();

    return (
        <div className="max-w-xl mx-auto w-full flex flex-col items-center justify-between h-full py-4 space-y-6 animate-in fade-in duration-200">
            {/* Top Title & Pattern Selector */}
            <div className="w-full text-center space-y-3 shrink-0">
                <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 shadow-xs">
                        <Wind size={18} className="animate-pulse" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-strong)] font-[family-name:var(--font-sans)] tracking-tight">
                        Deep Breathing Exercise
                    </h2>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                    {selectedPattern.purpose}
                </p>

                {/* Pattern Buttons */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                    {BREATHING_PATTERNS.map((pat) => (
                        <button
                            key={pat.id}
                            onClick={() => handleSelectPattern(pat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                                selectedPattern.id === pat.id
                                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] border-[var(--color-brand)] shadow-xs font-semibold'
                                    : 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] border-transparent'
                            }`}
                        >
                            {pat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Central Animated Breathing Orb */}
            <div className="relative flex flex-col items-center justify-center py-6 select-none shrink-0">
                {/* Outer Glow Halo */}
                <div 
                    className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br ${selectedPattern.gradientClass} blur-3xl transition-all duration-1000 ease-in-out pointer-events-none ${phaseInfo.glowOpacity} ${phaseInfo.orbScale}`} 
                />

                {/* Outer Pulsing Ring */}
                <div 
                    className={`relative flex items-center justify-center w-52 h-52 sm:w-60 sm:h-60 rounded-full border-4 ${phaseInfo.ringColor} bg-[var(--color-surface-card)]/90 backdrop-blur-md shadow-2xl transition-all duration-1000 ease-in-out ${phaseInfo.orbScale}`}
                >
                    {/* Inner Core */}
                    <div className="flex flex-col items-center justify-center text-center p-4">
                        <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight transition-colors duration-500 ${phaseInfo.textColor}`}>
                            {secondsRemaining}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[var(--color-text-strong)] uppercase tracking-wider mt-1 font-[family-name:var(--font-sans)]">
                            {phaseInfo.label}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1">
                            Cycle #{completedCycles + 1}
                        </span>
                    </div>
                </div>

                {/* Real-time Subtext Guidance */}
                <p className="text-xs text-[var(--color-text-body)] text-center max-w-xs mt-6 leading-relaxed font-medium">
                    {phaseInfo.subtext}
                </p>
            </div>

            {/* Control Actions */}
            <div className="w-full flex flex-col items-center gap-3 shrink-0">
                {/* Play / Pause / Reset Bar */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                        {isActive ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isActive ? 'Pause' : 'Resume'}</span>
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-2 rounded-xl bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] border border-[var(--color-border-default)] transition-all cursor-pointer shadow-xs"
                        title="Restart Breathing Exercise"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>

                {/* Footer Navigation Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)] w-full justify-center">
                    <button
                        onClick={onBackToQuotes}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-all cursor-pointer"
                    >
                        <ArrowLeft size={13} />
                        <span>Inspirations &amp; Quotes</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-default)] transition-all cursor-pointer shadow-xs"
                    >
                        <BookOpen size={13} />
                        <span>Resume Reading</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
