import type { NodeProps } from "../../types/node-props";
import { sanitizeUrl } from "../../pipeline/url-transform";

interface IFrameProps extends NodeProps {
  src?: string;
  width?: string | number;
  height?: string | number;
  title?: string;
  loading?: string;
  allowFullScreen?: boolean;
  allow?: string;
  sandbox?: string;
}

/** Renders an iframe, optionally wrapped in a labelled frame showing the source URL. */
export function IFrame({ node, src, width, height, title, loading, allowFullScreen, allow, sandbox }: IFrameProps) {
  const safe = sanitizeUrl(src);
  if (!safe) return null;

  const hideFrame = node?.properties?.dataHideFrame !== undefined;

  const rawIframe = (
    <iframe
      className="md-iframe"
      src={safe}
      width={width}
      height={height}
      title={title}
      loading={loading as "lazy" | "eager" | undefined}
      allowFullScreen={allowFullScreen}
      allow={allow}
      sandbox={sandbox as string | undefined}
    />
  );

  if (hideFrame) return rawIframe;

  return (
    <div className="md-iframe-frame">
      <a
        className="md-iframe-label"
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
      >
        {safe}
      </a>
      {rawIframe}
    </div>
  );
}
