import { extractFrontmatterTitle } from '@lib/md-parser';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { ChatAppError } from '@domain/chat/models/chat-types';
import { queryPages } from '@domain/page/services/pages-service';
import {
    FORMAT_SYSTEM_PROMPT, buildPageFormatPrompt, buildSectionFormatPrompt, formatWarnings, parseFormatReply,
    type PageFormatMode,
} from './page-format-ai';

/** Longer text risks exceeding the model's context; splitting long documents is not supported yet. */
export const MAX_FORMAT_CHARS = 40_000;

export type FormatOutcome<T> = { ok: true; data: T; warnings: string[] } | { ok: false; message: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const NO_MODEL = 'Choose a formatting model in Settings → AI models.';
const BAD_REPLY = 'The model’s reply couldn’t be used. Try again, or pick a different model.';

/** Categories already in use on top-level pages, so formatting can reuse them. Best effort. */
async function existingCategories(): Promise<string[]> {
    try {
        const result = await queryPages({ parentPageId: null });
        if (!result.ok) return [];
        return [...new Set(result.data.map((page) => page.category?.trim()).filter((value): value is string => Boolean(value)))].sort().slice(0, 50);
    } catch {
        return [];
    }
}

async function askModel(modelId: string, userPrompt: string, signal?: AbortSignal): Promise<{ ok: true; reply: string } | { ok: false; message: string }> {
    const chat = await getChatCompletion({ modelId, systemPrompt: FORMAT_SYSTEM_PROMPT, userPrompt, actionType: 'format', signal });
    if (!chat.ok) return fail(chat.error instanceof ChatAppError ? chat.error.details.message : chat.error.message || 'Couldn’t format the content. Try again.');
    return { ok: true, reply: chat.data.response };
}

export interface FormattedPage { title: string | null; category: string | null; content: string | null }

/**
 * Extract details and/or reformat a whole page. `content` in the result is null when it was not
 * rewritten (extract). Extracting works without a model when the text already carries frontmatter.
 */
export async function formatPage({ mode, title, category, content, signal }: {
    mode: PageFormatMode;
    title: string;
    category: string | null;
    content: string;
    signal?: AbortSignal;
}): Promise<FormatOutcome<FormattedPage>> {
    if (!content.trim()) return fail('Add some content first.');
    if (content.length > MAX_FORMAT_CHARS) return fail(`This content is too long to format at once (over ${MAX_FORMAT_CHARS.toLocaleString()} characters).`);
    const config = await getModelConfig();
    if (signal?.aborted) return fail('Cancelled.');
    const modelId = config.ok ? config.data.formatModelId : undefined;
    if (!modelId) {
        if (mode === 'extract') {
            const found = extractFrontmatterTitle(content);
            if (found.title || found.category) return { ok: true, data: { title: found.title, category: found.category, content: null }, warnings: [] };
            return fail(`No title or category found in the text. ${NO_MODEL}`);
        }
        return fail(NO_MODEL);
    }
    const asked = await askModel(modelId, buildPageFormatPrompt({ mode, title, category, content, categories: await existingCategories() }), signal);
    if (signal?.aborted) return fail('Cancelled.');
    if (!asked.ok) return asked;
    const reply = parseFormatReply(asked.reply);
    if (!reply) return fail(BAD_REPLY);
    if (mode === 'extract') {
        if (!reply.title && !reply.category) return fail(BAD_REPLY);
        return { ok: true, data: { title: reply.title, category: reply.category, content: null }, warnings: [] };
    }
    if (!reply.content) return fail(BAD_REPLY);
    return { ok: true, data: reply, warnings: formatWarnings(content, reply.content) };
}

/** Reformat one section's body. The heading is fixed; sub-headings must sit below `level`. */
export async function formatSection({ pageTitle, sectionTitle, level, body, signal }: {
    pageTitle: string;
    sectionTitle: string;
    level: number;
    body: string;
    signal?: AbortSignal;
}): Promise<FormatOutcome<{ content: string }>> {
    if (!body.trim()) return fail('This section has no content to format.');
    if (body.length > MAX_FORMAT_CHARS) return fail(`This section is too long to format at once (over ${MAX_FORMAT_CHARS.toLocaleString()} characters).`);
    const config = await getModelConfig();
    if (signal?.aborted) return fail('Cancelled.');
    const modelId = config.ok ? config.data.formatModelId : undefined;
    if (!modelId) return fail(NO_MODEL);
    const asked = await askModel(modelId, buildSectionFormatPrompt({ pageTitle, sectionTitle, level, body }), signal);
    if (signal?.aborted) return fail('Cancelled.');
    if (!asked.ok) return asked;
    const reply = parseFormatReply(asked.reply);
    if (!reply?.content) return fail(BAD_REPLY);
    return { ok: true, data: { content: reply.content }, warnings: formatWarnings(body, reply.content, { sectionLevel: level }) };
}
