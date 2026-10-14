import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

function cleanDocument(doc, base) {
    doc.querySelectorAll('script,style,link,meta,iframe,object,embed,form,input,textarea,select,button,[contenteditable],noscript,template,[hidden],[aria-hidden="true"]').forEach(node => node.remove());
    for (const element of doc.querySelectorAll('*')) {
        for (const attribute of [...element.attributes]) {
            if (!['href', 'src', 'alt', 'title', 'class', 'colspan', 'rowspan'].includes(attribute.name)) element.removeAttribute(attribute.name);
        }
        for (const name of ['href', 'src']) {
            if (!element.hasAttribute(name)) continue;
            try {
                const url = new URL(element.getAttribute(name), base);
                if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported link');
                url.username = ''; url.password = '';
                element.setAttribute(name, url.href);
            } catch { element.removeAttribute(name); }
        }
    }
}

export function extract(mode) {
    let title = document.title || 'Web capture';
    let doc;
    if (mode === 'selection') {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) throw new Error('Select a passage on the page first.');
        const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode?.parentElement;
        if (anchor?.closest('input,textarea,[contenteditable]')) throw new Error('Copy editable text and paste it explicitly into the extension instead.');
        doc = document.implementation.createHTMLDocument(title);
        for (let index = 0; index < selection.rangeCount; index++) doc.body.append(selection.getRangeAt(index).cloneContents());
    } else {
        doc = document.cloneNode(true);
    }
    cleanDocument(doc, location.href);
    let body = doc.body;
    if (mode === 'article') {
        const article = new Readability(doc, { maxElemsToParse: 50000, charThreshold: 100, disableJSONLD: true, serializer: element => element }).parse();
        if (!article?.textContent?.trim()) throw new Error('Couldn’t identify an article. Select the passage you want to read instead.');
        title = article.title || title;
        body = article.content;
    }
    const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
    converter.use(gfm);
    const content = converter.turndown(body).trim();
    if (!content) throw new Error('There is no readable text in this selection.');
    return { title: title.slice(0, 1000), content, sourceUrl: location.href };
}
