import type { Components } from "react-markdown";
import { Strong } from "./strong";
import { Emphasis } from "./emphasis";
import { Strikethrough } from "./strikethrough";
import { LineBreak } from "./line-break";
import { Span } from "./span";
import { Link } from "./link";
import { CodeInline } from "./code-inline";

export { Strong, Emphasis, Strikethrough, LineBreak, Span, Link, CodeInline };

/** Inline tag to component map for react-markdown. */
export const inlineComponents: Components = {
  strong: Strong,
  em: Emphasis,
  del: Strikethrough,
  br: LineBreak,
  span: Span,
  a: Link,
};
