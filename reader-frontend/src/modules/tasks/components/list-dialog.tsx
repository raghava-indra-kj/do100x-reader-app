import { useId } from 'react';
import { observer } from 'mobx-react-lite';
import { Check } from 'lucide-react';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import type { TasksStore } from '../store';
const colors = { Blue: '#3b82f6', Green: '#10b981', Violet: '#8b5cf6', Pink: '#ec4899', Amber: '#f59e0b', Red: '#ef4444', Cyan: '#06b6d4', Slate: '#64748b' };
export const ListDialog = observer(({ store }: { store: TasksStore }) => {
  const id = useId(), nameId = useId();
  if (!store.isListDialogOpen) return null;
  const close = () => { if (!store.isSavingList) store.setIsListDialogOpen(false); };
  return <Dialog open onOpenChange={open => { if (!open) close(); }} labelledBy={id} className="max-w-sm p-5"><form onSubmit={event => { event.preventDefault(); void store.saveList(); }}>
    <h2 id={id} className="font-semibold text-base mb-4">{store.editingListId ? 'Edit list' : 'New list'}</h2>
    <label htmlFor={nameId} className="block text-sm mb-2">List name</label><input id={nameId} required maxLength={255} disabled={store.isSavingList} value={store.listNameInput} onChange={event => store.setListNameInput(event.target.value)} placeholder="Work, Reading, Personal…" className="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-3 py-2 text-sm" />
    <fieldset className="my-4" disabled={store.isSavingList}><legend className="text-sm mb-3">Color</legend><div className="flex justify-between">{Object.entries(colors).map(([name, color]) => <Button key={color} type="button" iconOnly size="sm" variant="ghost" tooltip={name} aria-label={name} aria-pressed={store.listColorInput === color} onClick={() => store.setListColorInput(color)} className="rounded-full" style={{ backgroundColor: color, color: 'white' }}>{store.listColorInput === color ? <Check size={15} /> : <span className="w-[15px] h-[15px]" />}</Button>)}</div></fieldset>
    <div className="flex justify-end gap-2"><Button variant="outlined" type="button" disabled={store.isSavingList} onClick={close}>Cancel</Button><Button type="submit" disabled={store.isSavingList || !store.listNameInput.trim()} loading={store.isSavingList}>{store.editingListId ? 'Save' : 'Create list'}</Button></div>
  </form></Dialog>;
});
