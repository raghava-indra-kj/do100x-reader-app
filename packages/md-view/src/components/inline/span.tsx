import type { NodeProps } from "../../types/node-props";

/** Props for the span element, with aria attributes for KaTeX output. */
interface SpanProps extends NodeProps {
  ariaHidden?: boolean;
  ariaLabel?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}

/** Passthrough span preserving className, style, and aria attributes for KaTeX output. */
export function Span({ node, className, style, children, ariaHidden, ariaLabel, 'aria-hidden': hidden, 'aria-label': label }: SpanProps) {
  return (
    <span className={className} style={style} aria-hidden={hidden ?? ariaHidden} aria-label={label ?? ariaLabel}
      data-md-text-map={node?.properties.dataMdTextMap}
      data-md-atomic-start={node?.properties.dataMdAtomicStart}
      data-md-atomic-end={node?.properties.dataMdAtomicEnd}
      data-md-atomic-kind={node?.properties.dataMdAtomicKind}>
      {children}
    </span>
  );
}
