import type { NodeProps } from "../../types/node-props";

/** Passthrough span preserving className and style for KaTeX output. */
export function Span({ className, style, children }: NodeProps) {
  return (
    <span className={className} style={style}>
      {children}
    </span>
  );
}
