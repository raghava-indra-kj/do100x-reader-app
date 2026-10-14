import { useId } from "react";
import { observer } from "mobx-react-lite";
import { Clock, Minus, Plus, X } from "lucide-react";
import { Dialog } from "@modules/core/ui/primitives/dialog";
import { Button } from "@modules/core/ui/primitives/button";
import type { TasksStore } from "../store";
const input =
  "w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-2 text-sm";
export const SessionDialog = observer(({ store }: { store: TasksStore }) => {
  const title = useId();
  if (!store.isSessionDialogOpen) return null;
  const close = () => {
    if (!store.isSavingSession) store.setIsSessionDialogOpen(false);
  };
  return (
    <Dialog
      open
      labelledBy={title}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      className="max-w-md max-h-[90dvh] overflow-y-auto p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 id={title} className="flex items-center gap-2 font-semibold">
          <Clock size={18} />
          {store.editingSessionId ? "Edit time entry" : "Add time entry"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip="Close"
          aria-label="Close time entry"
          disabled={store.isSavingSession}
          onClick={close}
        >
          <X size={17} />
        </Button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void store.saveSession();
        }}
      >
        <fieldset disabled={store.isSavingSession} className="space-y-4">
          <div>
            <label className="block text-sm mb-2" htmlFor={`${title}-duration`}>
              Duration in minutes
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outlined"
                iconOnly
                tooltip="Subtract 5 minutes"
                aria-label="Subtract 5 minutes"
                onClick={() => store.adjustSessionDuration(-5)}
              >
                <Minus size={16} />
              </Button>
              <input
                id={`${title}-duration`}
                required
                type="number"
                min={1}
                max={527040}
                step={1}
                value={store.sessionDurationMinutes}
                onChange={(event) =>
                  store.setSessionDurationMinutes(Number(event.target.value))
                }
                className={`${input} flex-1 min-w-0 text-center tabular-nums`}
              />
              <Button
                type="button"
                variant="outlined"
                iconOnly
                tooltip="Add 5 minutes"
                aria-label="Add 5 minutes"
                onClick={() => store.adjustSessionDuration(5)}
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex gap-1 justify-between mt-2">
              {[15, 25, 30, 45, 60].map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Set duration to ${minutes} minutes`}
                  onClick={() => store.setSessionDurationMinutes(minutes)}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
            {store.editingSessionId && !store.sessionDurationAdjusted && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                The original seconds are preserved unless you adjust the
                duration.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Date
              <input
                aria-label="Time entry date"
                required
                type="date"
                min="1900-01-01"
                max="9998-12-31"
                value={store.sessionDateInput}
                onInput={(event) =>
                  store.setSessionDateInput(event.currentTarget.value)
                }
                className={`${input} mt-1`}
              />
            </label>
            <label className="text-sm">
              Started at
              <input
                aria-label="Time entry start time"
                required
                type="time"
                value={store.sessionTimeInput}
                onInput={(event) =>
                  store.setSessionTimeInput(event.currentTarget.value)
                }
                className={`${input} mt-1`}
              />
            </label>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
          <label className="block text-sm">
            Notes (optional)
            <textarea
              aria-label="Time entry notes"
              rows={3}
              maxLength={15000}
              value={store.sessionNotesInput}
              onChange={(event) =>
                store.setSessionNotesInput(event.target.value)
              }
              placeholder="What did you work on?"
              className={`${input} mt-1 resize-y`}
            />
          </label>
        </fieldset>
        <div className="flex justify-end gap-2 mt-5">
          <Button
            variant="outlined"
            type="button"
            disabled={store.isSavingSession}
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={store.isSavingSession}
            disabled={store.isSavingSession}
          >
            {store.editingSessionId ? "Save time entry" : "Add time entry"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
});
