import type { AsyncResult } from '@raghava.indra/result-ts';
import { err, ok } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import type { DictionaryResult } from '../models/dictionary-models';

const API_BASE = 'https://freedictionaryapi.com/api/v1';

/**
 * Look up a word in the FreeDictionaryAPI.
 *
 * @param word     The word to look up.
 * @param language ISO 639-1/639-3 language code (default: 'en').
 */
export async function lookupWord(
    word: string,
    language = 'en',
): AsyncResult<DictionaryResult, AppError> {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) {
        return err(new AppError({ message: 'Enter a word.' }));
    }

    const url = `${API_BASE}/entries/${encodeURIComponent(language)}/${encodeURIComponent(trimmed)}`;

    let response: Response;
    try {
        response = await fetch(url);
    } catch (cause) {
        return err(new AppError({
            message: 'Couldn’t reach the dictionary. Try again.',
            cause,
        }));
    }

    if (response.ok) {
        try {
            const data: DictionaryResult = await response.json();
            return ok(data);
        } catch (cause) {
            return err(new AppError({
                message: 'Couldn’t read the dictionary response. Try again.',
                cause,
            }));
        }
    }

    // Handle specific HTTP error codes
    switch (response.status) {
        case 404:
            return err(new AppError({
                message: `No definition found for “${trimmed}”.`,
            }));
        case 429:
            return err(new AppError({
                message: 'The dictionary is busy. Try again later.',
            }));
        default:
            return err(new AppError({
                message: `Couldn’t look up this word (${response.status}: ${response.statusText}).`,
            }));
    }
}
