import type { NodeProps } from "../../types/node-props";
import type { LinkType } from "../../types/link";
import { sanitizeUrl } from "../../pipeline/url-transform";
import { useMdViewLinkClick } from "../../context/md-view-context";

interface LinkProps extends NodeProps {
  href?: string;
  title?: string;
}

/**
 * Classifies a sanitized href into one of four link types.
 * Called after sanitization so dangerous protocols are already stripped.
 *
 * Example: "https://example.com" → "external"
 * Example: "#section"            → "anchor"
 * Example: "mailto:a@b.com"      → "email"
 * Example: "/about" or "./page"  → "relative"
 */
function classifyLink(href: string): LinkType {
  if (/^https?:/i.test(href)) return "external";
  if (href.startsWith("#")) return "anchor";
  if (/^mailto:/i.test(href)) return "email";
  return "relative";
}

/** Anchor element with URL sanitization, external link safety, and optional click callback. */
export function Link({ href, title, children }: LinkProps) {
  const safe = sanitizeUrl(href);
  const onLinkClick = useMdViewLinkClick();

  const type = safe ? classifyLink(safe) : "relative";
  const external = type === "external";

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (safe && onLinkClick) {
      onLinkClick({ href: safe, type, originalEvent: e });
    }
  }

  return (
    <a
      href={safe}
      title={title}
      className="md-link"
      onClick={handleClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
