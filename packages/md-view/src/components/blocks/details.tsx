import type { NodeProps } from "../../types/node-props";

/** Props for the collapsible details block. */
interface DetailsProps extends NodeProps {
  open?: boolean;
}

/** Collapsible details block. */
export function Details({ open, children }: DetailsProps) {
  return (
    <details className="md-details" open={open}>
      {children}
    </details>
  );
}

/** Clickable summary label for a details block. */
export function DetailsSummary({ children }: NodeProps) {
  return <summary className="md-details-summary">{children}</summary>;
}
