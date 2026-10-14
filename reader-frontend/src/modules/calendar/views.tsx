import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { CalendarDays, Check, CircleCheck, Clock3, GripHorizontal, ListTodo, Sprout } from 'lucide-react';
import { addDays, arrangeOverlaps, datesBetween, wallAt, weekday, weekStart } from '@reader/calendar-core';
import { formatTrackedDuration } from '@domain/tasks/models/duration';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import type { CalendarPreferences } from './api';
import { displaySegmentsOn, formatDate, itemsOn, plannedMinutes, type CalendarItem } from './model';

export const dragType = 'application/x-do100x-calendar';
export function beginDrag(event: DragEvent, key: string, resize = false) { event.dataTransfer.setData(dragType, JSON.stringify({ key, resize })); event.dataTransfer.effectAllowed = 'move'; }
type Props = { items: CalendarItem[]; date: string; today: string; preferences: CalendarPreferences; disabled: boolean; onOpen: (item: CalendarItem) => void; onCreate: (wall: string, allDay?: boolean) => void; onDay: (date: string) => void; onDrop: (key: string, wall: string, allDay: boolean, resize: boolean) => void };
function dropProps(props: Props, wall: string, allDay: boolean) {
  return { onDragOver: (event: DragEvent) => { if (!props.disabled && event.dataTransfer.types.includes(dragType)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }, onDrop: (event: DragEvent) => {
    event.preventDefault(); if (props.disabled) return;
    try { const value = JSON.parse(event.dataTransfer.getData(dragType)); if (typeof value.key === 'string' && typeof value.resize === 'boolean') props.onDrop(value.key, wall, allDay, value.resize); } catch { /* Ignore unrelated browser drops. */ }
  } };
}
const itemIcon = { event: CalendarDays, task: ListTodo, habit: Sprout, focus: Clock3 };
export function ItemChip({ item, onOpen, disabled, timed = false, compact = false, children }: { item: CalendarItem; onOpen: (item: CalendarItem) => void; disabled: boolean; timed?: boolean; compact?: boolean; children?: ReactNode }) {
  const Icon = itemIcon[item.kind];
  const time = item.allDay ? 'All day' : `${item.start.slice(11)}${item.start === item.end ? ' · due' : `–${item.end.slice(11)}`}`;
  return <Tooltip content={`${item.title} · ${time}${item.external ? ` · ${item.external.sourceName}, read-only` : ''}`}><button type="button" className={`calendar-chip kind-${item.kind} ${item.completed ? 'is-completed' : ''} ${timed ? 'is-timed' : ''} ${compact ? 'is-compact' : ''}`} style={{ '--event-color': item.color } as CSSProperties} disabled={disabled} draggable={!disabled && item.kind !== 'focus' && !item.external} onDragStart={event => beginDrag(event, item.key)} onClick={() => onOpen(item)} aria-label={`${item.title}, ${item.allDay ? 'all day' : item.start.slice(11)}, ${item.external ? `${item.external.sourceName}, read-only` : item.kind}${item.completed ? ', completed' : ''}`}>
    <span className="calendar-chip-heading">{item.completed ? <Check size={13} /> : <Icon size={13} />}<strong>{item.title}</strong>{compact && <span className="calendar-chip-time">{item.start.slice(11)}</span>}</span>{timed && !compact && <small>{time}</small>}{children}
  </button></Tooltip>;
}
export function TimeGrid(props: Props & { days: string[]; clock: Date }) {
  const scroll = useRef<HTMLDivElement>(null);
  const { days, preferences, items } = props;
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = Math.max(0, preferences.workStart * 52 - 20); }, [days[0], preferences.workStart]);
  useEffect(() => {
    const container = scroll.current;
    if (container && container.clientWidth <= 600 && days.length > 1) container.scrollLeft = Math.max(0, days.indexOf(props.date)) * 160;
  }, [props.date, days[0], days.length]);
  const now = wallAt(props.clock, preferences.timeZone), currentMinute = Number(now.slice(11, 13)) * 60 + Number(now.slice(14));
  return <div className="calendar-time-view" ref={scroll} style={{ '--calendar-days': days.length } as CSSProperties}>
    <div className="calendar-day-headings"><span className="calendar-zone-label">{preferences.timeZone.split('/').pop()?.replaceAll('_', ' ')}</span>{days.map(date => {
      const minutes = plannedMinutes(items, date, preferences);
      return <button key={date} className={date === props.today ? 'is-today' : ''} onClick={() => props.onDay(date)}><span>{formatDate(date, { weekday: 'short' })}</span><strong>{formatDate(date, { day: 'numeric' })}</strong><small>{minutes ? `${formatTrackedDuration(minutes * 60)} planned` : 'Open day'}</small></button>;
    })}</div>
    <div className="calendar-all-day"><span>All day</span>{days.map(date => <div key={date} {...dropProps(props, `${date}T00:00`, true)}>{itemsOn(items, date).filter(item => item.allDay).map(item => <ItemChip key={item.key} item={item} onOpen={props.onOpen} disabled={props.disabled} />)}<button className="calendar-add-day" aria-label={`Add all-day event on ${formatDate(date)}`} disabled={props.disabled} onClick={() => props.onCreate(`${date}T00:00`, true)}>+</button></div>)}</div>
    <div className="calendar-time-scroll"><div className="calendar-time-columns"><div className="calendar-hours" aria-hidden="true">{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: `${hour * 52}px` }}>{String(hour).padStart(2, '0')}:00</span>)}</div>
      {days.map(date => <div key={date} className={`calendar-time-day ${preferences.workDays.includes(weekday(date)) ? '' : 'is-offday'}`}>
        <div className="calendar-working-hours" style={{ top: preferences.workStart * 52, height: (preferences.workEnd - preferences.workStart) * 52 }} />
        <div className="calendar-time-slots">{Array.from({ length: 48 }, (_, slot) => {
          const time = `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 ? '30' : '00'}`, wall = `${date}T${time}`;
          return <button key={slot} type="button" tabIndex={-1} disabled={props.disabled} aria-label={`New event ${formatDate(date)}, ${time}`} onClick={() => props.onCreate(wall)} {...dropProps(props, wall, false)} />;
        })}</div>
        {arrangeOverlaps(displaySegmentsOn(items, date)).map(({ event: segment, column, columns }) => <div key={segment.item.key} className="calendar-time-block" style={{ top: `${segment.startMinute / 60 * 52}px`, height: `${Math.max(22, (segment.endMinute - segment.startMinute) / 60 * 52 - 2)}px`, left: `calc(${column / columns * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}>
          <ItemChip item={segment.item} onOpen={props.onOpen} disabled={props.disabled} timed compact={segment.endMinute - segment.startMinute <= 45} />
          {segment.item.event && !props.disabled && <Tooltip content="Drag to change the end time, or open the event to edit"><button type="button" className="calendar-resize" aria-label={`Edit duration of ${segment.item.title}`} draggable onDragStart={event => { event.stopPropagation(); beginDrag(event, segment.item.key, true); }} onClick={() => props.onOpen(segment.item)}><GripHorizontal size={13} /></button></Tooltip>}
        </div>)}
        {date === now.slice(0, 10) && <div className="calendar-now" style={{ top: `${currentMinute / 60 * 52}px` }} aria-label={`Current time ${now.slice(11)}`} />}
      </div>)}
    </div></div>
  </div>;
}
export function MonthView(props: Props) {
  const container = useRef<HTMLDivElement>(null), [capacity, setCapacity] = useState(2);
  useEffect(() => { const element = container.current; if (!element) return; const observer = new ResizeObserver(() => setCapacity(Math.max(1, Math.min(6, Math.floor(((element.clientHeight - 30) / 6 - 57) / 23))))); observer.observe(element); return () => observer.disconnect(); }, []);
  const first = weekStart(`${props.date.slice(0, 7)}-01`, props.preferences.firstDay);
  const days = datesBetween(first, addDays(first, 41));
  return <div className="calendar-month" ref={container}><div className="calendar-weekday-headings">{days.slice(0, 7).map(date => <span key={date}>{formatDate(date, { weekday: 'short' })}</span>)}</div><div className="calendar-month-grid">{days.map(date => {
    const entries = itemsOn(props.items, date);
    return <div key={date} className={`calendar-month-day ${date.slice(0, 7) !== props.date.slice(0, 7) ? 'outside-month' : ''} ${date === props.today ? 'is-today' : ''}`} {...dropProps(props, `${date}T09:00`, false)}>
      <header><button onClick={() => props.onDay(date)} aria-label={`View ${formatDate(date, { dateStyle: 'full' })}`}>{Number(date.slice(8))}</button><button className="calendar-add-day" aria-label={`Add event on ${formatDate(date)}`} disabled={props.disabled} onClick={() => props.onCreate(`${date}T09:00`)}>+</button></header>
      {entries.slice(0, capacity).map(item => <ItemChip key={item.key} item={item} onOpen={props.onOpen} disabled={props.disabled}>{!item.allDay && <small>{item.start.slice(11)}</small>}</ItemChip>)}
      {entries.length > capacity && <button className="calendar-more" onClick={() => props.onDay(date)}>+{entries.length - capacity} more</button>}
      {entries.length > 0 && <button className="calendar-month-summary" onClick={() => props.onDay(date)} aria-label={`View ${entries.length} ${entries.length === 1 ? 'item' : 'items'} on ${formatDate(date, { dateStyle: 'full' })}`}><span aria-hidden="true">{[...new Set(entries.map(item => item.color))].slice(0, 3).map(color => <i key={color} style={{ background: color }} />)}</span>{entries.length} {entries.length === 1 ? 'item' : 'items'}</button>}
    </div>;
  })}</div></div>;
}
export function YearView(props: Props) {
  return <div className="calendar-year">{Array.from({ length: 12 }, (_, month) => {
    const start = `${props.date.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-01`, first = weekStart(start, props.preferences.firstDay);
    return <section key={month}><h2>{formatDate(start, { month: 'long' })}</h2><div className="calendar-mini-week">{datesBetween(first, addDays(first, 6)).map(date => <span key={date}>{formatDate(date, { weekday: 'narrow' })}</span>)}</div><div className="calendar-mini-days">{datesBetween(first, addDays(first, 41)).map(date => {
      if (date.slice(0, 7) !== start.slice(0, 7)) return <span key={date} />;
      const count = itemsOn(props.items, date).length;
      return <Tooltip key={date} content={`${formatDate(date)} · ${count} items`}><button className={date === props.today ? 'is-today' : ''} onClick={() => props.onDay(date)} aria-label={`${formatDate(date)}, ${count} items`}>{Number(date.slice(8))}{count > 0 && <i className={count > 5 ? 'is-busy' : ''} />}</button></Tooltip>;
    })}</div></section>;
  })}</div>;
}
export function AgendaView(props: Props & { days: string[] }) {
  const visible = props.days.filter(date => itemsOn(props.items, date).length);
  return visible.length ? <div className="calendar-agenda">{visible.map(date => <section key={date}><header className={date === props.today ? 'is-today' : ''}><button onClick={() => props.onDay(date)}><strong>{formatDate(date, { weekday: 'short' })}</strong><span>{formatDate(date, { month: 'short', day: 'numeric' })}</span></button></header><div>{itemsOn(props.items, date).map(item => <button key={item.key} className={`calendar-agenda-row ${item.completed ? 'is-completed' : ''}`} disabled={props.disabled} onClick={() => props.onOpen(item)} style={{ '--event-color': item.color } as CSSProperties}><time>{item.allDay ? 'All day' : item.start.slice(0, 10) < date ? 'Continues' : item.start.slice(11)}</time><i /><span><strong>{item.title}</strong><small>{item.kind === 'habit' ? 'Habit' : item.kind === 'focus' ? `${formatTrackedDuration(item.durationSeconds ?? 0)} focus` : item.kind === 'task' && !item.event ? 'Task deadline' : item.event?.location || (item.event?.repeat ? 'Repeating event' : 'Scheduled')}</small></span>{item.completed && <CircleCheck size={16} />}</button>)}</div></section>)}</div> : <div className="calendar-empty"><CalendarDays size={28} /><h2>Room to make plans</h2><p>No items match these dates and filters.</p><button onClick={() => props.onCreate(`${props.date}T09:00`)}>Add an event</button></div>;
}
