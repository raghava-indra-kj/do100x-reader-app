import type { Element, ElementContent, Root, RootContent } from "hast";

/** Custom block tags that the parser wraps in <p> but should stand alone. */
const UNWRAP_TAGS = new Set(["callout"]);

/** Checks if a node is whitespace-only text. */
function isBlankText(node: ElementContent | RootContent): boolean {
  return node.type === "text" && node.value.trim() === "";
}

/** Returns the custom block child if it is the only meaningful node in a paragraph. */
function loneUnwrappableChild(paragraph: Element): Element | undefined {
  const meaningful = paragraph.children.filter((child) => !isBlankText(child));
  const only = meaningful.length === 1 ? meaningful[0] : undefined;
  if (only && only.type === "element" && UNWRAP_TAGS.has(only.tagName)) return only;
  return undefined;
}

/** Recursively walks children and unwraps <p> wrappers around custom block elements. */
function walk(children: Array<RootContent | ElementContent>): void {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type !== "element") continue;
    if (child.tagName === "p") {
      const replacement = loneUnwrappableChild(child);
      if (replacement) {
        children[i] = replacement;
        walk(replacement.children);
        continue;
      }
    }
    walk(child.children);
  }
}

/** Strips <p> wrappers from custom block-level elements like callout. */
export default function rehypeUnwrapBlocks() {
  return (tree: Root) => {
    walk(tree.children);
  };
}
