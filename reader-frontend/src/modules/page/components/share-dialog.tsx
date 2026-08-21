import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { Check, Copy, Link2, Lock, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePageStore } from '../store';
import {
    createDocumentShareLink,
    listDocumentGrants,
    listDocumentShareLinks,
    revokeDocumentGrant,
    revokeDocumentShareLink,
    type CreatedShareLink,
    type DocumentGrant,
    type ShareLink,
    upsertDocumentGrant,
} from '@domain/page/services/document-share-service';

export interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
    const store = usePageStore();
    const [links, setLinks] = useState<ShareLink[]>([]);
    const [grants, setGrants] = useState<DocumentGrant[]>([]);
    const [createdLink, setCreatedLink] = useState<CreatedShareLink | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [personEmail, setPersonEmail] = useState('');
    const [personRole, setPersonRole] = useState<'viewer' | 'editor'>('viewer');
    const [sharingWithPerson, setSharingWithPerson] = useState(false);
    const [removingPersonId, setRemovingPersonId] = useState<string | null>(null);

    const loadLinks = useCallback(async () => {
        setLoading(true);
        const result = await listDocumentShareLinks(store.pageId);
        if (result.ok) {
            setLinks(result.data);
        } else {
            toast.error(result.error.message);
        }
        setLoading(false);
    }, [store.pageId]);

    const loadGrants = useCallback(async () => {
        const result = await listDocumentGrants(store.pageId);
        if (result.ok) {
            setGrants(result.data);
        } else {
            toast.error(result.error.message);
        }
    }, [store.pageId]);

    useEffect(() => {
        if (open) {
            void loadLinks();
            void loadGrants();
        }
    }, [open, loadLinks, loadGrants]);

    const shareUrl = useMemo(() => {
        if (!createdLink || typeof window === 'undefined') return null;
        return `${window.location.origin}/pages/${store.pageId}?share=${encodeURIComponent(createdLink.token)}`;
    }, [createdLink, store.pageId]);

    const activeLinks = links.filter((link) => {
        if (link.revokedAt) return false;
        return !link.expiresAt || link.expiresAt.getTime() > Date.now();
    });

    const createLink = async () => {
        setCreating(true);
        const result = await createDocumentShareLink({ documentId: store.pageId });
        setCreating(false);
        if (!result.ok) {
            toast.error(result.error.message);
            return;
        }
        setCreatedLink(result.data);
        await loadLinks();
        toast.success('Secure read-only link created');
    };

    const copyLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2_000);
            toast.success('Secure link copied to clipboard');
        } catch {
            toast.error('Failed to copy the link');
        }
    };

    const revokeLink = async (shareLinkId: string) => {
        setRevokingId(shareLinkId);
        const result = await revokeDocumentShareLink({ documentId: store.pageId, shareLinkId });
        setRevokingId(null);
        if (!result.ok) {
            toast.error(result.error.message);
            return;
        }
        setLinks((current) => current.map((link) => link.id === shareLinkId
            ? { ...link, revokedAt: new Date() }
            : link));
        if (createdLink?.id === shareLinkId) setCreatedLink(null);
        toast.success('Share link revoked');
    };

    const shareWithPerson = async () => {
        const email = personEmail.trim();
        if (!email) return;
        setSharingWithPerson(true);
        const result = await upsertDocumentGrant({ documentId: store.pageId, email, role: personRole });
        setSharingWithPerson(false);
        if (!result.ok) {
            toast.error(result.error.message);
            return;
        }
        setGrants((current) => [...current.filter((grant) => grant.userId !== result.data.userId), result.data]);
        setPersonEmail('');
        toast.success(`Access granted to ${result.data.email}`);
    };

    const removePerson = async (userId: string) => {
        setRemovingPersonId(userId);
        const result = await revokeDocumentGrant({ documentId: store.pageId, userId });
        setRemovingPersonId(null);
        if (!result.ok) {
            toast.error(result.error.message);
            return;
        }
        setGrants((current) => current.filter((grant) => grant.userId !== userId));
        toast.success('Access removed');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <div className="flex flex-col gap-5 p-1">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                            <Link2 size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Secure sharing</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">Create individually revocable, read-only links.</p>
                        </div>
                    </div>
                    <BaseDialog.Close className="cursor-pointer rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)]">
                        <X size={18} />
                    </BaseDialog.Close>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4">
                    <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-[var(--color-text-strong)]">Create a secure link</p>
                        <p className="text-xs leading-normal text-[var(--color-text-muted)]">The secret is shown once. It grants read-only access to this document only.</p>
                    </div>
                    <Button size="sm" onClick={() => void createLink()} loading={creating} className="shrink-0">Create link</Button>
                </div>

                <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4">
                    <div>
                        <p className="text-sm font-medium text-[var(--color-text-strong)]">Share with a person</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Grant an existing Reader account view or edit access to this document.</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={personEmail}
                            onChange={(event) => setPersonEmail(event.target.value)}
                            onKeyDown={(event) => { if (event.key === 'Enter') void shareWithPerson(); }}
                            placeholder="name@example.com"
                            className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-3 text-sm text-[var(--color-text-body)] outline-none"
                        />
                        <select value={personRole} onChange={(event) => setPersonRole(event.target.value as 'viewer' | 'editor')} className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-2 text-xs text-[var(--color-text-body)]">
                            <option value="viewer">Can view</option>
                            <option value="editor">Can edit</option>
                        </select>
                        <Button size="sm" loading={sharingWithPerson} disabled={!personEmail.trim()} onClick={() => void shareWithPerson()}>Share</Button>
                    </div>
                    {grants.length > 0 && (
                        <div className="space-y-1.5 border-t border-[var(--color-border-subtle)] pt-3">
                            {grants.map((grant) => (
                                <div key={grant.userId} className="flex items-center justify-between gap-3 py-1">
                                    <div className="min-w-0 text-xs">
                                        <p className="truncate font-medium text-[var(--color-text-body)]">{grant.displayName}</p>
                                        <p className="truncate text-[var(--color-text-muted)]">{grant.email} · can {grant.role}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" iconOnly loading={removingPersonId === grant.userId} onClick={() => void removePerson(grant.userId)} tooltip="Remove access" className="shrink-0 text-[var(--color-error)]"><Trash2 size={15} /></Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {shareUrl && (
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                        <p className="text-xs font-medium text-[var(--color-text-strong)]">Copy this link now—it cannot be recovered after you close this dialog.</p>
                        <div className="flex items-center gap-2">
                            <input readOnly value={shareUrl} className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-3 text-xs font-mono text-[var(--color-text-body)] outline-none" />
                            <Button variant="outlined" size="sm" onClick={() => void copyLink()} className="h-9 shrink-0 px-3">
                                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">Active links</p>
                        {loading && <span className="text-xs text-[var(--color-text-muted)]">Loading…</span>}
                    </div>
                    {activeLinks.length === 0 && !loading ? (
                        <p className="rounded-lg border border-dashed border-[var(--color-border-default)] px-3 py-3 text-xs text-[var(--color-text-muted)]">No active links. Your document is private to its workspace.</p>
                    ) : activeLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2.5">
                            <div className="min-w-0 text-xs text-[var(--color-text-muted)]">
                                <p className="font-medium text-[var(--color-text-body)]">Created {link.createdAt.toLocaleString()}</p>
                                <p>{link.expiresAt ? `Expires ${link.expiresAt.toLocaleString()}` : 'No expiry'}</p>
                            </div>
                            <Button variant="ghost" size="sm" iconOnly loading={revokingId === link.id} onClick={() => void revokeLink(link.id)} tooltip="Revoke link" className="text-[var(--color-error)]">
                                <Trash2 size={15} />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]/70 p-3 text-xs text-[var(--color-text-muted)]">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span><strong className="text-[var(--color-text-strong)]">Private by default.</strong> Links are opaque, hashed in storage, read-only, and revocable. Comments, vocabulary, workspace members, and provider credentials are never exposed.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                    <Lock size={14} className="mt-0.5 shrink-0" />
                    <span>Sharing a parent does not implicitly expose descendants; each document has explicit access.</span>
                </div>
            </div>
        </Dialog>
    );
}
