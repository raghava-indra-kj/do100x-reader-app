import { toast } from '@modules/core/ui/primitives/toast/toast';

/** Report success only once the browser has accepted the clipboard write. */
export async function copyReaderText(text: string, successMessage: string): Promise<boolean> {
    try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
        return true;
    } catch {
        toast.error('Couldn’t copy. Check clipboard permission or select the text and copy it manually.');
        return false;
    }
}
