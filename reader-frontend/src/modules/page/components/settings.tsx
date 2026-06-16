import { usePageStore } from '../store';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { Select } from '@modules/core/ui/primitives/select';
import { FormLabel } from '@modules/core/ui/primitives/form-label';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { PageFontFamilies } from '../theme/page-font-families';
import { PageFontSizes } from '../theme/page-font-sizes';
import { PageHeadingLevel } from '../theme/page-heading-level';
import { Observer } from 'mobx-react-lite';
import { X } from 'lucide-react';

const fontFamilyItems = Object.fromEntries(PageFontFamilies.VALUES.map(f => [f.id, f.label]));
const fontSizeItems = Object.fromEntries(PageFontSizes.VALUES.map(s => [s.id, s.label]));
const headingLevelItems = Object.fromEntries(PageHeadingLevel.VALUES.filter(h => h.value !== null).map(h => [h.id, h.label]));

export interface PageSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PageSettingsDialog({ open, onOpenChange }: PageSettingsDialogProps) {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">Settings</h2>
                    <BaseDialog.Close className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]">
                        <X size={20} />
                    </BaseDialog.Close>
                </div>
                <div className="flex flex-col gap-2">
                    <FormLabel>Font Size</FormLabel>
                    <Observer>
                        {() => (
                            <Select
                                value={uiSettings.fontSize.id}
                                onValueChange={(id) => {
                                    const size = PageFontSizes.VALUES.find(s => s.id === id);
                                    if (size) uiSettings.setFontSize(size);
                                }}
                                items={fontSizeItems}
                                placeholder="Font Size"
                            />
                        )}
                    </Observer>
                </div>
                <div className="flex flex-col gap-2">
                    <FormLabel>Font Family</FormLabel>
                    <Observer>
                        {() => (
                            <Select
                                value={uiSettings.fontFamilies.id}
                                onValueChange={(id) => {
                                    const font = PageFontFamilies.VALUES.find(f => f.id === id);
                                    if (font) uiSettings.setFontFamilies(font);
                                }}
                                items={fontFamilyItems}
                                placeholder="Font"
                            />
                        )}
                    </Observer>
                </div>
                <div className="flex flex-col gap-2">
                    <FormLabel>Heading Level</FormLabel>
                    <Observer>
                        {() => (
                            <Select
                                value={uiSettings.headingLevel.id}
                                onValueChange={(id) => {
                                    const level = PageHeadingLevel.VALUES.find(h => h.id === id);
                                    if (level) uiSettings.setHeadingLevel(level);
                                }}
                                items={headingLevelItems}
                                placeholder="Heading"
                            />
                        )}
                    </Observer>
                </div>
                <div className="flex flex-col gap-2">
                    <FormLabel>Theme</FormLabel>
                    <ThemeSelector />
                </div>
            </div>
        </Dialog>
    );
}
