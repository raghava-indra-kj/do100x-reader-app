import type { Element } from "hast";
import type { CSSProperties, ReactNode } from "react";

/** Props passed to every internal markdown component. */
export interface NodeProps {
    node?: Element;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
}
