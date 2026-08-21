import { apiClient } from '@core/api/api-client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pagesPageWithIdRouteValue } from '@boot/routes';

interface WorkspaceOption {
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    readerSpace: { id: string; name: string; homeDocumentId: string | null } | null;
}

/** A document always carries its Reader-space ID, so this selector can switch
 * workspaces without persisting generic app state on the account record. */
export function WorkspaceSwitcher({ activeReaderSpaceId }: { activeReaderSpaceId: string | null }) {
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);

    useEffect(() => {
        let active = true;
        apiClient.get('/workspaces').then(({ data }) => {
            if (active) setWorkspaces(data as WorkspaceOption[]);
        }).catch(() => {
            // The reader remains usable when the workspace picker is unavailable.
        });
        return () => { active = false; };
    }, []);

    if (workspaces.length < 2) return null;
    const value = workspaces.find((workspace) => workspace.readerSpace?.id === activeReaderSpaceId)?.id ?? '';
    return (
        <select
            aria-label="Switch workspace"
            value={value}
            onChange={(event) => {
                const workspace = workspaces.find((candidate) => candidate.id === event.target.value);
                if (workspace?.readerSpace?.homeDocumentId) navigate(pagesPageWithIdRouteValue(workspace.readerSpace.homeDocumentId));
            }}
            className="hidden max-w-40 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-2 py-1 text-xs text-[var(--color-text-body)] outline-none sm:block"
        >
            {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id} disabled={!workspace.readerSpace?.homeDocumentId}>
                    {workspace.name} · {workspace.role}
                </option>
            ))}
        </select>
    );
}
