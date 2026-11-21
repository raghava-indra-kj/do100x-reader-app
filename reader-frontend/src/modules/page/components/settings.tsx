import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Observer } from 'mobx-react-lite';
import { Copy, Server, X } from 'lucide-react';
import { settingsPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { Button } from '@modules/core/ui/primitives/button';
import { BaseDialog, Dialog } from '@modules/core/ui/primitives/dialog';
import { Select } from '@modules/core/ui/primitives/select';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { ReaderToolIcon } from '@modules/reader/reader-tool-icon';
import { usePageStore } from '../store';
import { PageFontFamilies } from '../theme/page-font-families';
import { PageFontSizes } from '../theme/page-font-sizes';
import { PageHeadingLevel } from '../theme/page-heading-level';
import { copyReaderText } from './reader-clipboard';
import './reading-settings.css';

const fontFamilyItems = Object.fromEntries(PageFontFamilies.VALUES.map(f => [f.id, f.label]));
const fontSizeItems = Object.fromEntries(PageFontSizes.VALUES.map(s => [s.id, s.label]));
const headingLevelItems = Object.fromEntries(PageHeadingLevel.VALUES.filter(h => h.value !== null).map(h => [h.id, h.label]));

const readingWidths = [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'wide', label: 'Wide' },
    { value: 'full', label: 'Full width' },
] as const;

export interface PageSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PageSettingsDialog({ open, onOpenChange }: PageSettingsDialogProps) {
    const uiSettings = usePageStore().uiSettingsStore;
    const auth = useAuthStore();
    const choicesId = useId();

    const copyConfiguration = () => {
        const user = auth.optCurrentUser;
        if (!user) return;
        const serverUrl = `${window.location.origin}/sse/${user.id}`;
        void copyReaderText(JSON.stringify({ mcpServers: { reader: { serverUrl } } }, null, 2), 'MCP configuration copied');
    };

    return <Dialog open={open} onOpenChange={onOpenChange} className="reader-settings-dialog" labelledBy={`${choicesId}-title`}>
        <header className="reader-settings-header">
            <ReaderToolIcon name="reading-settings" size={21} />
            <BaseDialog.Title id={`${choicesId}-title`}>Reading settings</BaseDialog.Title>
            <Tooltip content="Close reading settings"><BaseDialog.Close aria-label="Close reading settings">
                <X size={18} aria-hidden="true" />
            </BaseDialog.Close></Tooltip>
        </header>
        <Observer>{() => <div className="reader-settings-body">
            <fieldset className="reader-settings-field reader-settings-span" aria-describedby={`${choicesId}-width-hint`}>
                <legend>Reading width</legend>
                <div className="reader-settings-widths">
                    {readingWidths.map(({ value, label }) => <label key={value} className="reader-width-option">
                        <input type="radio" name={`${choicesId}-width`} value={value} checked={uiSettings.readingWidth === value}
                            onChange={() => uiSettings.setReadingWidth(value)} />
                        <span className={`reader-width-mark is-${value}`} aria-hidden="true"><i /><i /><i /></span>
                        <span>{label}</span>
                    </label>)}
                </div>
                <p id={`${choicesId}-width-hint`}>Applies to text and tables.</p>
            </fieldset>
            <div className="reader-settings-field">
                <span>Font</span>
                <Select ariaLabel="Font" value={uiSettings.fontFamilies.id} items={fontFamilyItems}
                    onValueChange={id => {
                        const font = PageFontFamilies.VALUES.find(f => f.id === id);
                        if (font) uiSettings.setFontFamilies(font);
                    }} />
            </div>
            <div className="reader-settings-field">
                <span>Text size</span>
                <Select ariaLabel="Text size" value={uiSettings.fontSize.id} items={fontSizeItems}
                    onValueChange={id => {
                        const size = PageFontSizes.VALUES.find(s => s.id === id);
                        if (size) uiSettings.setFontSize(size);
                    }} />
            </div>
            <div className="reader-settings-field">
                <span>Theme</span>
                <ThemeSelector />
            </div>
            <div className="reader-settings-field">
                <span>Default section depth</span>
                <Select ariaLabel="Default section depth" value={uiSettings.defaultHeadingLevel.id} items={headingLevelItems}
                    onValueChange={id => {
                        const level = PageHeadingLevel.VALUES.find(h => h.id === id);
                        if (level) uiSettings.setDefaultHeadingLevel(level);
                    }} />
            </div>
            <details className="reader-settings-integrations reader-settings-span">
                <summary>Import and integration tools</summary>
                <div>
                    {auth.isAuthenticated && <Button variant="outlined" size="sm" onClick={copyConfiguration} startIcon={<Server size={14} />}>
                        Copy MCP configuration
                    </Button>}
                    <Button variant="outlined" size="sm" onClick={() => void copyReaderText(FORMAT_LLM_MD_CONTENT, 'Format guide copied')} startIcon={<Copy size={14} />}>
                        Copy format guide
                    </Button>
                    <Link to={settingsPageRoute} onClick={() => onOpenChange(false)}>Account settings</Link>
                </div>
            </details>
        </div>}</Observer>
    </Dialog>;
}
