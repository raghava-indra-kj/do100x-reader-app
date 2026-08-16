import { useState } from 'react';
import { Observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { 
    X, 
    Globe, 
    Lock, 
    Copy, 
    Check, 
    ShieldCheck, 
    Layers, 
    Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

export interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
    const store = usePageStore();
    const [copied, setCopied] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/pages/${store.pageId}`
        : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Public link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleTogglePublic = async (newPublicState: boolean) => {
        setIsUpdating(true);
        try {
            const res = await store.setPagePublic(newPublicState);
            if (res.ok) {
                toast.success(newPublicState ? 'Page & subpages are now public' : 'Page is now private');
            } else {
                toast.error('Failed to update share settings');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <Observer>
                {() => {
                    const isPublic = store.isPublic;
                    return (
                        <div className="flex flex-col gap-5 p-1">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                        isPublic 
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                                            : 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]'
                                    }`}>
                                        {isPublic ? <Globe size={18} /> : <Lock size={18} />}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-[var(--color-text-strong)] font-[family-name:var(--font-sans)]">
                                            Share Page &amp; Subpages
                                        </h2>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {isPublic ? 'Publicly accessible with link' : 'Only accessible by you'}
                                        </p>
                                    </div>
                                </div>
                                <BaseDialog.Close className="cursor-pointer p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-colors">
                                    <X size={18} />
                                </BaseDialog.Close>
                            </div>

                            {/* Public Access Switch Card */}
                            <div className="p-4 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-[var(--color-text-strong)]">
                                            Public Access
                                        </span>
                                        {isPublic && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] leading-normal">
                                        Allow anyone with the link to read this page and all its nested subpages.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isPublic}
                                    disabled={isUpdating}
                                    onClick={() => handleTogglePublic(!isPublic)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        isPublic ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-surface-soft)]'
                                    } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                            isPublic ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Share Link Input (Shown when public) */}
                            {isPublic && (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-xs font-medium text-[var(--color-text-strong)]">
                                        Shareable Link
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={shareUrl}
                                            className="flex-1 h-9 px-3 text-xs font-mono rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-body)] select-all outline-none"
                                        />
                                        <Button
                                            variant="outlined"
                                            size="sm"
                                            onClick={handleCopy}
                                            className="flex items-center gap-1.5 shrink-0 h-9 px-3"
                                        >
                                            {copied ? <Check size={14} className="text-[var(--color-brand)]" /> : <Copy size={14} />}
                                            <span>{copied ? 'Copied' : 'Copy'}</span>
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Feature & Privacy Guarantees */}
                            <div className="p-3.5 rounded-xl bg-[var(--color-surface-soft)]/70 border border-[var(--color-border-subtle)] space-y-2.5 text-xs text-[var(--color-text-muted)]">
                                <div className="flex items-start gap-2">
                                    <Layers size={14} className="text-[var(--color-brand)] shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-[var(--color-text-strong)]">Hierarchical Sharing:</strong> All current and future subpages under this page are automatically shared.
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-[var(--color-text-strong)]">Strict Privacy:</strong> Your personal comments, highlights, and vocabulary terms remain private and are never shared.
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-[var(--color-text-strong)]">AI Key Security:</strong> Your OpenAI/LLM credentials are never used by guests. Guests use their own keys.
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }}
            </Observer>
        </Dialog>
    );
}
