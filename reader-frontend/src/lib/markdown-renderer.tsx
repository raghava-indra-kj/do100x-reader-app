import { MarkdownRenderer as Viewer, markdownStyle, type MarkdownRendererProps as ViewerProps, type MdViewColors, type MdViewFontSizes, type MdViewFonts, type MdViewMermaidTheme } from '@reader/md-view';
import type { CSSProperties } from 'react';

/** Reader's appearance adapter. The standalone viewer has no required theme contract. */
export interface MarkdownRendererProps extends ViewerProps {
    colors: MdViewColors;
    fontSizes: MdViewFontSizes;
    fonts: MdViewFonts;
    mermaidTheme?: MdViewMermaidTheme;
}
export function MarkdownRenderer({ colors, fontSizes, fonts, mermaidTheme, style, ...props }: MarkdownRendererProps) {
    const diagramStyle = Object.fromEntries(Object.entries(mermaidTheme ?? {}).map(([key, value]) => [`--md-mermaid-${key}`, value])) as CSSProperties;
    return <Viewer {...props} style={{ ...markdownStyle(colors, fontSizes, fonts), ...diagramStyle, ...style }} />;
}
