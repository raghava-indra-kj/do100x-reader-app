import Markdown, { type Components } from "react-markdown";
import type { MdViewColors, MdViewFontSizes, MdViewFonts } from "./types/theme";
import type { LinkClickEvent } from "./types/link";
import { REMARK_PLUGINS } from "./pipeline/remark-plugins";
import { getRehypePlugins } from "./pipeline/rehype-plugins";
import { buildComponentMap } from "./pipeline/component-map";
import { strictUrlTransform, buildUrlTransform } from "./pipeline/url-transform";
import { propsToCssVars } from "./utils/theme-to-css-vars";
import ErrorBoundary from "./error-boundary";
import { MdViewColorContext, MdViewLinkContext } from "./context/md-view-context";

/** Props for the markdown rendering component. */
export interface MarkdownRendererProps {
  markdown: string;
  colors: MdViewColors;
  fontSizes: MdViewFontSizes;
  fonts: MdViewFonts;
  className?: string;
  components?: Partial<Components>;
  onLinkClick?: (event: LinkClickEvent) => void;
  baseUrl?: string;
}

/** Renders markdown into styled React DOM using the provided theme. */
export function MarkdownRenderer({
  markdown,
  colors,
  fontSizes,
  fonts,
  className,
  components,
  onLinkClick,
  baseUrl,
}: MarkdownRendererProps) {
  const mergedComponents = buildComponentMap(components);
  const style = propsToCssVars(colors, fontSizes, fonts);
  const urlTransform = baseUrl ? buildUrlTransform(baseUrl) : strictUrlTransform;

  return (
    <MdViewColorContext.Provider value={colors}>
      <MdViewLinkContext.Provider value={onLinkClick ?? null}>
        <div className={`md-view ${className ?? ""}`.trim()} style={style}>
          <ErrorBoundary fallback={markdown}>
            <Markdown
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={getRehypePlugins(colors.errorColor, baseUrl)}
              urlTransform={urlTransform}
              components={mergedComponents}
            >
              {markdown}
            </Markdown>
          </ErrorBoundary>
        </div>
      </MdViewLinkContext.Provider>
    </MdViewColorContext.Provider>
  );
}
