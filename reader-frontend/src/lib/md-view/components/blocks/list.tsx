import type { NodeProps } from "../../types/node-props";

/** Bullet list element. */
export function BulletList({ children }: NodeProps) {
  return <ul className="md-bullet-list">{children}</ul>;
}

/** Props for the ordered list with optional start index. */
interface OrderedListProps extends NodeProps {
  start?: number;
}

/** Ordered list with optional start index. */
export function OrderedList({ start, children }: OrderedListProps) {
  return (
    <ol className="md-ordered-list" start={start}>
      {children}
    </ol>
  );
}

/** List item with GFM task list detection. */
export function ListItem({ className, children }: NodeProps) {
  const isTask = typeof className === "string" && className.includes("task-list-item");
  return (
    <li className={isTask ? "md-list-item md-list-item--task" : "md-list-item"}>
      {children}
    </li>
  );
}
