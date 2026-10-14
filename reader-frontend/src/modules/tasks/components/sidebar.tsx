import { observer } from "mobx-react-lite";
import {
  Inbox,
  Calendar,
  CalendarDays,
  Grid,
  BarChart2,
  CheckCircle2,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Loader } from "@modules/core/ui/primitives/loader/loader";
import { Button } from "@modules/core/ui/primitives/button";
import { Link } from "react-router-dom";
import type { TasksStore } from "../store";

interface Props {
  store: TasksStore;
  onNavigate?: () => void;
}
const views = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "today", label: "Today", icon: Calendar },
  { id: "next7", label: "Next 7 days", icon: CalendarDays },
  { id: "matrix", label: "Priority matrix", icon: Grid },
  { id: "analytics", label: "Time reports", icon: BarChart2 },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];
const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none cursor-pointer data-[highlighted]:bg-[var(--color-surface-soft)]";
export const TasksSidebar = observer(({ store, onNavigate }: Props) => {
  const createList = () => {
    onNavigate?.();
    store.openCreateListDialog();
  };
  const rowClass = (active: boolean) =>
    `flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md ${active ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] font-semibold" : "text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)]"}`;
  return (
    <aside
      aria-label="Task navigation"
      className="w-56 shrink-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex flex-col h-full select-none"
    >
      <nav
        className="flex-1 overflow-y-auto p-2 space-y-4"
        aria-label="Task views and lists"
      >
        <div className="space-y-0.5">
          <h2 className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)]">
            Views
          </h2>
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                store.setCurrentView(id);
                onNavigate?.();
              }}
              aria-current={store.currentView === id ? "page" : undefined}
              className={`${rowClass(store.currentView === id)} w-full`}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {id === "inbox" && store.inboxCounts.uncompletedCount > 0 && (
                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                  {store.inboxCounts.uncompletedCount}
                </span>
              )}
            </button>
          ))}
          <Link to="/calendar" onClick={onNavigate} className={rowClass(false)}>
            <CalendarDays size={16} />
            Calendar
          </Link>
        </div>
        <div className="border-t border-[var(--color-border-subtle)] pt-2 space-y-0.5">
          <div className="flex items-center justify-between pl-3 pr-1">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)]">
              Lists
            </h2>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Create new list"
              tooltip="Create new list"
              onClick={createList}
            >
              <Plus size={16} />
            </Button>
          </div>
          {store.isLoadingLists ? (
            <div
              className="py-4 flex justify-center"
              role="status"
              aria-label="Loading lists"
            >
              <Loader size={16} />
            </div>
          ) : store.lists.length === 0 ? (
            <div className="px-3 py-3 text-sm text-[var(--color-text-muted)]">
              <p>No lists yet.</p>
              <button
                type="button"
                onClick={createList}
                className="mt-2 text-[var(--color-brand)]"
              >
                Add a list
              </button>
            </div>
          ) : (
            store.lists.map((list) => (
              <div key={list.id} className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    store.setCurrentView(`list:${list.id}`);
                    onNavigate?.();
                  }}
                  aria-current={
                    store.currentView === `list:${list.id}` ? "page" : undefined
                  }
                  className={rowClass(store.currentView === `list:${list.id}`)}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: list.color || "#3b82f6" }}
                  />
                  <span className="truncate flex-1">{list.name}</span>
                  {list.uncompletedCount > 0 && (
                    <span className="text-xs tabular-nums">
                      {list.uncompletedCount}
                    </span>
                  )}
                </button>
                <Menu.Root>
                  <Menu.Trigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Options for ${list.name}`}
                        tooltip={`Options for ${list.name}`}
                      />
                    }
                  >
                    <MoreVertical size={15} />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner
                      sideOffset={4}
                      align="end"
                      className="z-50"
                    >
                      <Menu.Popup className="w-40 p-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] shadow-lg outline-none">
                        <Menu.Item
                          className={itemClass}
                          onClick={() => {
                            onNavigate?.();
                            store.openEditListDialog(list);
                          }}
                        >
                          <Edit2 size={14} />
                          Edit list
                        </Menu.Item>
                        <Menu.Item
                          className={`${itemClass} text-[var(--color-error)]`}
                          onClick={() => {
                            onNavigate?.();
                            store.requestConfirmation({
                              title: "Delete list",
                              message: `Delete “${list.name}”? Its tasks will move to Inbox.`,
                              confirmLabel: "Delete list",
                              confirmVariant: "danger",
                              onConfirm: () => store.deleteList(list.id),
                            });
                          }}
                        >
                          <Trash2 size={14} />
                          Delete list
                        </Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </div>
            ))
          )}
        </div>
      </nav>
    </aside>
  );
});
