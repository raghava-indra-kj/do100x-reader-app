import { useId } from "react";
import { observer } from "mobx-react-lite";
import { X, Clock, Minus, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@modules/core/ui/primitives/dialog";
import { Button } from "@modules/core/ui/primitives/button";
import type { TasksStore } from "../store";
export const StopTimerDialog = observer(({ store }: { store: TasksStore }) => {
  const title = useId(),
    notes = useId(),
    duration = useId();
  if (!store.isStopTimerDialogOpen) return null;
  const changed = store.stopTimerDurationAdjusted;
  const original = `${Math.floor(store.stopTimerOriginalSeconds / 60)}m ${store.stopTimerOriginalSeconds % 60}s`;
  const close = () => {
    if (!store.isTimerBusy) store.setIsStopTimerDialogOpen(false);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      labelledBy={title}
      className="max-w-md p-5 max-h-[90dvh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 id={title} className="flex items-center gap-2 font-semibold">
          <Clock size={18} />
          Save tracked time
        </h2>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip="Close"
          aria-label="Close tracked time"
          disabled={store.isTimerBusy}
          onClick={close}
        >
          <X size={17} />
        </Button>
      </div>
      <p className="text-sm mb-4 break-words">{store.stopTimerTaskTitle}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void store.completeStopTimer();
        }}
      >
        <fieldset disabled={store.isTimerBusy} className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] p-4">
            <p className="text-sm text-center mb-3">
              Tracked: <strong className="tabular-nums">{original}</strong>
            </p>
            <label
              htmlFor={duration}
              className="block text-xs text-center text-[var(--color-text-muted)] mb-2"
            >
              Adjust duration in minutes
            </label>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outlined"
                size="sm"
                iconOnly
                tooltip="Subtract 5 minutes"
                aria-label="Subtract 5 minutes"
                onClick={() => store.adjustStopTimerMinutes(-5)}
              >
                <Minus size={16} />
              </Button>
              <input
                id={duration}
                required
                type="number"
                min={1}
                max={527040}
                step={1}
                value={store.stopTimerDurationMinutes}
                onChange={(event) =>
                  store.setStopTimerDurationMinutes(Number(event.target.value))
                }
                className="w-20 text-center text-xl tabular-nums rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-2"
              />
              <Button
                type="button"
                variant="outlined"
                size="sm"
                iconOnly
                tooltip="Add 5 minutes"
                aria-label="Add 5 minutes"
                onClick={() => store.adjustStopTimerMinutes(5)}
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex justify-center gap-1 mt-3 flex-wrap">
              {[-15, -5, -1, 1, 5, 15].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => store.adjustStopTimerMinutes(value)}
                  aria-label={`${value > 0 ? "Add" : "Subtract"} ${Math.abs(value)} minutes`}
                >
                  {value > 0 ? "+" : ""}
                  {value}m
                </Button>
              ))}
            </div>
            <p className="text-xs text-center text-[var(--color-text-muted)] mt-3">
              {changed
                ? `Will save ${store.stopTimerDurationMinutes} minutes.`
                : "Your exact tracked seconds will be saved."}
            </p>
            {changed && (
              <button
                type="button"
                className="block mx-auto mt-2 text-xs text-[var(--color-brand)]"
                onClick={() => store.resetStopTimerDuration()}
              >
                Use tracked time
              </button>
            )}
          </div>
          <div>
            <label htmlFor={notes} className="block text-sm mb-2">
              Notes (optional)
            </label>
            <textarea
              id={notes}
              rows={3}
              maxLength={15000}
              value={store.stopTimerNotes}
              onChange={(event) => store.setStopTimerNotes(event.target.value)}
              placeholder="What did you work on?"
              className="w-full p-2 rounded-md text-sm border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)]"
            />
          </div>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-2 mt-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto"
            startIcon={<Trash2 size={14} />}
            disabled={store.isTimerBusy}
            onClick={() =>
              store.requestConfirmation({
                title: "Discard timer",
                message: "Discard this timer? Its time won’t be saved.",
                confirmLabel: "Discard timer",
                confirmVariant: "danger",
                onConfirm: () => store.discardActiveTimer(),
              })
            }
          >
            Discard
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={store.isTimerBusy}
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={store.isTimerBusy}
            loading={store.isTimerBusy}
          >
            Save time
          </Button>
        </div>
      </form>
    </Dialog>
  );
});
