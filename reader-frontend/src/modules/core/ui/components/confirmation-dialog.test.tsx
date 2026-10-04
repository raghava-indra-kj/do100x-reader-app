import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@modules/core/ui/primitives/dialog', () => ({ Dialog: ({ open, children, labelledBy, describedBy }: { open: boolean; children: ReactNode; labelledBy: string; describedBy: string }) => open ? <div role="dialog" aria-labelledby={labelledBy} aria-describedby={describedBy}>{children}</div> : null }));
import { ConfirmationDialog } from './confirmation-dialog';

describe('shared confirmation presentation', () => {
    const props = { open: true, title: 'Discard changes?', description: 'Unsaved changes will be lost.', confirmLabel: 'Discard changes', cancelLabel: 'Keep editing', onCancel: vi.fn(), onConfirm: vi.fn() };
    it('labels the dialog and puts the safe action before the destructive action', () => {
        const html = renderToStaticMarkup(<ConfirmationDialog {...props} />);
        expect(html).toContain('aria-labelledby=');
        expect(html).toContain('aria-describedby=');
        expect(html).toContain('Discard changes?</h2>');
        expect(html.indexOf('Keep editing')).toBeLessThan(html.indexOf('>Discard changes</button>'));
    });
    it('disables both actions while pending and displays errors', () => {
        const html = renderToStaticMarkup(<ConfirmationDialog {...props} pending error="Couldn’t delete comments." />);
        expect(html.match(/disabled=""/g)).toHaveLength(2);
        expect(html).toContain('role="alert"');
        expect(html).toContain('Couldn’t delete comments.');
    });
    it('does not render a closed confirmation', () => {
        expect(renderToStaticMarkup(<ConfirmationDialog {...props} open={false} />)).toBe('');
    });
});
