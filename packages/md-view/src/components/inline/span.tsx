import type { NodeProps } from "../../types/node-props";

/** Props for the span element, with aria attributes for KaTeX output. */
interface SpanProps extends NodeProps {
  ariaHidden?: boolean;
  ariaLabel?: string;
}

/** Passthrough span preserving className, style, and aria attributes for KaTeX output. */
export function Span({ className, style, children, ariaHidden, ariaLabel }: SpanProps) {
  return (
    <span className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel}>
      {children}
    </span>
  );
}
