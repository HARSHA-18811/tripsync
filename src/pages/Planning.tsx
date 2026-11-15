import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Compass, Copy, Trash2 } from 'lucide-react';
import { useTrip, tripFinance } from '@/hooks';
import { fmt, toMinor, toMajor, uid } from '@/lib/money';
import { ago, d, tripDays } from '@/lib/util';
import { Alert, Avatar, Bar, Cover, Empty, Field, PageHeader, Stat } from '@/components/ui';
import { STATUSES, STYLES, type Destination, type TripStatus } from '@/types';

export function Overview() {
  const { trip, update, isOrganizer, joined, name } = useTrip(); const [copied, setCopied] = useState(false);
  const link = `${location.origin}/join/${trip.inviteCode}`;
  const { total } = tripFinance(trip);
  return (
    <div>
      <Cover name={trip.destination || trip.name} className="mb-5 h-40" />
      <PageHeader title={trip.name} sub={`${trip.startCity ? trip.startCity + ' → ' : ''}${trip.destination || 'Destination TBD'} · ${d(trip.start)} – ${d(trip.end)} (${tripDays(trip.start, trip.end)} days)`}
        action={isOrganizer ? <select aria-label="Trip status" className="input w-40" value={trip.status} onChange={(e) => update((t) => { t.status = e.target.value as TripStatus; }, `set trip status to ${e.target.value}`)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select> : <span className="badge">{trip.status}</span>} />
      {trip.description && <p className="mb-5 max-w-2xl text-sm text-navy/70">{trip.description}</p>}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Members" value={joined.length} /><Stat label="Planned budget" value={fmt(trip.totalBudget, trip.currency)} sub={`${fmt(Math.round(trip.totalBudget / Math.max(1, joined.length)), trip.currency)} per person`} />
        <Stat label="Spent so far" value={fmt(total, trip.currency)} /><Stat label="Chosen destination" value={trip.destinations.find((x) => x.id === trip.chosenDestination)?.name ?? 'Not decided'} />
      </div>

      {trip.itinerary.length > 0 ? (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-navy via-brand to-[#1c2a5e] text-white !p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge !bg-teal !text-white text-xs font-bold">Road Circuit Active</span>
              <span className="text-xs text-white/80">3D Interactive Map</span>
            </div>
            <h2 className="mt-1 text-sm font-bold flex items-center gap-2">
              <Compass className="h-4 w-4 text-teal" />
              <span>{trip.startCity ? `${trip.startCity} ⇄ ${trip.destination}` : 'Nellore ⇄ Kerala'} Highway Circuit</span>
            </h2>
            <p className="mt-0.5 text-xs text-white/80">
              {trip.itinerary.length} scheduled stops & checkpoints · 3D isometric terrain view · Payer balance schedule
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/trips/${trip.id}/road-trip`} className="btn bg-white text-navy hover:bg-white/90 font-semibold text-xs shadow-md">
              View 3D Road Map
            </Link>
            <Link to={`/trips/${trip.id}/itinerary`} className="btn-ghost !text-white !border-white/30 text-xs">
              View Itinerary
            </Link>
          </div>
        </div>
      ) : (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-navy via-brand to-[#1c2a5e] text-white !p-4">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Compass className="h-4 w-4 text-teal" />
              <span>3D Road Trip Route & Payment Planner</span>
            </h2>
            <p className="mt-0.5 text-xs text-white/80">
              Generate complete 3D road maps with highway restaurant stops, fuel checkpoints, and fair payment scheduling.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/trips/${trip.id}/road-trip`} className="btn bg-white text-navy hover:bg-white/90 font-semibold text-xs shadow-md">
              Plan 3D Road Circuit
            </Link>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-2 font-semibold">Invite friends</h2>
          <p className="text-sm text-navy/60">Share this code or link. Anyone with it can request to join as a member.</p>
          <div className="mt-3 flex items-center gap-2"><code className="rounded-lg bg-black/5 px-3 py-2 text-sm font-semibold">{trip.inviteCode}</code>
            <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy link'}</button></div></div>
        <div className="card"><h2 className="mb-2 font-semibold">Group activity</h2>
          {trip.activity.length === 0 ? <p className="text-sm text-navy/60">No activity yet.</p> : trip.activity.slice(0, 8).map((a) => <p key={a.id} className="py-1 text-sm">{a.text} <span className="text-xs text-navy/50">· {ago(a.at)}</span></p>)}</div>
      </div>
      {trip.messages.filter((m) => m.pinned).map((m) => <div key={m.id} className="mt-4"><Alert tone="info"><b>📌 {name(m.by)}:</b> {m.text}</Alert></div>)}
    </div>
  );
}

export function Members() {
  const { trip, me, update, isOrganizer } = useTrip(); const [email, setEmail] = useState('');
  return (
    <div className="max-w-3xl">
      <PageHeader title="Members" sub="Invitations record intent only; no email is sent unless you configure an email provider." />
      <div className="card mb-4 divide-y divide-black/5">
        {trip.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><Avatar name={m.name} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.name} {m.id === me.id && <span className="text-navy/50">(you)</span>}</p><p className="truncate text-xs text-navy/50">{m.email}</p></div>
            <span className="badge capitalize">{m.role}</span><span className={`badge capitalize ${m.status === 'joined' ? '!bg-teal/15 text-teal' : ''}`}>{m.status}</span>
            {(isOrganizer && m.id !== me.id) || (m.id === me.id && m.role !== 'organizer') ? (
              <button aria-label={m.id === me.id ? 'Leave trip' : `Remove ${m.name}`} className="btn-danger !px-2" onClick={() => confirm(m.id === me.id ? 'Leave this trip?' : `Remove ${m.name}?`) && update((t) => { t.members = t.members.filter((x) => x.id !== m.id); }, m.id === me.id ? 'left the trip' : `removed ${m.name}`)}><Trash2 className="h-4 w-4" /></button>) : null}
          </div>))}
      </div>
      {isOrganizer && <form className="card flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!/\S+@\S+\.\S+/.test(email)) return; update((t) => { if (!t.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) t.members.push({ id: uid(), name: email.split('@')[0], email, role: 'member', status: 'invited', budget: 0, styles: [], pace: 'balanced', accommodation: '', transport: '' }); }, `invited ${email}`); setEmail(''); }}>
        <input className="input" type="email" placeholder="friend@example.com" aria-label="Invite email" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn-primary">Invite</button></form>}
    </div>
  );
}

export function Destinations() {
  const { trip, me, update, isOrganizer, joined, name } = useTrip();
  const [edit, setEdit] = useState<Destination | null>(null); const [open, setOpen] = useState(false); const [cm, setCm] = useState<Record<string, string>>({});
  const closed = trip.votingClosed || (!!trip.votingDeadline && new Date() > new Date(trip.votingDeadline + 'T23:59:59'));
  const max = Math.max(0, ...trip.destinations.map((x) => x.votes.length));
  const leaders = max > 0 ? trip.destinations.filter((x) => x.votes.length === max) : [];
  const vote = (id: string) => closed || update((t) => { const had = t.destinations.find((x) => x.id === id)!.votes.includes(me.id); t.destinations.forEach((x) => (x.votes = x.votes.filter((v) => v !== me.id))); if (!had) t.destinations.find((x) => x.id === id)!.votes.push(me.id); }, 'updated their destination vote');
  const myVote = trip.destinations.find((x) => x.votes.includes(me.id))?.id;
  return (
    <div>
      <PageHeader title="Destinations" sub={closed ? 'Voting is closed.' : `One vote per member. You can change your vote until ${trip.votingDeadline ? d(trip.votingDeadline) : 'the organizer closes voting'}.`}
        action={<div className="flex gap-2">{isOrganizer && <button className="btn-ghost" onClick={() => update((t) => { t.votingClosed = !t.votingClosed; }, trip.votingClosed ? 'reopened destination voting' : 'closed destination voting')}>{trip.votingClosed ? 'Reopen voting' : 'Close voting'}</button>}<button className="btn-primary" onClick={() => { setEdit(null); setOpen(!open); }}>Suggest destination</button></div>} />
      {isOrganizer && <div className="mb-4 flex items-center gap-2 text-sm"><span className="text-navy/60">Voting deadline:</span><input type="date" className="input w-44" value={trip.votingDeadline} onChange={(e) => update((t) => { t.votingDeadline = e.target.value; })} /></div>}
      {closed && (leaders.length === 1 ? <div className="mb-4"><Alert tone="good">🏆 Winner: <b>{leaders[0].name}</b> with {max} vote(s). {isOrganizer && trip.chosenDestination !== leaders[0].id && <button className="ml-2 underline" onClick={() => update((t) => { t.chosenDestination = leaders[0].id; t.destination = leaders[0].name; }, `confirmed ${leaders[0].name} as the destination`)}>Confirm as trip destination</button>}</Alert></div>
        : leaders.length > 1 ? <div className="mb-4"><Alert tone="warn">It's a tie between {leaders.map((l) => l.name).join(', ')}. The app won't pick for you — reopen voting or settle it in Decisions.</Alert></div> : <div className="mb-4"><Alert tone="warn">No votes were cast.</Alert></div>)}
      {(open || edit) && <DestForm key={edit?.id ?? 'new'} init={edit} onCancel={() => { setOpen(false); setEdit(null); }} onSave={(x) => { update((t) => { if (edit) t.destinations = t.destinations.map((y) => (y.id === edit.id ? { ...y, ...x } : y)); else t.destinations.push({ ...x, id: uid(), by: me.id, votes: [], comments: [] }); }, `${edit ? 'edited' : 'suggested'} ${x.name}`); setOpen(false); setEdit(null); }} />}
      {trip.destinations.length === 0 ? <Empty title="No suggestions yet" text="Suggest a destination to start the vote." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trip.destinations.map((x) => (
            <div key={x.id} className={`card ${leaders.includes(x) && closed && leaders.length === 1 ? 'ring-2 ring-teal' : ''}`}>
              <Cover name={x.name} url={x.imageUrl} />
              <p className="mt-3 text-sm text-navy/70">{x.description}</p>
              <p className="mt-2 text-xs text-navy/60">Est. {fmt(x.cost, trip.currency)} / person · {x.days} days{x.distanceKm ? ` · ${x.distanceKm} km` : ''} <span className="italic">(user-entered)</span></p>
              {x.attractions.length > 0 && <p className="mt-1 text-xs">📍 {x.attractions.join(' · ')}</p>}
              <div className="mt-3"><div className="mb-1 flex justify-between text-xs"><span>{x.votes.length} vote(s)</span><span>{Math.round((x.votes.length / Math.max(1, joined.length)) * 100)}% of members</span></div><Bar pct={(x.votes.length / Math.max(1, joined.length)) * 100} /></div>
              <p className="mt-1 text-xs text-navy/50">{x.votes.map(name).join(', ')}</p>
              <div className="mt-3 flex gap-2"><button disabled={closed} onClick={() => vote(x.id)} className={myVote === x.id ? 'btn-brand flex-1' : 'btn-ghost flex-1'}>{myVote === x.id ? 'Your vote ✓' : 'Vote'}</button>
                {x.by === me.id && <><button className="btn-ghost" onClick={() => setEdit(x)}>Edit</button><button aria-label="Delete" className="btn-danger !px-2" onClick={() => update((t) => { t.destinations = t.destinations.filter((y) => y.id !== x.id); }, `removed ${x.name}`)}><Trash2 className="h-4 w-4" /></button></>}</div>
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-navy/70">Discussion ({x.comments.length})</summary>
                {x.comments.map((c) => <p key={c.id} className="mt-1 text-xs"><b>{name(c.by)}:</b> {c.text}</p>)}
                <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); const v = (cm[x.id] ?? '').trim(); if (!v) return; update((t) => t.destinations.find((y) => y.id === x.id)!.comments.push({ id: uid(), by: me.id, text: v, at: new Date().toISOString() }), `commented on ${x.name}`); setCm({ ...cm, [x.id]: '' }); }}>
                  <input className="input" aria-label="Comment" value={cm[x.id] ?? ''} onChange={(e) => setCm({ ...cm, [x.id]: e.target.value })} /><button className="btn-ghost">Post</button></form></details>
            </div>))}
        </div>)}
    </div>
  );
}

function DestForm({ init, onSave, onCancel }: { init: Destination | null; onSave: (x: Omit<Destination, 'id' | 'by' | 'votes' | 'comments'>) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: init?.name ?? '', description: init?.description ?? '', cost: init ? toMajor(init.cost) : '', days: String(init?.days ?? 3), distanceKm: String(init?.distanceKm ?? ''), attractions: init?.attractions.join(', ') ?? '', imageUrl: init?.imageUrl ?? '' });
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const ok = f.name.trim() && Number(f.cost) >= 0;
  return (
    <form className="card mb-5 grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ name: f.name.trim(), description: f.description, cost: toMinor(f.cost || 0), days: Number(f.days) || 1, distanceKm: Number(f.distanceKm) || 0, attractions: f.attractions.split(',').map((s) => s.trim()).filter(Boolean), imageUrl: f.imageUrl }); }}>
      <Field label="Name *"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Estimated cost per person"><input type="number" min={0} className="input" value={f.cost} onChange={(e) => set('cost', e.target.value)} /></Field>
      <Field label="Duration (days)"><input type="number" min={1} className="input" value={f.days} onChange={(e) => set('days', e.target.value)} /></Field>
      <Field label="Distance (km)"><input type="number" min={0} className="input" value={f.distanceKm} onChange={(e) => set('distanceKm', e.target.value)} /></Field>
      <Field label="Best attractions (comma separated)"><input className="input" value={f.attractions} onChange={(e) => set('attractions', e.target.value)} /></Field>
      <Field label="Photo URL (optional)"><input className="input" value={f.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /></Field>
      <div className="md:col-span-2"><Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
      <div className="flex gap-2 md:col-span-2"><button className="btn-primary" disabled={!ok}>{init ? 'Save changes' : 'Add suggestion'}</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

const tally = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, k) => (k ? ((a[k] = (a[k] ?? 0) + 1), a) : a), {})).sort((a, b) => b[1] - a[1]);

export function Preferences() {
  const { trip, me, update, joined } = useTrip();
  const mine = trip.members.find((m) => m.id === me.id)!;
  const withBudget = joined.filter((m) => m.budget > 0);
  const lo = withBudget.length ? withBudget.reduce((a, b) => (b.budget < a.budget ? b : a)) : null;
  const hi = withBudget.length ? withBudget.reduce((a, b) => (b.budget > a.budget ? b : a)) : null;
  const need = Math.floor(joined.length / 2) + 1;
  const styles = tally(joined.flatMap((m) => m.styles)); const paces = tally(joined.map((m) => m.pace));
  const acc = tally(joined.map((m) => m.accommodation.toLowerCase())); const tr = tally(joined.map((m) => m.transport.toLowerCase()));
  const spread = lo && hi && lo.budget > 0 ? (hi.budget - lo.budget) / lo.budget : 0;
  const cheap = trip.destinations.filter((x) => lo && x.cost <= lo.budget);
  const [f, setF] = useState({ budget: toMajor(mine.budget), styles: mine.styles, pace: mine.pace, accommodation: mine.accommodation, transport: mine.transport });
  return (
    <div>
      <PageHeader title="Group preferences & budget compatibility" sub="Every conclusion below is a plain count or comparison of what members entered — no hidden scores." />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2"><h2 className="mb-3 font-semibold">Comfortable budgets</h2>
          {joined.map((m) => <div key={m.id} className="mb-2"><div className="flex justify-between text-sm"><span>{m.name}</span><span>{m.budget ? fmt(m.budget, trip.currency) : 'not set'}</span></div><Bar pct={hi ? (m.budget / hi.budget) * 100 : 0} tone={lo && m.id === lo.id && spread > 0.3 ? 'red' : 'brand'} /></div>)}
          {lo && hi && <div className="mt-3 space-y-2 text-sm"><p>Lowest: <b>{lo.name}</b> {fmt(lo.budget, trip.currency)} · Highest: <b>{hi.name}</b> {fmt(hi.budget, trip.currency)}</p>
            {spread > 0.3 ? <Alert tone="warn"><b>Budget conflict:</b> the highest budget is {Math.round(spread * 100)}% above the lowest. {cheap.length ? `Destinations within ${lo.name}'s budget: ${cheap.map((x) => x.name).join(', ')}.` : `No suggested destination fits ${lo.name}'s budget yet — consider adding a cheaper option or discussing a split that lets others cover extras.`}</Alert> : <Alert tone="good">Budgets are within 30% of each other.</Alert>}</div>}</div>
        <div className="card"><h2 className="mb-2 font-semibold">Recommended plan</h2>
          {lo ? <p className="text-sm text-navy/80">Plan for up to <b>{fmt(lo.budget, trip.currency)}</b> per person — the lowest comfortable budget ({lo.name}). <br /><span className="text-navy/60">Reason: if everyone shares costs evenly, the plan only works if the least flexible budget works. Members with higher budgets may choose to cover optional extras; that is for the group to agree.</span></p> : <p className="text-sm text-navy/60">Members haven't entered budgets yet.</p>}</div>
      </div>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {[['Activities', styles], ['Pace', paces], ['Accommodation', acc], ['Transport', tr]].map(([title, rows]: any) => (
          <div key={title} className="card"><h2 className="mb-2 font-semibold">{title}</h2>
            {rows.length === 0 ? <p className="text-sm text-navy/60">No answers yet.</p> : rows.map(([k, n]: [string, number]) => <div key={k} className="flex items-center justify-between py-0.5 text-sm"><span className="capitalize">{k}</span><span>{n}/{joined.length} {n >= need ? <span className="badge !bg-teal/15 text-teal">majority</span> : n > 1 ? <span className="badge">some support</span> : <span className="badge !bg-amber-100">single vote</span>}</span></div>)}
            {rows.length > 1 && rows[0][1] === rows[1][1] && <p className="mt-2 text-xs text-amber-700">Tie at the top — unresolved.</p>}</div>))}
      </div>
      <form className="card grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); update((t) => { const m = t.members.find((x) => x.id === me.id)!; m.budget = toMinor(f.budget || 0); m.styles = f.styles; m.pace = f.pace; m.accommodation = f.accommodation; m.transport = f.transport; }, 'updated their trip preferences'); }}>
        <h2 className="font-semibold md:col-span-2">Your preferences for this trip</h2>
        <Field label="Max comfortable budget"><input type="number" min={0} className="input" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
        <Field label="Pace"><select className="input" value={f.pace} onChange={(e) => setF({ ...f, pace: e.target.value as any })}><option>relaxed</option><option>balanced</option><option>packed</option></select></Field>
        <Field label="Accommodation"><input className="input" value={f.accommodation} onChange={(e) => setF({ ...f, accommodation: e.target.value })} /></Field>
        <Field label="Transport"><input className="input" value={f.transport} onChange={(e) => setF({ ...f, transport: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-2 md:col-span-2">{STYLES.map((s) => <button type="button" key={s} aria-pressed={f.styles.includes(s)} onClick={() => setF({ ...f, styles: f.styles.includes(s) ? f.styles.filter((x) => x !== s) : [...f.styles, s] })} className={`rounded-full border px-3 py-1 text-sm capitalize ${f.styles.includes(s) ? 'border-brand bg-brand text-white' : 'border-black/10 bg-white'}`}>{s}</button>)}</div>
        <div className="md:col-span-2"><button className="btn-primary">Save my preferences</button></div>
      </form>
    </div>
  );
}
