import { isDialogConsuming } from './clipboard-paste';

export function shortcutIsInControl(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || isDialogConsuming()) return true;
    if (event.target instanceof Element && event.target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="combobox"], [role="tablist"], [role="tree"], .reader-selection-popover',
    )) return true;
    return Boolean(document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'));
}
