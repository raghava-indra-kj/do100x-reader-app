import type { NodeProps } from "../../types/node-props";

/** Table with horizontal scroll wrapper. */
export function Table({ children }: NodeProps) {
  return (
    <div className="md-table-wrap">
      <table className="md-table">{children}</table>
    </div>
  );
}

/** Table head section. */
export function TableHead({ children }: NodeProps) {
  return <thead className="md-thead">{children}</thead>;
}

/** Table body section. */
export function TableBody({ children }: NodeProps) {
  return <tbody className="md-tbody">{children}</tbody>;
}

/** Table row element. */
export function TableRow({ children }: NodeProps) {
  return <tr className="md-tr">{children}</tr>;
}

/** Table data cell. */
export function TableCell({ children }: NodeProps) {
  return <td className="md-td">{children}</td>;
}

/** Table header cell. */
export function TableHeaderCell({ children }: NodeProps) {
  return <th className="md-th">{children}</th>;
}
