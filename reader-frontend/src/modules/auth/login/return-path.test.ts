import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './return-path';

describe('safe post-sign-in navigation', () => {
    it.each([undefined, null, {}, 'https://attacker.example', '//attacker.example', '/\\attacker.example', '/\nattacker.example', '/login', '/LOGIN/', '/%6cogin', '/invalid%'])('rejects external, invalid or looping destinations: %j', value => {
        expect(safeReturnPath(value)).toBe('/reader');
    });
    it('preserves an internal page destination and its query/hash', () => {
        expect(safeReturnPath('/pages/abc?view=quizzes#answer')).toBe('/pages/abc?view=quizzes#answer');
    });
});
