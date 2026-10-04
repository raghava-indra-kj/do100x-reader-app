import { observer } from 'mobx-react-lite';
import { MarkdownRenderer } from '@reader/md-view';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '@modules/page/theme/page-color-schema';
import { PageFontFamilies } from '@modules/page/theme/page-font-families';
import { PageFontSizes } from '@modules/page/theme/page-font-sizes';
import '@reader/md-view/md-view.css';
import '@reader/md-view/md-view-hljs.css';

export const VocabularyMarkdown = observer(function VocabularyMarkdown({ source }: { source: string }) {
    const theme = useThemeStore();
    const colors = PageColorSchema.VALUES.find(item => item.id === theme.theme.value) ?? PageColorSchema.LIGHT;
    return <MarkdownRenderer markdown={source} colors={colors.value} fonts={PageFontFamilies.ATKINSON.value} fontSizes={PageFontSizes.BASE.value} />;
});
