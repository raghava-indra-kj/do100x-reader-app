// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getLifePerspectiveConfig, saveLifePerspectiveConfig } from '@modules/core/utils/time-perspective';
import { AccountPanel } from './account-panel';

const preferences = vi.hoisted(() => ({
    motivationsEnabled: false, isLoading: false, isSaving: false, setMotivationsEnabled: vi.fn(),
}));
vi.mock('@modules/core/preferences/motivation-preferences', () => ({ useMotivationPreferences: () => preferences }));
vi.mock('@modules/auth/provider/store', () => ({
    useAuthStore: () => ({ currentUser: { label: 'Ada', displayName: 'Ada', email: 'ada@example.org', avatarUrl: null } }),
}));
vi.mock('@modules/core/ui/components/appbar', () => ({ LogoutButton: () => <button>Sign out</button> }));

let root: Root;
beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    saveLifePerspectiveConfig({ dob: '1990-04-15', lifespanYears: 84 });
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => root.render(<AccountPanel />));
});
afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
    localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});
const edit = () => document.querySelector<HTMLButtonElement>('button[aria-controls]')!;
const lifespan = () => document.querySelector<HTMLInputElement>('input[name="lifespan"]')!;
const submit = () => document.querySelector<HTMLButtonElement>('button[type="submit"]')!;

it('opens the existing values for editing and discards incomplete entries when canceled', async () => {
    expect(document.querySelector('dl')?.textContent).toContain('84 years');
    await act(async () => edit().click());
    expect(document.activeElement).toBe(document.querySelector('input[name="dob"]'));
    lifespan().value = '';
    await act(async () => submit().click());
    expect(getLifePerspectiveConfig().lifespanYears).toBe(84);
    expect(lifespan().validity.valueMissing).toBe(true);
    await act(async () => edit().click());
    expect(document.activeElement).toBe(edit());
    expect(document.querySelector('form')).toBeNull();
});

it('validates the date and lifespan and updates the summary only after saving', async () => {
    await act(async () => edit().click());
    const dob = document.querySelector<HTMLInputElement>('input[name="dob"]')!;
    dob.value = '2999-06-06';
    lifespan().value = '131';
    await act(async () => submit().click());
    expect(dob.validity.rangeOverflow).toBe(true);
    expect(lifespan().validity.rangeOverflow).toBe(true);
    expect(getLifePerspectiveConfig()).toEqual({ dob: '1990-04-15', lifespanYears: 84 });
    dob.value = '1995-11-10';
    lifespan().value = '75';
    await act(async () => submit().click());
    expect(getLifePerspectiveConfig()).toEqual({ dob: '1995-11-10', lifespanYears: 75 });
    expect(document.querySelector('dl')?.textContent).toContain('75 years');
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Saved');
});

it('shows the save error when break reminders cannot be changed', async () => {
    preferences.setMotivationsEnabled.mockResolvedValueOnce(false);
    const toggle = document.querySelector<HTMLButtonElement>('[role="switch"]')!;
    await act(async () => toggle.click());
    expect(preferences.setMotivationsEnabled).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Couldn’t save');
});
