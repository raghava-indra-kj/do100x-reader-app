import { useEffect, useState, type RefObject } from 'react';
import { defaultMermaidTheme, type MdViewColors, type MdViewMermaidTheme } from '../types/theme';

const light: MdViewColors = {
  h1: '#172033', h2: '#172033', h3: '#172033', h4: '#172033', h5: '#172033', h6: '#172033',
  body: '#243044', muted: '#606b7c', link: '#315bd6', linkHover: '#2444a2',
  codeInlineBg: '#f1f3f6', codeInlineText: '#243044', codeBlockBg: '#f6f8fa', codeBlockText: '#243044',
  calloutBg: '#f6f8fa', calloutText: '#243044', surfaceBg: '#ffffff', border: '#dce1e8', borderStrong: '#aab4c2',
  marker: '#606b7c', scrollbarThumb: '#aab4c2', scrollbarTrack: 'transparent', tableHeaderText: '#172033',
  tableRowBg: '#ffffff', errorColor: '#b42318',
};

export function isDarkColor(color: string): boolean | undefined {
  const value = color.trim();
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value)?.[1];
  const rgb = hex ? (hex.length === 3 ? [...hex].map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)))
    : /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/.exec(value)?.slice(1, 4).map(Number);
  return rgb ? rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 < 128 : undefined;
}

/** Diagram engines need concrete colors; read them from the same CSS as the prose. */
export function useCssAppearance(ref: RefObject<HTMLElement | null>) {
  const [appearance, setAppearance] = useState<{ colors: MdViewColors | null; mermaid: MdViewMermaidTheme; scheme: 'light' | 'dark' }>({ colors: null, mermaid: defaultMermaidTheme, scheme: 'light' });
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => {
      const css = getComputedStyle(root);
      let background = css.getPropertyValue('--md-color-surfaceBg').trim();
      for (let element: HTMLElement | null = root; !background && element; element = element.parentElement) {
        const value = getComputedStyle(element).backgroundColor;
        if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') background = value;
      }
      const dark = isDarkColor(background) ?? (css.colorScheme === 'dark' || css.colorScheme !== 'light' && Boolean(media?.matches));
      const fallback = dark ? { ...light, h1: '#e6edf3', body: '#e6edf3', surfaceBg: '#161b22', codeBlockBg: '#0d1117', border: '#30363d', borderStrong: '#6e7681' } : light;
      const colors = Object.fromEntries(Object.entries(fallback).map(([key, value]) => [key, css.getPropertyValue(`--md-color-${key}`).trim() || value])) as MdViewColors;
      const mermaid = Object.fromEntries(Object.entries(defaultMermaidTheme).map(([key, value]) => [key, css.getPropertyValue(`--md-mermaid-${key}`).trim() || value])) as MdViewMermaidTheme;
      const next = { colors, mermaid, scheme: dark ? 'dark' as const : 'light' as const };
      setAppearance(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = new MutationObserver(update);
    for (let element: HTMLElement | null = root; element; element = element.parentElement) {
      observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'theme'] });
    }
    media?.addEventListener('change', update);
    return () => { observer.disconnect(); media?.removeEventListener('change', update); };
  }, [ref]);
  return appearance;
}
