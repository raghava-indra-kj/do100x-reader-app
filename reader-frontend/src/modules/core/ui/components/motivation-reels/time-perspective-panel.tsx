import { useState, useEffect, useMemo } from 'react';
import { 
    Clock, 
    Hourglass, 
    Calendar, 
    CalendarDays, 
    Flame, 
    Heart, 
    Edit3, 
    Check, 
    Info 
} from 'lucide-react';
import { 
    calculateTimePerspective, 
    getLifePerspectiveConfig, 
    saveLifePerspectiveConfig, 
    type LifePerspectiveConfig,
    type TimePerspectiveStats 
} from '@modules/core/utils/time-perspective';

export function TimePerspectivePanel() {
    const [config, setConfig] = useState<LifePerspectiveConfig>(getLifePerspectiveConfig);
    const [stats, setStats] = useState<TimePerspectiveStats>(() => calculateTimePerspective(config));
    const [isEditing, setIsEditing] = useState(false);
    const [dobInput, setDobInput] = useState(config.dob);
    const [lifespanInput, setLifespanInput] = useState(String(config.lifespanYears));

    // Live ticking timer (every 1 second)
    useEffect(() => {
        const update = () => {
            setStats(calculateTimePerspective(config));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [config]);

    const handleSaveConfig = () => {
        const parsedLifespan = parseInt(lifespanInput, 10) || 80;
        const newConfig = {
            dob: dobInput || '2000-01-01',
            lifespanYears: Math.max(1, Math.min(130, parsedLifespan)),
        };
        saveLifePerspectiveConfig(newConfig);
        setConfig(newConfig);
        setIsEditing(false);
    };

    const counterCards = useMemo(() => [
        {
            title: 'This Hour',
            minutes: stats.minutesThisHour,
            subtitle: `${stats.secondsThisMinute}s remaining`,
            progress: stats.hourProgressPercent,
            icon: Clock,
            accent: 'text-amber-500',
            barBg: 'bg-amber-500',
            span: 'sm:col-span-1',
        },
        {
            title: 'Today',
            minutes: stats.minutesToday,
            subtitle: `~${Math.floor(stats.minutesToday / 60)}h ${stats.minutesToday % 60}m remaining`,
            progress: stats.todayProgressPercent,
            icon: Calendar,
            accent: 'text-orange-500',
            barBg: 'bg-orange-500',
            span: 'sm:col-span-1',
        },
        {
            title: 'This Week',
            minutes: stats.minutesThisWeek,
            subtitle: `~${(stats.minutesThisWeek / (60 * 24)).toFixed(1)} days remaining`,
            progress: stats.weekProgressPercent,
            icon: CalendarDays,
            accent: 'text-rose-500',
            barBg: 'bg-rose-500',
            span: 'sm:col-span-1',
        },
        {
            title: 'This Month',
            minutes: stats.minutesThisMonth,
            subtitle: `~${Math.floor(stats.minutesThisMonth / (60 * 24))} days remaining`,
            progress: stats.monthProgressPercent,
            icon: CalendarDays,
            accent: 'text-indigo-500',
            barBg: 'bg-indigo-500',
            span: 'sm:col-span-1',
        },
        {
            title: 'This Year',
            minutes: stats.minutesThisYear,
            subtitle: `~${Math.floor(stats.minutesThisYear / (60 * 24))} days remaining in ${new Date().getFullYear()}`,
            progress: stats.yearProgressPercent,
            icon: Flame,
            accent: 'text-purple-500',
            barBg: 'bg-purple-500',
            span: 'sm:col-span-2',
        },
    ], [stats]);

    return (
        <div className="flex flex-col h-full overflow-y-auto p-5 sm:p-6 lg:p-7 space-y-5 scrollbar-none">
            {/* Header / Title */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] shadow-xs">
                            <Hourglass size={16} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-strong)] font-[family-name:var(--font-sans)] tracking-tight">
                                Time Perspective
                            </h2>
                            <p className="text-xs text-[var(--color-text-muted)]">Real-time awareness across finite horizons</p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (isEditing) {
                                handleSaveConfig();
                            } else {
                                setIsEditing(true);
                            }
                        }}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                            isEditing 
                                ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] border-[var(--color-brand)] shadow-xs' 
                                : 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] border-[var(--color-border-subtle)]'
                        }`}
                        title="Edit DOB & expected lifespan"
                    >
                        {isEditing ? <Check size={13} /> : <Edit3 size={13} />}
                        <span>{isEditing ? 'Save' : 'Edit Targets'}</span>
                    </button>
                </div>

                {/* Edit Form if toggled */}
                {isEditing && (
                    <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] space-y-3 animate-fade-in text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="font-semibold text-[var(--color-text-strong)]">Date of Birth</label>
                                <input
                                    type="date"
                                    value={dobInput}
                                    onChange={(e) => setDobInput(e.target.value)}
                                    className="w-full h-8 px-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-[var(--color-text-strong)]">Expected Lifespan (Years)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={130}
                                    value={lifespanInput}
                                    onChange={(e) => setLifespanInput(e.target.value)}
                                    placeholder="80"
                                    className="w-full h-8 px-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)]"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Featured Hero Card: Estimated Lifetime Remaining */}
            <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[var(--color-surface-card)] to-[var(--color-surface-card-strong)] border border-[var(--color-border-strong)] shadow-md space-y-3.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-rose-500/15 text-rose-500">
                            <Heart size={15} />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)] font-[family-name:var(--font-sans)]">
                            Estimated Lifetime Remaining
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--color-text-muted)] font-mono">
                        Target: {config.lifespanYears} yrs (Born {config.dob})
                    </span>
                </div>

                <div className="space-y-1.5">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono tracking-tight text-[var(--color-text-strong)] tabular-nums">
                        {stats.minutesUntilDeath.toLocaleString()}
                        <span className="text-sm sm:text-base font-normal font-sans text-[var(--color-text-muted)] ml-2">minutes</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] font-mono text-[var(--color-text-strong)]">
                            ~{stats.daysUntilDeath.toLocaleString()} days
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] font-mono text-[var(--color-text-strong)]">
                            ~{stats.yearsUntilDeath} years left
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] font-mono font-bold text-[var(--color-brand)]">
                            {stats.lifeProgressPercent.toFixed(1)}% elapsed
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-medium">
                        <span>0 yrs</span>
                        <span className="text-[var(--color-brand)] font-semibold">{stats.lifeProgressPercent.toFixed(1)}% lived</span>
                        <span>{config.lifespanYears} yrs</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--color-surface-soft)] overflow-hidden">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand)] via-rose-500 to-amber-500 transition-all duration-500"
                            style={{ width: `${stats.lifeProgressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Grid of Micro Time Horizon Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {counterCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div 
                            key={card.title}
                            className={`p-3.5 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-all space-y-2.5 shadow-xs ${card.span}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
                                    <Icon size={14} className={card.accent} />
                                    <span>{card.title}</span>
                                </span>
                                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                    {card.subtitle}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="text-lg sm:text-xl font-bold font-mono text-[var(--color-text-strong)] tabular-nums">
                                    {card.minutes.toLocaleString()} <span className="text-xs font-normal text-[var(--color-text-muted)] font-sans">mins</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-soft)] overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${card.barBg} transition-all duration-300`}
                                        style={{ width: `${card.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Reminder Callout */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-surface-soft)]/60 border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                <Info size={14} className="shrink-0 mt-0.5 text-[var(--color-brand)]" />
                <p>
                    <span className="font-semibold text-[var(--color-text-strong)]">Why track time?</span> Time is our only non-renewable resource. Read, reflect, and create with clear intent.
                </p>
            </div>
        </div>
    );
}
