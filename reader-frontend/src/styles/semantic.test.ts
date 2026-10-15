import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const primitives = readFileSync(new URL('./primitives.css', import.meta.url), 'utf8');
const semantic = readFileSync(new URL('./semantic.css', import.meta.url), 'utf8');

function declarations(css: string, selector: string): Record<string, string> {
    const block = css.split(`${selector} {`)[1]?.split('}')[0];
    if (!block) throw new Error(`Missing theme selector: ${selector}`);
    return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

function palette(theme: string) {
    const tokens = {
        ...declarations(primitives, ':root'),
        ...declarations(semantic, ':root'),
        ...(theme === ':root' ? {} : declarations(semantic, theme)),
    };
    return (name: string) => {
        let value = tokens[name];
        const visited = new Set<string>();
        while (value?.startsWith('var(')) {
            if (visited.has(value)) throw new Error(`Circular color token: ${name}`);
            visited.add(value);
            value = tokens[value.slice(4, -1)];
        }
        if (!/^#[\da-f]{6}$/i.test(value ?? '')) throw new Error(`Unresolved color token: ${name}`);
        return value;
    };
}

function luminance(hex: string) {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
        .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('semantic theme readability', () => {
    it.each([':root', '.light', '.dark', '.forest-dark'])('%s keeps primary labels readable in every interaction state', theme => {
        const color = palette(theme);
        for (const state of ['--color-brand', '--color-brand-hover', '--color-brand-active']) {
            expect(contrast(color('--color-text-on-brand'), color(state)), state).toBeGreaterThanOrEqual(4.5);
        }
    });

    it.each(['.dark', '.forest-dark'])('%s uses quiet feedback tiles with readable text and icons', theme => {
        const color = palette(theme);
        const softLuminances = ['brand', 'success', 'warning', 'error', 'info'].map(tone => {
            const soft = color(`--color-${tone}-soft`);
            expect(contrast(color(`--color-${tone}-on-soft`), soft), tone).toBeGreaterThanOrEqual(4.5);
            return luminance(soft);
        });
        // A light-mode tint in a dark theme would dominate neighboring app icons and alerts.
        expect(Math.max(...softLuminances)).toBeLessThan(0.08);
        expect(Math.max(...softLuminances) - Math.min(...softLuminances)).toBeLessThan(0.04);
        for (const tone of ['success', 'warning', 'error', 'info']) {
            for (const surface of ['canvas', 'raised']) {
                expect(contrast(color(`--color-${tone}`), color(`--color-surface-${surface}`)), `${tone} on ${surface}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });
});
