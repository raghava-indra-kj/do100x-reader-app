import { parseMarkdown, serializeMarkdown } from "./index";
import type { MdSection } from "./types";
import testFile from "./test-file.md?raw";

const doc = parseMarkdown(testFile);
const serialized = serializeMarkdown(doc);

function SectionTree({ sections, depth = 0 }: { sections: MdSection[]; depth?: number }) {
    return (
        <>
            {sections.map((s) => (
                <div key={s.id} style={{ marginLeft: depth * 20 }} className="border-l border-gray-300 pl-3 mb-2">
                    <div className="text-sm">
                        <span className="font-mono text-blue-600">h{s.level || "∅"}</span>
                        {" · "}
                        <span className="font-semibold">
                            {s.title ?? <em className="text-gray-400">preamble</em>}
                        </span>
                        {s.rawTitle !== s.title && (
                            <span className="ml-2 text-xs text-gray-500 font-mono">raw: {s.rawTitle}</span>
                        )}
                    </div>
                    {s.content && (
                        <div className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-xl">
                            {s.content.slice(0, 100)}{s.content.length > 100 ? "…" : ""}
                        </div>
                    )}
                    {s.children.length > 0 && <SectionTree sections={s.children} depth={depth + 1} />}
                </div>
            ))}
        </>
    );
}

export default function MdParserDemoPage() {
    return (
        <div className="mx-auto max-w-4xl px-8 py-10 font-sans">

            <h1 className="text-xl font-bold mb-1">md-parser demo</h1>
            <p className="text-sm text-gray-500 mb-8">Parsing <code>test-file.md</code></p>

            <section className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Frontmatter</h2>
                <pre className="bg-gray-900 text-green-300 text-xs rounded p-4 overflow-x-auto">
                    {JSON.stringify(doc.frontmatter, null, 2)}
                </pre>
            </section>

            <section className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Section tree — {doc.sections.length} root sections
                </h2>
                <div className="border border-gray-200 rounded p-4 bg-gray-50">
                    <SectionTree sections={doc.sections} />
                </div>
            </section>

            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Serialized output</h2>
                <pre className="bg-gray-900 text-gray-100 text-xs rounded p-4 overflow-x-auto whitespace-pre-wrap">
                    {serialized}
                </pre>
            </section>

        </div>
    );
}
