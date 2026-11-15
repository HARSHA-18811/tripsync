import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, Compass, Copy, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { useTrip } from '@/hooks';
import { fmt, toMajor, toMinor, uid } from '@/lib/money';
import { d, tripDays, toMin } from '@/lib/util';
import { Alert, Empty, Field, PageHeader, Stat } from '@/components/ui';
import type { Category, ItineraryItem, Opt, OptStatus } from '@/types';
import { generateRoadTripRoutes } from '@/lib/routeGenerator';

const blank = (day: number, owner: string): ItineraryItem => ({ id: '', day, title: '', time: '09:00', duration: 60, location: '', description: '', cost: 0, url: '', notes: '', owner, status: 'planned', votes: [], comments: [] });

export function Itinerary() {
  const { trip, me, update, joined, name } = useTrip();
  const [view, setView] = useState<'day' | 'list' | 'timeline'>('day'); const [form, setForm] = useState<ItineraryItem | null>(null); const [cm, setCm] = useState<Record<string, string>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const n = tripDays(trip.start, trip.end);
  const items = [...trip.itinerary].sort((a, b) => a.day - b.day || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || toMin(a.time) - toMin(b.time));
  const overlaps = (it: ItineraryItem) => items.some((o) => o.id !== it.id && o.day === it.day && o.status !== 'skipped' && it.status !== 'skipped' && toMin(o.time) < toMin(it.time) + it.duration && toMin(it.time) < toMin(o.time) + o.duration);
  const total = items.reduce((s, i) => s + i.cost, 0);
  const dayCost = (day: number) => items.filter((i) => i.day === day).reduce((s, i) => s + i.cost, 0);

  const save = (it: ItineraryItem) => {
    update((t) => {
      if (it.id) {
        t.itinerary = t.itinerary.map((x) => (x.id === it.id ? it : x));
      } else {
        const dayItems = t.itinerary.filter((x) => x.day === it.day);
        t.itinerary.push({ ...it, id: uid(), sortOrder: dayItems.length });
      }
    }, `${it.id ? 'edited' : 'added'} "${it.title}" in the itinerary`);
    setForm(null);
  };

  const moveItemUpDown = (it: ItineraryItem, dir: 'up' | 'down') => {
    const dayItems = items.filter((x) => x.day === it.day);
    const idx = dayItems.findIndex((x) => x.id === it.id);
    if (idx === -1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= dayItems.length) return;

    update((t) => {
      const remaining = t.itinerary.filter((x) => x.day !== it.day);
      const reordered = [...dayItems];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(targetIdx, 0, moved);
      reordered.forEach((item, i) => {
        const found = t.itinerary.find((x) => x.id === item.id);
        if (found) found.sortOrder = i;
      });
      t.itinerary = [...remaining, ...reordered];
    }, `reordered "${it.title}"`);
  };

  const moveItemToDay = (it: ItineraryItem, targetDay: number) => {
    if (it.day === targetDay) return;
    update((t) => {
      const item = t.itinerary.find((x) => x.id === it.id);
      if (item) {
        const targetDayItems = t.itinerary.filter((x) => x.day === targetDay);
        item.day = targetDay;
        item.sortOrder = targetDayItems.length;
      }
    }, `moved "${it.title}" to Day ${targetDay}`);
  };

  const handleDropOnItem = (targetItem: ItineraryItem) => {
    if (!draggedId || draggedId === targetItem.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    update((t) => {
      const dragged = t.itinerary.find((x) => x.id === draggedId);
      if (!dragged) return;

      const remaining = t.itinerary.filter((x) => x.id !== draggedId);
      const targetDayItems = remaining.filter((x) => x.day === targetItem.day);
      const otherItems = remaining.filter((x) => x.day !== targetItem.day);

      const targetIdx = targetDayItems.findIndex((x) => x.id === targetItem.id);
      dragged.day = targetItem.day;
      targetDayItems.splice(Math.max(0, targetIdx), 0, dragged);

      targetDayItems.forEach((item, i) => {
        item.sortOrder = i;
      });

      t.itinerary = [...otherItems, ...targetDayItems];
    }, `reordered itinerary`);

    setDraggedId(null);
    setDragOverId(null);
    setDragOverDay(null);
  };

  const handleDropOnDay = (targetDay: number) => {
    if (!draggedId) return;
    const dragged = trip.itinerary.find((x) => x.id === draggedId);
    if (dragged && dragged.day !== targetDay) {
      moveItemToDay(dragged, targetDay);
    }
    setDraggedId(null);
    setDragOverDay(null);
  };

  const Row = ({ it }: { it: ItineraryItem }) => (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', it.id);
        setDraggedId(it.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (dragOverId !== it.id) setDragOverId(it.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        handleDropOnItem(it);
      }}
      className={`rounded-xl border bg-white p-3 transition shadow-sm ${
        dragOverId === it.id ? 'border-brand ring-2 ring-brand/30' : 'border-black/5 hover:border-black/15'
      } ${draggedId === it.id ? 'opacity-40' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 cursor-grab text-navy/30 hover:text-navy active:cursor-grabbing"
            title="Drag to reorder activity"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{it.time} · {it.title} {it.status !== 'planned' && <span className="badge ml-1 capitalize">{it.status === 'reserved' ? 'reserved (self-reported)' : it.status}</span>}</p>
            <p className="text-xs text-navy/60">{[it.location, `${it.duration} min`, it.cost ? fmt(it.cost, trip.currency) : '', it.owner && `👤 ${name(it.owner)}`].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Move earlier"
            title="Move earlier"
            className="btn-ghost !px-1.5 !py-1 text-xs"
            onClick={() => moveItemUpDown(it, 'up')}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move later"
            title="Move later"
            className="btn-ghost !px-1.5 !py-1 text-xs"
            onClick={() => moveItemUpDown(it, 'down')}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <select
            aria-label="Change day"
            value={it.day}
            onChange={(e) => moveItemToDay(it, Number(e.target.value))}
            className="rounded-lg border border-black/10 bg-sand/30 px-1.5 py-1 text-xs text-navy font-medium"
            title="Move to another day"
          >
            {Array.from({ length: n }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
          <button aria-label="Edit" className="btn-ghost !px-2" onClick={() => setForm(it)}><Pencil className="h-4 w-4" /></button>
          <button aria-label="Duplicate" className="btn-ghost !px-2" onClick={() => update((t) => t.itinerary.push({ ...it, id: uid(), title: it.title + ' (copy)', votes: [], comments: [] }), `duplicated "${it.title}"`)}><Copy className="h-4 w-4" /></button>
          <button aria-label="Delete" className="btn-danger !px-2" onClick={() => update((t) => { t.itinerary = t.itinerary.filter((x) => x.id !== it.id); }, `deleted "${it.title}"`)}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {overlaps(it) && <div className="mt-2"><Alert tone="warn">Time conflict with another activity on this day.</Alert></div>}
      {it.description && <p className="mt-1 text-xs text-navy/70">{it.description}</p>}
      {it.url && <a href={it.url} target="_blank" rel="noreferrer" className="text-xs text-brand underline">Booking / reference link</a>}
      <div className="mt-2 flex items-center gap-3 text-xs"><button className={`rounded-full border px-2 py-0.5 ${it.votes.includes(me.id) ? 'border-brand bg-brand text-white' : 'border-black/10'}`} onClick={() => update((t) => { const x = t.itinerary.find((y) => y.id === it.id)!; x.votes = x.votes.includes(me.id) ? x.votes.filter((v) => v !== me.id) : [...x.votes, me.id]; })}>👍 {it.votes.length}</button>
        <details><summary className="cursor-pointer">Comments ({it.comments.length})</summary>{it.comments.map((c) => <p key={c.id}><b>{name(c.by)}:</b> {c.text}</p>)}
          <form className="mt-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); const v = (cm[it.id] ?? '').trim(); if (!v) return; update((t) => t.itinerary.find((y) => y.id === it.id)!.comments.push({ id: uid(), by: me.id, text: v, at: new Date().toISOString() })); setCm({ ...cm, [it.id]: '' }); }}><input className="input" aria-label="Comment" value={cm[it.id] ?? ''} onChange={(e) => setCm({ ...cm, [it.id]: e.target.value })} /><button className="btn-ghost">Post</button></form></details></div>
    </div>
  );

  const handleLoadRoundTripCircuit = () => {
    const generated = generateRoadTripRoutes({
      origin: trip.startCity || 'Nellore',
      destination: trip.destination || 'Munnar, Kerala',
      totalBudget: trip.totalBudget || 3500000,
      days: Math.max(3, n),
      members: joined.map((m) => ({ id: m.id, name: m.name })),
      isRoundTrip: true,
    });
    const selectedRoute = generated[0];
    update((t) => {
      t.itinerary = selectedRoute.stops.map((stop, idx) => ({
        id: uid(),
        day: stop.day,
        title: stop.title,
        time: stop.time,
        duration: stop.category === 'stay' ? 120 : stop.category === 'food' ? 60 : 30,
        location: stop.locationName,
        description: stop.description + (stop.recommendedMenu ? ` | Recommended: ${stop.recommendedMenu}` : ''),
        cost: stop.estimatedCost,
        url: '',
        notes: `Assigned payer: ${stop.suggestedPayerName}`,
        owner: stop.suggestedPayerId,
        status: 'planned',
        votes: [],
        comments: [],
        sortOrder: idx,
      }));

      if (t.expenses.length === 0) {
        selectedRoute.stops
          .filter((s) => s.estimatedCost > 0)
          .forEach((s) => {
            const allJoined = t.members.filter((m) => m.status === 'joined').map((m) => m.id);
            const perShare = Math.round(s.estimatedCost / Math.max(1, allJoined.length));
            const shares: Record<string, number> = {};
            allJoined.forEach((id) => (shares[id] = perShare));

            t.expenses.push({
              id: uid(),
              title: s.title,
              amount: s.estimatedCost,
              category: (s.category === 'food' ? 'Food' : s.category === 'fuel' ? 'Fuel' : s.category === 'stay' ? 'Accommodation' : s.category === 'activity' ? 'Activities' : 'Transportation') as Category,
              date: t.start || new Date().toISOString().slice(0, 10),
              paidBy: s.suggestedPayerId,
              method: 'equal',
              splitValues: {},
              shares,
              notes: `Stop at KM ${s.distanceFromStartKm} (${s.locationName})`,
              createdBy: s.suggestedPayerId,
              createdAt: new Date().toISOString(),
              history: [],
            });
          });
      }
    }, `loaded 3D road trip plan "${selectedRoute.title}"`);
  };

  return (
    <div>
      <PageHeader
        title="Itinerary"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to={`/trips/${trip.id}/road-trip`} className="btn-brand !py-1 text-xs shadow-sm">
              <Compass className="h-4 w-4" /> 3D Road Route Planner
            </Link>
            <div className="flex rounded-xl bg-white p-1 text-sm">
              {(['day', 'list', 'timeline'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-lg px-3 py-1 capitalize ${view === v ? 'bg-navy text-white' : ''}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setForm(blank(1, me.id))}>
              Add activity
            </button>
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Total itinerary cost" value={fmt(total, trip.currency)} />{Array.from({ length: Math.min(n, 3) }, (_, i) => <Stat key={i} label={`Day ${i + 1}`} value={fmt(dayCost(i + 1), trip.currency)} />)}</div>
      {form && <ItemForm init={form} days={n} members={joined.map((m) => [m.id, m.name])} start={trip.start} onSave={save} onCancel={() => setForm(null)} />}
      {items.length === 0 && !form ? (
        <div className="rounded-2xl border-2 border-dashed border-brand/30 bg-gradient-to-r from-brand/5 via-teal/5 to-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Compass className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-navy">No activities planned yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-navy/70">
            Planning a road trip? Generate the complete 3-day round trip plan (Nellore ➔ Kerala ➔ Nellore) with 22 highway food & fuel stops, 3D interactive terrain map, and fair payer schedules.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleLoadRoundTripCircuit}
              className="btn-brand text-xs font-semibold shadow-sm"
            >
              ⚡ Load Nellore ⇄ Kerala Round-Trip Plan
            </button>
            <Link to={`/trips/${trip.id}/road-trip`} className="btn-ghost text-xs">
              Open 3D Road Route Planner
            </Link>
            <button className="btn-primary text-xs" onClick={() => setForm(blank(1, me.id))}>
              Add custom activity
            </button>
          </div>
        </div>
      ) : view === 'day' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: n }, (_, i) => i + 1).map((day) => (
            <div
              key={day}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverDay !== day) setDragOverDay(day);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnDay(day);
              }}
              className={`rounded-2xl p-2 transition ${dragOverDay === day ? 'bg-brand/5 border border-brand/20' : ''}`}
            >
              <h2 className="mb-2 font-semibold">Day {day} <span className="text-sm font-normal text-navy/50">{format(addDays(parseISO(trip.start), day - 1), 'EEE d MMM')}</span></h2>
              <div className="space-y-2">
                {items.filter((i) => i.day === day).map((it) => <Row key={it.id} it={it} />)}
                {!items.some((i) => i.day === day) && (
                  <div className="rounded-xl border border-dashed border-black/10 p-4 text-center text-sm text-navy/40">
                    Nothing planned yet. Drag an activity here or add one.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : view === 'list' ? (
        <div className="max-w-2xl space-y-2">
          {items.map((it) => (
            <div key={it.id}>
              <p className="mb-0.5 text-xs text-navy/50">Day {it.day}</p>
              <Row it={it} />
            </div>
          ))}
        </div>
      ) : (
        <ol className="relative ml-3 max-w-2xl border-l-2 border-brand/30 pl-6">
          {items.map((it) => (
            <li key={it.id} className="relative mb-4">
              <span className="absolute -left-[31px] top-3 h-3 w-3 rounded-full bg-brand" />
              <p className="mb-0.5 text-xs text-navy/50">Day {it.day} · {format(addDays(parseISO(trip.start), it.day - 1), 'd MMM')}</p>
              <Row it={it} />
            </li>
          ))}
        </ol>
      )}
      <Checklist />
    </div>
  );
}

function ItemForm({ init, days, members, onSave, onCancel }: { init: ItineraryItem; days: number; members: string[][]; start: string; onSave: (i: ItineraryItem) => void; onCancel: () => void }) {
  const [f, setF] = useState({ ...init, costStr: toMajor(init.cost) });
  const s = (k: string, v: any) => setF({ ...f, [k]: v });
  return (
    <form className="card mb-5 grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; const { costStr, ...rest } = f; onSave({ ...rest, cost: toMinor(costStr || 0) }); }}>
      <Field label="Activity / place *"><input className="input" value={f.title} onChange={(e) => s('title', e.target.value)} /></Field>
      <Field label="Day"><select className="input" value={f.day} onChange={(e) => s('day', Number(e.target.value))}>{Array.from({ length: days }, (_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}</select></Field>
      <Field label="Start time"><input type="time" className="input" value={f.time} onChange={(e) => s('time', e.target.value)} /></Field>
      <Field label="Duration (min)"><input type="number" min={5} className="input" value={f.duration} onChange={(e) => s('duration', Number(e.target.value) || 5)} /></Field>
      <Field label="Location"><input className="input" value={f.location} onChange={(e) => s('location', e.target.value)} /></Field>
      <Field label="Estimated cost"><input type="number" min={0} className="input" value={f.costStr} onChange={(e) => s('costStr', e.target.value)} /></Field>
      <Field label="Responsible"><select className="input" value={f.owner} onChange={(e) => s('owner', e.target.value)}>{members.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Field>
      <Field label="Status"><select className="input" value={f.status} onChange={(e) => s('status', e.target.value)}><option value="planned">Planned</option><option value="reserved">Reserved (self-reported)</option><option value="done">Done</option><option value="skipped">Skipped</option></select></Field>
      <Field label="Booking / reference URL"><input type="url" className="input" value={f.url} onChange={(e) => s('url', e.target.value)} /></Field>
      <div className="md:col-span-3"><Field label="Description & notes"><textarea className="input" rows={2} value={f.description} onChange={(e) => s('description', e.target.value)} /></Field></div>
      <div className="flex gap-2 md:col-span-3"><button className="btn-primary">{init.id ? 'Save' : 'Add'}</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function Checklist() {
  const { trip, update } = useTrip(); const [v, setV] = useState('');
  return (
    <div className="card mt-8 max-w-md"><h2 className="mb-2 font-semibold">Shared checklist <span className="text-sm font-normal text-navy/50">{trip.checklist.filter((c) => c.done).length}/{trip.checklist.length}</span></h2>
      {trip.checklist.map((c) => <div key={c.id} className="flex items-center gap-2 py-1 text-sm"><input id={c.id} type="checkbox" checked={c.done} onChange={() => update((t) => { const x = t.checklist.find((y) => y.id === c.id)!; x.done = !x.done; })} /><label htmlFor={c.id} className={`flex-1 ${c.done ? 'text-navy/40 line-through' : ''}`}>{c.text}</label><button aria-label="Remove" className="text-navy/40 hover:text-red-600" onClick={() => update((t) => { t.checklist = t.checklist.filter((y) => y.id !== c.id); })}>×</button></div>)}
      <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { update((t) => t.checklist.push({ id: uid(), text: v.trim(), done: false })); setV(''); } }}><input className="input" placeholder="Add item" aria-label="Add checklist item" value={v} onChange={(e) => setV(e.target.value)} /><button className="btn-ghost">Add</button></form></div>
  );
}

type FieldDef = { k: string; label: string; type?: string; money?: boolean; options?: string[] };
const CFG = {
  transport: { title: 'Transportation', fields: [
    { k: 'mode', label: 'Mode', options: ['car', 'train', 'bus', 'flight', 'bike', 'other'] }, { k: 'from', label: 'From' }, { k: 'to', label: 'To' },
    { k: 'depart', label: 'Departure', type: 'datetime-local' }, { k: 'arrive', label: 'Arrival', type: 'datetime-local' }, { k: 'fare', label: 'Estimated fare (total)', money: true },
    { k: 'passengers', label: 'Passengers' }, { k: 'url', label: 'Booking URL / reference' }, { k: 'notes', label: 'Notes' }] as FieldDef[],
    head: (o: Opt) => `${String(o.mode).toUpperCase()} · ${o.from} → ${o.to}`, cost: (o: Opt) => o.fare as number,
    meta: (o: Opt) => [o.depart && `Departs ${String(o.depart).replace('T', ' ')}`, o.arrive && `Arrives ${String(o.arrive).replace('T', ' ')}`, o.passengers].filter(Boolean).join(' · ') },
  accommodation: { title: 'Accommodation', fields: [
    { k: 'name', label: 'Property name' }, { k: 'location', label: 'Location' }, { k: 'checkIn', label: 'Check-in', type: 'date' }, { k: 'checkOut', label: 'Check-out', type: 'date' },
    { k: 'cost', label: 'Total cost', money: true }, { k: 'rooms', label: 'Rooms', type: 'number' }, { k: 'roomAlloc', label: 'Room allocation' },
    { k: 'url', label: 'Booking URL / reference' }, { k: 'cancellation', label: 'Cancellation notes' }] as FieldDef[],
    head: (o: Opt) => String(o.name), cost: (o: Opt) => o.cost as number,
    meta: (o: Opt) => [o.location, o.checkIn && `${d(o.checkIn)} → ${d(o.checkOut)}`, `${o.rooms ?? 1} room(s)`, o.roomAlloc, o.cancellation].filter(Boolean).join(' · ') },
};

export function OptionsPage({ kind }: { kind: 'transport' | 'accommodation' }) {
  const { trip, me, update, isOrganizer, joined } = useTrip(); const cfg = CFG[kind];
  const [form, setForm] = useState<Opt | null>(null);
  const list = trip[kind] as Opt[];
  const setStatus = (id: string, status: OptStatus) => update((t) => { const x = (t[kind] as Opt[]).find((o) => o.id === id)!; x.status = status; }, `marked a ${kind} option as ${status}`);
  const tone = { proposed: '', selected: '!bg-brand/10 text-brand', confirmed: '!bg-teal/15 text-teal' };
  return (
    <div>
      <PageHeader title={cfg.title} sub="Proposed → selected (group choice) → confirmed. Confirmed here means a member says it is booked; this app does not make or verify bookings." action={<button className="btn-primary" onClick={() => setForm({ id: '', status: 'proposed', votes: [] })}>Add option</button>} />
      {form && <form className="card mb-5 grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const o = { ...form }; cfg.fields.forEach((f) => { if (f.money) o[f.k] = toMinor(o[f.k + '_s'] ?? toMajor(o[f.k] ?? 0)); delete o[f.k + '_s']; }); update((t) => { const arr = t[kind] as Opt[]; if (o.id) { const i = arr.findIndex((x) => x.id === o.id); arr[i] = o; } else arr.push({ ...o, id: uid() }); }, `${o.id ? 'edited' : 'added'} a ${kind} option`); setForm(null); }}>
        {cfg.fields.map((f) => <Field key={f.k} label={f.label}>{f.options ? <select className="input" value={form[f.k] ?? f.options[0]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
          : f.money ? <input type="number" min={0} className="input" value={form[f.k + '_s'] ?? toMajor(form[f.k] ?? 0)} onChange={(e) => setForm({ ...form, [f.k + '_s']: e.target.value })} />
          : <input type={f.type ?? 'text'} min={f.type === 'number' ? 1 : undefined} className="input" value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />}</Field>)}
        <div className="flex gap-2 md:col-span-3"><button className="btn-primary">Save</button><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button></div></form>}
      {list.length === 0 ? <Empty title={`No ${kind} options yet`} text="Add options so the group can compare and vote." /> : (
        <div className="grid gap-4 md:grid-cols-2">{[...list].sort((a, b) => b.votes.length - a.votes.length).map((o) => (
          <div key={o.id} className="card"><div className="flex items-start justify-between gap-2"><p className="font-medium">{cfg.head(o)}</p><span className={`badge capitalize ${tone[o.status as OptStatus]}`}>{o.status}</span></div>
            <p className="mt-1 text-xs text-navy/60">{cfg.meta(o)}</p><p className="mt-2 text-lg font-semibold">{fmt(cfg.cost(o) ?? 0, trip.currency)}</p>
            <p className="text-xs text-navy/50">≈ {fmt(Math.round((cfg.cost(o) ?? 0) / Math.max(1, joined.length)), trip.currency)} per person · {o.votes.length}/{joined.length} votes</p>
            {o.url && <a className="text-xs text-brand underline" target="_blank" rel="noreferrer" href={o.url.startsWith('http') ? o.url : undefined}>{o.url}</a>}
            {o.notes && <p className="mt-1 text-xs">{o.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2"><button className={o.votes.includes(me.id) ? 'btn-brand' : 'btn-ghost'} onClick={() => update((t) => { const x = (t[kind] as Opt[]).find((y) => y.id === o.id)!; x.votes = x.votes.includes(me.id) ? x.votes.filter((v: string) => v !== me.id) : [...x.votes, me.id]; })}>{o.votes.includes(me.id) ? 'Voted ✓' : 'Vote'}</button>
              <button className="btn-ghost" onClick={() => setForm(o)}>Edit</button>
              {isOrganizer && o.status === 'proposed' && <button className="btn-ghost" onClick={() => setStatus(o.id, 'selected')}>Select</button>}
              {isOrganizer && o.status !== 'proposed' && <button className="btn-ghost" onClick={() => setStatus(o.id, 'proposed')}>Unselect</button>}
              {o.status === 'selected' && <button className="btn-ghost" onClick={() => setStatus(o.id, 'confirmed')}>Mark booked</button>}
              <button aria-label="Delete" className="btn-danger !px-2" onClick={() => update((t) => { (t as any)[kind] = (t[kind] as Opt[]).filter((x) => x.id !== o.id); })}><Trash2 className="h-4 w-4" /></button></div></div>))}</div>)}
    </div>
  );
}
