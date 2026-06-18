/** Dictionary API response types derived from FreeDictionaryAPI.com OpenAPI spec. */

export interface DictionaryResult {
    word: string;
    entries: DictionaryEntry[];
    source: DictionarySource;
}

export interface DictionaryEntry {
    language: DictionaryLanguage;
    partOfSpeech: string;
    pronunciations: DictionaryPronunciation[];
    forms: DictionaryForm[];
    senses: DictionarySense[];
    synonyms: string[];
    antonyms: string[];
}

export interface DictionaryLanguage {
    code: string;
    name: string;
}

export interface DictionaryPronunciation {
    type: 'ipa' | 'enpr';
    text: string;
    tags: string[];
}

export interface DictionaryForm {
    word: string;
    tags: string[];
}

export interface DictionarySense {
    definition: string;
    tags: string[];
    examples: string[];
    quotes: DictionaryQuote[];
    synonyms: string[];
    antonyms: string[];
    subsenses: DictionarySense[];
}

export interface DictionaryQuote {
    text: string;
    reference: string;
}

export interface DictionarySource {
    url: string;
    license: {
        name: string;
        url: string;
    };
}
