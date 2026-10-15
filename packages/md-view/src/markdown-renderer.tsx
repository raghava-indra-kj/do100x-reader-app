import Markdown, { type Components, type ExtraProps } from "react-markdown";
import { createContext, createElement, useContext, useId, useMemo, useRef, type ComponentType, type ComponentPropsWithoutRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createDocument, type MarkdownDocument, type MarkdownBlock, type SourceRange } from '@reader/md-ast';
import type { LinkClickEvent } from "./types/link";
import { REMARK_PLUGINS } from "./pipeline/remark-plugins";
import { getRehypePlugins } from "./pipeline/rehype-plugins";
import { buildComponentMap } from "./pipeline/component-map";
import { strictUrlTransform, buildUrlTransform } from "./pipeline/url-transform";
import ErrorBoundary from "./error-boundary";
import { MdViewLinkContext, MdViewColorContext, MdViewMermaidContext, MdViewCopyContext } from "./context/md-view-context";
import { useCssAppearance } from './context/css-appearance';
import { EmbeddedContentContext, type EmbeddedContentRenderers } from './components/code/embedded-content';
import { sourceFingerprint } from './annotations/text-map';

/** Props for the markdown rendering component. */
export interface MarkdownRendererProps {
  markdown: string;
  /** Pass persisted metadata to expose durable block IDs. Source must match markdown. */
  document?: MarkdownDocument;
  className?: string;
  style?: CSSProperties;
  components?: Partial<Components>;
  onLinkClick?: (event: LinkClickEvent) => void;
  /** Optional clipboard bridge; omitted uses the browser clipboard. */
  onCopyText?: (text: string) => Promise<void>;
  baseUrl?: string;
  /** Display a source region while still parsing definitions in the entire document. */
  sourceRange?: SourceRange;
  onBlockClick?: (block: MarkdownBlock, event: MouseEvent<HTMLElement>) => void;
  renderBlockActions?: (block: MarkdownBlock) => ReactNode;
  embeds?: EmbeddedContentRenderers;
}

const BlockContext = createContext<{
  blocks: ReadonlyMap<string, MarkdownBlock>;
  onClick?: MarkdownRendererProps['onBlockClick'];
  actions?: MarkdownRendererProps['renderBlockActions'];
  customDiv?: Components['div'];
} | null>(null);

// Keep the component identity stable when a host recreates callbacks or updates
// document metadata. Remounting wrappers would reset diagrams and embedded tools.
function SourceBlock({ node, children, ...props }: ComponentPropsWithoutRef<'div'> & ExtraProps) {
  const context = useContext(BlockContext)!;
  const blockId = node?.properties?.dataMdBlockId;
  const block = typeof blockId === 'string' ? context.blocks.get(blockId) : undefined;
  if (!block) return context.customDiv ? createElement(context.customDiv as ComponentType<ComponentPropsWithoutRef<'div'> & ExtraProps>, { node, ...props }, children) : <div {...props}>{children}</div>;
  return <div {...props} onClick={context.onClick ? event => context.onClick!(block, event) : undefined}>
    {context.actions && <div className="md-block-actions" contentEditable={false} data-md-ui="true">{context.actions(block)}</div>}
    {children}
  </div>;
}

/** Framework-local viewer: no app services, theme objects, storage or network calls. CSS is opt-in. */
export function MarkdownRenderer({
  markdown,
  document,
  className,
  style,
  components,
  onLinkClick,
  onCopyText,
  baseUrl,
  sourceRange,
  onBlockClick,
  renderBlockActions,
  embeds,
}: MarkdownRendererProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const appearance = useCssAppearance(rootRef);
  const renderId = useId();
  const model = useMemo(() => {
    if (document && document.source !== markdown) throw new Error('Markdown source and document metadata must match.');
    let index = 0;
    // Without persisted metadata, IDs are render-local and stable during SSR hydration.
    return document ?? createDocument(markdown, { generateId: () => `${renderId}-${++index}` });
  }, [document, markdown, renderId]);
  const blocksById = useMemo(() => new Map(model.blocks.map(block => [block.id, block])), [model]);
  if (sourceRange && (!Number.isSafeInteger(sourceRange.start) || !Number.isSafeInteger(sourceRange.end) || sourceRange.start < 0 || sourceRange.end < sourceRange.start || sourceRange.end > markdown.length)) throw new Error('Invalid Markdown source range.');
  const mergedComponents = useMemo(() => {
    const map = buildComponentMap(components);
    map.div = SourceBlock;
    return map;
  }, [components]);
  const blockContext = useMemo(() => ({ blocks: blocksById, onClick: onBlockClick, actions: renderBlockActions, customDiv: buildComponentMap(components).div }), [blocksById, onBlockClick, renderBlockActions, components]);
  const urlTransform = baseUrl ? buildUrlTransform(baseUrl) : strictUrlTransform;

  return (
    <BlockContext.Provider value={blockContext}>
    <MdViewCopyContext.Provider value={onCopyText ?? null}>
    <MdViewColorContext.Provider value={appearance.colors}>
      <MdViewMermaidContext.Provider value={appearance.mermaid}>
      <EmbeddedContentContext.Provider value={embeds ?? {}}>
        <MdViewLinkContext.Provider value={onLinkClick ?? null}>
          <div ref={rootRef} className={`md-view ${className ?? ""}`.trim()} data-md-document={sourceFingerprint(markdown)} data-md-scheme={appearance.scheme} style={style}>
            <ErrorBoundary fallback={markdown} resetKey={markdown}>
              <Markdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={getRehypePlugins('#cc0000', baseUrl, { document: model, range: sourceRange })}
                urlTransform={urlTransform}
                components={mergedComponents}
              >
                {markdown}
              </Markdown>
            </ErrorBoundary>
          </div>
        </MdViewLinkContext.Provider>
      </EmbeddedContentContext.Provider>
      </MdViewMermaidContext.Provider>
    </MdViewColorContext.Provider>
    </MdViewCopyContext.Provider>
    </BlockContext.Provider>
  );
}
