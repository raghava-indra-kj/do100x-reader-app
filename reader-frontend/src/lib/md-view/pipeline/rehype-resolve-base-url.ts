import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import type { Plugin } from "unified";
import { resolveRelativeUrl } from "./url-transform";

/**
 * Maps each HTML tag to the attributes that carry URLs.
 * Only tags that can appear in md-view output are listed.
 */
const URL_ATTRS: Record<string, string[]> = {
    img: ["src"],
    video: ["src", "poster"],
    audio: ["src"],
    source: ["src"],
    track: ["src"],
    iframe: ["src"],
};

/**
 * Rehype plugin that resolves relative URLs in raw HTML element attributes.
 * Walks the hast tree and rewrites src/poster on media and iframe elements.
 * Absolute URLs are left untouched — only relative URLs are resolved.
 *
 * Must run BEFORE rehype-sanitize so sanitize sees the resolved (absolute) URLs.
 *
 * Example: <video src="./clip.mp4"> with base "https://cdn.example.com/docs/"
 *       → <video src="https://cdn.example.com/docs/clip.mp4">
 */
export function rehypeResolveBaseUrl(baseUrl: string): Plugin<[], Root> {
    return () => (tree: Root) => {
        visit(tree, "element", (node: Element) => {
            const attrs = URL_ATTRS[node.tagName];
            if (!attrs || !node.properties) return;

            for (const attr of attrs) {
                const val = node.properties[attr];
                if (typeof val === "string") {
                    node.properties[attr] = resolveRelativeUrl(val, baseUrl);
                }
            }
        });
    };
}
