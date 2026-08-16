export interface LifePerspectiveConfig {
    dob: string; // YYYY-MM-DD
    lifespanYears: number; // e.g. 80
}

export const DEFAULT_LIFE_CONFIG: LifePerspectiveConfig = {
    dob: '2000-01-01',
    lifespanYears: 80,
};

const DOB_STORAGE_KEY = 'life_perspective_dob';
const LIFESPAN_STORAGE_KEY = 'life_perspective_lifespan';

export function getLifePerspectiveConfig(): LifePerspectiveConfig {
    try {
        const dob = localStorage.getItem(DOB_STORAGE_KEY);
        const lifespanStr = localStorage.getItem(LIFESPAN_STORAGE_KEY);
        const lifespanYears = lifespanStr ? parseInt(lifespanStr, 10) : DEFAULT_LIFE_CONFIG.lifespanYears;

        return {
            dob: dob || DEFAULT_LIFE_CONFIG.dob,
            lifespanYears: isNaN(lifespanYears) || lifespanYears <= 0 ? DEFAULT_LIFE_CONFIG.lifespanYears : lifespanYears,
        };
    } catch {
        return DEFAULT_LIFE_CONFIG;
    }
}

export function saveLifePerspectiveConfig(config: Partial<LifePerspectiveConfig>) {
    try {
        if (config.dob !== undefined) {
            localStorage.setItem(DOB_STORAGE_KEY, config.dob);
        }
        if (config.lifespanYears !== undefined) {
            localStorage.setItem(LIFESPAN_STORAGE_KEY, String(config.lifespanYears));
        }
    } catch (e) {
        console.error('Failed to save life perspective config:', e);
    }
}

export interface TimePerspectiveStats {
    // Live Minutes
    minutesThisHour: number;
    secondsThisMinute: number;
    hourProgressPercent: number;

    minutesToday: number;
    todayProgressPercent: number;

    minutesThisWeek: number;
    weekProgressPercent: number;

    minutesThisMonth: number;
    monthProgressPercent: number;

    minutesThisYear: number;
    yearProgressPercent: number;

    // Lifespan
    minutesUntilDeath: number;
    daysUntilDeath: number;
    yearsUntilDeath: number;
    lifeProgressPercent: number;
    isPassedLifespan: boolean;
}

export function calculateTimePerspective(config: LifePerspectiveConfig = getLifePerspectiveConfig()): TimePerspectiveStats {
    const now = new Date();

    // 1. Hour
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const minutesThisHour = 59 - currentMinute;
    const secondsThisMinute = 59 - currentSecond;
    const hourElapsedSec = currentMinute * 60 + currentSecond;
    const hourProgressPercent = Math.min(100, Math.max(0, (hourElapsedSec / 3600) * 100));

    // 2. Today
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const msLeftToday = Math.max(0, endOfDay.getTime() - now.getTime());
    const minutesToday = Math.floor(msLeftToday / 60000);
    const todayProgressPercent = Math.min(100, Math.max(0, ((now.getTime() - startOfDay.getTime()) / (endOfDay.getTime() - startOfDay.getTime())) * 100));

    // 3. This Week (Assuming Sunday end of week)
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
    const daysUntilEndOfWeek = (7 - dayOfWeek) % 7;
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilEndOfWeek, 23, 59, 59, 999);
    const startOfWeek = new Date(endOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
    const msLeftWeek = Math.max(0, endOfWeek.getTime() - now.getTime());
    const minutesThisWeek = Math.floor(msLeftWeek / 60000);
    const weekProgressPercent = Math.min(100, Math.max(0, ((now.getTime() - startOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000)) * 100));

    // 4. This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const msLeftMonth = Math.max(0, endOfMonth.getTime() - now.getTime());
    const minutesThisMonth = Math.floor(msLeftMonth / 60000);
    const monthProgressPercent = Math.min(100, Math.max(0, ((now.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100));

    // 5. This Year
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const msLeftYear = Math.max(0, endOfYear.getTime() - now.getTime());
    const minutesThisYear = Math.floor(msLeftYear / 60000);
    const yearProgressPercent = Math.min(100, Math.max(0, ((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100));

    // 6. Lifespan until death
    let minutesUntilDeath = 0;
    let daysUntilDeath = 0;
    let yearsUntilDeath = 0;
    let lifeProgressPercent = 0;
    let isPassedLifespan = false;

    if (config.dob) {
        const [yearStr, monthStr, dayStr] = config.dob.split('-');
        const birthYear = parseInt(yearStr, 10);
        const birthMonth = parseInt(monthStr, 10) - 1;
        const birthDay = parseInt(dayStr, 10);

        if (!isNaN(birthYear) && !isNaN(birthMonth) && !isNaN(birthDay)) {
            const birthDate = new Date(birthYear, birthMonth, birthDay);
            const deathDate = new Date(birthYear + config.lifespanYears, birthMonth, birthDay, 23, 59, 59);

            const totalLifeMs = deathDate.getTime() - birthDate.getTime();
            const elapsedLifeMs = now.getTime() - birthDate.getTime();
            const remainingLifeMs = deathDate.getTime() - now.getTime();

            if (remainingLifeMs <= 0) {
                isPassedLifespan = true;
                lifeProgressPercent = 100;
            } else {
                minutesUntilDeath = Math.floor(remainingLifeMs / 60000);
                daysUntilDeath = Math.floor(remainingLifeMs / (1000 * 60 * 60 * 24));
                yearsUntilDeath = parseFloat((remainingLifeMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));
                lifeProgressPercent = Math.min(100, Math.max(0, (elapsedLifeMs / totalLifeMs) * 100));
            }
        }
    }

    return {
        minutesThisHour,
        secondsThisMinute,
        hourProgressPercent,
        minutesToday,
        todayProgressPercent,
        minutesThisWeek,
        weekProgressPercent,
        minutesThisMonth,
        monthProgressPercent,
        minutesThisYear,
        yearProgressPercent,
        minutesUntilDeath,
        daysUntilDeath,
        yearsUntilDeath,
        lifeProgressPercent,
        isPassedLifespan,
    };
}
