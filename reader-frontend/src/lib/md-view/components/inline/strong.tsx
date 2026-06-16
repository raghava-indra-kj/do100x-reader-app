import type { NodeProps } from "../../types/node-props";

/** Bold text element. */
export function Strong({ children }: NodeProps) {
  return <strong className="md-strong">{children}</strong>;
}
