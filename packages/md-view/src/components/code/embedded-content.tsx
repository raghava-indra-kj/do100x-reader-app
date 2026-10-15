import { createContext, useContext, type ComponentType } from 'react';
import { CodeBlock } from './code-block';

export interface EmbeddedContent { type: string; id: string; [key: string]: unknown }
export type EmbeddedContentRenderers = Readonly<Record<string, ComponentType<{ value: EmbeddedContent }>>>;
export const EmbeddedContentContext = createContext<EmbeddedContentRenderers>({});

/** Data-only extension point. The host owns loading, permissions and component behavior. */
export function EmbeddedContentBlock({ source }: { source: string }) {
    const renderers = useContext(EmbeddedContentContext);
    let value: EmbeddedContent;
    try {
        value = JSON.parse(source);
        if (!value || Array.isArray(value) || typeof value.type !== 'string' || typeof value.id !== 'string') throw new Error('Invalid embed');
    } catch { return <CodeBlock language="reader-component">{source}</CodeBlock>; }
    const Renderer = Object.hasOwn(renderers, value.type) ? renderers[value.type] : undefined;
    return Renderer ? <Renderer value={value} /> : <CodeBlock language="reader-component">{source}</CodeBlock>;
}
