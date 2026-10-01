import { MarkdownRenderer } from '@reader/md-view';
import { useThemeStore } from '@modules/core/theme';
import { usePageStore } from '../store';
import { PageColorSchema } from '../theme/page-color-schema';

/** One renderer for quiz prompts, choices, answers, explanations and feedback. */
export function QuizMarkdown({ source }: { source: string | null | undefined }) {
    const page = usePageStore();
    const theme = useThemeStore();
    const colors = PageColorSchema.VALUES.find((item) => item.id === theme.theme.value) ?? PageColorSchema.LIGHT;
    if (!source) return null;
    return <MarkdownRenderer markdown={source} colors={colors.value} fontSizes={page.uiSettingsStore.fontSize.value} fonts={page.uiSettingsStore.fontFamilies.value} />;
}
