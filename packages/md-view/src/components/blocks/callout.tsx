import type { NodeProps } from "../../types/node-props";

/** Props for the callout block component. */
interface CalloutProps extends NodeProps {
  icon?: string;
}

/** Callout block with optional icon. */
export function Callout({ icon, children }: CalloutProps) {
  return (
    <div className="md-callout">
      {icon ? (
        <span className="md-callout-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="md-callout-body">{children}</div>
    </div>
  );
}
