import { ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { locateSections } from '@reader/md-ast';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';

const sections = locateSections(FORMAT_LLM_MD_CONTENT);

export default function GuideTopics() {
  return <div className="settings-guide-topics">
    {sections.map(section => {
      const body = <Markdown remarkPlugins={[remarkGfm]}>{FORMAT_LLM_MD_CONTENT.slice(section.bodyStart, section.bodyEnd)}</Markdown>;
      if (section.level < 2) {
        return <div className="settings-guide-intro" key={section.bodyStart}>{body}</div>;
      }
      return <details key={section.bodyStart} className="settings-guide-topic">
        <summary><span>{section.title}</span><ChevronRight size={17} aria-hidden="true" /></summary>
        <div className="settings-guide-body">{body}</div>
      </details>;
    })}
  </div>;
}
