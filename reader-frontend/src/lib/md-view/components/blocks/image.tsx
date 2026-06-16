import { sanitizeUrl } from "../../pipeline/url-transform";

/** Props for the image element. */
interface ImageProps {
  src?: string;
  alt?: string;
  title?: string;
}

/** Image with URL sanitization, returns null for unsafe sources. */
export function Image({ src, alt, title }: ImageProps) {
  const safe = sanitizeUrl(src);
  if (!safe) return null;
  return <img className="md-image" src={safe} alt={alt ?? ""} title={title} />;
}
