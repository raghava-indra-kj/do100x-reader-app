import type { NodeProps } from "../../types/node-props";

/** Body text paragraph. */
export function Paragraph({ children }: NodeProps) {
  return <p className="md-paragraph">{children}</p>;
}
