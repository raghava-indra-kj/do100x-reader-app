import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './return-path';

describe('safe post-sign-in navigation', () => {
    it.each([undefined, null, {}, 'https://attacker.example', '//attacker.example', '/\\attacker.example', '/\nattacker.example', '/login', '/LOGIN/', '/%6cogin', '/invalid%'])('rejects external, invalid or looping destinations: %j', value => {
        expect(safeReturnPath(value)).toBe('/');
    });
    it('preserves an internal page destination and its query/hash', () => {
        expect(safeReturnPath('/reader/pages/abc?view=quizzes#answer')).toBe('/reader/pages/abc?view=quizzes#answer');
    });
    it.each(['/', '/reader', '/finance', '/tasks'])('returns to the selected suite app: %s', value => {
        expect(safeReturnPath(value)).toBe(value);
    });
});
