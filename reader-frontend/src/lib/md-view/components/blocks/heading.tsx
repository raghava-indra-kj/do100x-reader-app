import type { ElementType } from "react";
import type { NodeProps } from "../../types/node-props";

/** Maps tag names to CSS heading level classes. */
const HEADING_CLASS: Record<string, string> = {
  h1: "md-heading-1",
  h2: "md-heading-2",
  h3: "md-heading-3",
  h4: "md-heading-4",
  h5: "md-heading-5",
  h6: "md-heading-6",
};

/** Polymorphic heading element covering h1 through h6. */
export function Heading({ node, children }: NodeProps) {
  const tag = node?.tagName ?? "h1";
  const Tag = tag as ElementType;
  return <Tag className={HEADING_CLASS[tag] ?? "md-heading-1"}>{children}</Tag>;
}
