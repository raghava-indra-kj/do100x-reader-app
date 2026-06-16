import type {} from "mdast-util-math";
import type { Paragraph, Parent, PhrasingContent, Root, RootContent } from "mdast";

/** Checks if a phrasing node is whitespace-only text. */
function isBlankText(node: PhrasingContent): boolean {
  return node.type === "text" && node.value.trim() === "";
}

/** Returns the lone inlineMath child if it is the only meaningful node in a paragraph. */
function loneInlineMath(paragraph: Paragraph) {
  const meaningful = paragraph.children.filter((child) => !isBlankText(child));
  const only = meaningful.length === 1 ? meaningful[0] : undefined;
  return only && only.type === "inlineMath" ? only : undefined;
}

/** Recursively walks the tree and promotes lone inline-math paragraphs to display math. */
function walk(parent: Parent): void {
  parent.children.forEach((node, index) => {
    if (node.type === "paragraph") {
      const inline = loneInlineMath(node);
      if (inline) {
        const value = inline.value;
        parent.children[index] = {
          type: "math",
          value,
          data: {
            hName: "div",
            hProperties: { className: ["math", "math-display"] },
            hChildren: [{ type: "text", value }],
          },
        } as RootContent;
        return;
      }
    }
    if ("children" in node) walk(node);
  });
}

/** Promotes lone inline-math paragraphs to display-math blocks. */
export default function remarkDisplayMath() {
  return (tree: Root) => {
    walk(tree);
  };
}
