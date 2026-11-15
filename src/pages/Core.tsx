import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, CheckCircle2, Compass, FileJson, Plus, Sparkles, Users, Wallet } from 'lucide-react';
import { useStore } from '@/store';
import { tripFinance } from '@/hooks';
import { fmt, toMinor, toMajor, uid } from '@/lib/money';
import { ago, d } from '@/lib/util';
import { Alert, Cover, Empty, Field, PageHeader, Stat } from '@/components/ui';
import { STATUSES, STYLES, type Category, type Trip } from '@/types';
import { generateRoadTripRoutes } from '@/lib/routeGenerator';

const byCur = (rows: { c: string; v: number }[]) => {
  const m: Record<string, number> = {}; rows.forEach((r) => (m[r.c] = (m[r.c] ?? 0) + r.v));
  const e = Object.entries(m); return e.length ? e.map(([c, v]) => fmt(v, c)).join(' · ') : '—';
};

export function Dashboard() {
  const { state } = useStore(); const me = state.profile!; const nav = useNavigate();
  const [code, setCode] = useState('');
  const mine = state.trips.filter((t) => t.members.some((m) => m.id === me.id && m.status === 'joined'));
  const invited = state.trips.filter((t) => t.members.some((m) => (m.email.toLowerCase() === me.email.toLowerCase() || m.id === me.id) && m.status === 'invited'));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = mine.filter((t) => t.end >= today && t.status !== 'Completed');
  const past = mine.filter((t) => !upcoming.includes(t));
  const awaiting = mine.filter((t) => t.status === 'Planning' || t.status === 'Voting');
  const pending = mine.flatMap((t) => tripFinance(t).transfers.filter((x) => x.from === me.id || x.to === me.id).map((x) => ({ t, x })));
  const Card = ({ t }: { t: Trip }) => {
    const n = t.members.filter((m) => m.status === 'joined').length;
    return (
      <Link to={`/trips/${t.id}/overview`} className="card block transition hover:shadow-md">
        <Cover name={t.destination || t.name} />
        <div className="mt-3 flex items-start justify-between gap-2"><p className="font-medium">{t.name}</p><span className="badge">{t.status}</span></div>
        <p className="mt-1 flex items-center gap-1 text-xs text-navy/60"><CalendarDays className="h-3.5 w-3.5" />{d(t.start, 'd MMM')} – {d(t.end)}</p>
        <div className="mt-2 flex justify-between text-xs text-navy/70"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{n} members</span><span>~{fmt(Math.round(t.totalBudget / Math.max(1, n)), t.currency)} / person</span></div>
        <span className="btn-ghost mt-3 w-full">Open workspace</span>
      </Link>
    );
  };
  return (
    <div>
      <PageHeader title={`Welcome, ${me.name.split(' ')[0]}`} sub="Here's what's happening across your trips."
        action={<div className="flex flex-wrap gap-2"><Link to="/trips/new" className="btn-primary"><Plus className="h-4 w-4" />Create trip</Link>
          <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (code.trim()) nav(`/join/${code.trim()}`); }}><input className="input w-36" placeholder="Join code" aria-label="Join code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn-ghost">Join</button></form>
          {mine[0] && <Link to={`/trips/${mine[0].id}/expenses`} className="btn-ghost"><Wallet className="h-4 w-4" />Add expense</Link>}</div>} />
      {invited.map((t) => <div key={t.id} className="mb-3"><Alert tone="info">You're invited to <b>{t.name}</b>. <Link className="underline" to={`/join/${t.inviteCode}`}>Review invitation</Link></Alert></div>)}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total planned budget" value={byCur(mine.map((t) => ({ c: t.currency, v: t.totalBudget })))} />
        <Stat label="Recorded spending" value={byCur(mine.map((t) => ({ c: t.currency, v: tripFinance(t).total })))} />
        <Stat label="Awaiting confirmation" value={awaiting.length} sub="Planning or voting" />
        <Stat label="Pending settlements" value={pending.length} sub="Involving you" tone={pending.length ? 'bad' : 'good'} />
      </div>
      {mine.length === 0 ? <Empty title="No trips yet" text="Create your first trip, or join one with a code. Try the demo code COORG-4F7K." action={<Link to="/trips/new" className="btn-primary">Create a trip</Link>} /> : (
        <>
          <h2 className="mb-3 font-semibold">Upcoming trips</h2>
          {upcoming.length ? <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{upcoming.map((t) => <Card key={t.id} t={t} />)}</div> : <p className="mb-8 text-sm text-navy/60">Nothing upcoming.</p>}
          {past.length > 0 && <><h2 className="mb-3 font-semibold">Past trips</h2><div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{past.map((t) => <Card key={t.id} t={t} />)}</div></>}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card"><h2 className="mb-3 font-semibold">Pending settlements</h2>
              {pending.length === 0 ? <p className="text-sm text-navy/60">You're all settled.</p> : pending.map(({ t, x }, i) => { const n = (id: string) => t.members.find((m) => m.id === id)?.name; return <p key={i} className="py-1 text-sm">{x.from === me.id ? `You owe ${n(x.to)}` : `${n(x.from)} owes you`} <b>{fmt(x.amount, t.currency)}</b> <span className="text-navy/50">· {t.name}</span></p>; })}</div>
            <div className="card"><h2 className="mb-3 font-semibold">Recent activity</h2>
              {mine.flatMap((t) => t.activity.map((a) => ({ ...a, t }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map((a) => <p key={a.id} className="py-1 text-sm">{a.text} <span className="text-xs text-navy/50">· {ago(a.at)}</span></p>)}</div>
          </div>
        </>
      )}
    </div>
  );
}

export function NewTrip() {
  const { state, addTrip } = useStore(); const me = state.profile!; const nav = useNavigate();
  const [step, setStep] = useState(0); const [err, setErr] = useState('');
  const [autoGenerateRoadPlan, setAutoGenerateRoadPlan] = useState(true);
  const [f, setF] = useState({ name: '', destination: '', start: '', end: '', startCity: '', travelers: '4', description: '', total: '', per: '', currency: me.currency || 'INR', flexibility: 'Fixed', styles: [] as string[], pace: 'balanced', transport: '', accommodation: me.accommodation, emails: '' });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  // 1-Click Instant Nellore ➔ Kerala ➔ Nellore trip creator
  const createNelloreKeralaTrip = () => {
    const today = new Date();
    const startStr = today.toISOString().slice(0, 10);
    const endStr = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    const tripMembers = [
      { id: me.id, name: me.name, email: me.email, role: 'organizer' as const, status: 'joined' as const, budget: 875000, styles: ['nature', 'food'], pace: 'balanced' as const, accommodation: 'homestay', transport: 'car' },
      { id: uid(), name: 'Ananya', email: 'ananya@example.com', role: 'member' as const, status: 'joined' as const, budget: 875000, styles: ['nature'], pace: 'balanced' as const, accommodation: '', transport: '' },
      { id: uid(), name: 'Rohan', email: 'rohan@example.com', role: 'member' as const, status: 'joined' as const, budget: 875000, styles: ['adventure'], pace: 'balanced' as const, accommodation: '', transport: '' },
      { id: uid(), name: 'Meera', email: 'meera@example.com', role: 'member' as const, status: 'joined' as const, budget: 875000, styles: ['photography'], pace: 'balanced' as const, accommodation: '', transport: '' },
    ];
    const generated = generateRoadTripRoutes({
      origin: 'Nellore',
      destination: 'Munnar, Kerala',
      totalBudget: 3500000,
      days: 3,
      members: tripMembers.map((m) => ({ id: m.id, name: m.name })),
      isRoundTrip: true,
    });
    const route = generated[0];
    const newId = uid();
    const trip: Trip = {
      id: newId,
      name: 'Nellore ⇄ Kerala Road Trip',
      destination: route.destination,
      description: `${route.title} — ${route.tagline}. Total ${route.totalDistanceKm} km round trip with 22 highway food & fuel checkpoints.`,
      startCity: 'Nellore',
      start: startStr,
      end: endStr,
      currency: 'INR',
      totalBudget: route.budgetBreakdown.total,
      perPersonBudget: Math.round(route.budgetBreakdown.total / 4),
      flexibility: 'Somewhat flexible (±10%)',
      status: 'Planning',
      inviteCode: `ROAD-${uid().slice(0, 4).toUpperCase()}`,
      pace: 'balanced',
      votingClosed: false,
      votingDeadline: '',
      categoryBudgets: {
        Transportation: route.budgetBreakdown.tolls,
        Fuel: route.budgetBreakdown.fuel,
        Food: route.budgetBreakdown.food,
        Accommodation: route.budgetBreakdown.stay,
        Activities: route.budgetBreakdown.activities,
      },
      demo: true,
      members: tripMembers,
      destinations: [
        {
          id: uid(),
          name: route.destination,
          description: route.tagline,
          cost: route.budgetBreakdown.total,
          days: 3,
          distanceKm: route.totalDistanceKm,
          attractions: route.days.flatMap((d) => d.highlights),
          imageUrl: '',
          by: me.id,
          votes: tripMembers.map((m) => m.id),
          comments: [],
        },
      ],
      itinerary: route.stops.map((stop, idx) => ({
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
      })),
      transport: [
        {
          id: uid(),
          mode: 'car',
          from: 'Nellore',
          to: route.destination,
          depart: `${startStr}T05:30`,
          arrive: `${endStr}T21:30`,
          fare: route.budgetBreakdown.fuel + route.budgetBreakdown.tolls,
          url: '',
          passengers: 'All 4 members',
          notes: `${route.roadCondition}. Fuel split evenly.`,
          status: 'selected',
          votes: tripMembers.map((m) => m.id),
        },
      ],
      accommodation: [
        {
          id: uid(),
          name: 'Misty Valley Tea Estate Resort & Homestay',
          location: 'Old Munnar, Kerala',
          checkIn: startStr,
          checkOut: endStr,
          cost: route.budgetBreakdown.stay,
          rooms: 2,
          roomAlloc: 'All members',
          url: '',
          cancellation: 'Free cancellation until 48 hours prior',
          status: 'selected',
          votes: tripMembers.map((m) => m.id),
        },
      ],
      expenses: route.stops
        .filter((s) => s.estimatedCost > 0)
        .map((s) => {
          const perShare = Math.round(s.estimatedCost / 4);
          const shares: Record<string, number> = {};
          tripMembers.forEach((m) => (shares[m.id] = perShare));
          return {
            id: uid(),
            title: s.title,
            amount: s.estimatedCost,
            category: (s.category === 'food' ? 'Food' : s.category === 'fuel' ? 'Fuel' : s.category === 'stay' ? 'Accommodation' : s.category === 'activity' ? 'Activities' : 'Transportation') as Category,
            date: startStr,
            paidBy: s.suggestedPayerId,
            method: 'equal' as const,
            splitValues: {},
            shares,
            notes: `Road stop at KM ${s.distanceFromStartKm} (${s.locationName})`,
            createdBy: s.suggestedPayerId,
            createdAt: new Date().toISOString(),
            history: [],
          };
        }),
      settlements: [],
      messages: [
        {
          id: uid(),
          by: me.id,
          text: `Welcome! The complete Nellore ➔ Munnar (Kerala) ➔ Nellore 3-day round-trip plan has been generated with 22 highway stops, restaurants, fuel points, and balanced payments.`,
          at: new Date().toISOString(),
          pinned: true,
        },
      ],
      decisions: [],
      checklist: [
        'Car PUC & Insurance valid',
        'FASTag balance minimum ₹1,500',
        'Emergency tire inflator & puncture kit',
        'Warm clothes & raincoats for Munnar ghats',
        'Offline downloaded Google / OSM Maps',
      ].map((t) => ({ id: uid(), text: t, done: false })),
      activity: [
        { id: uid(), text: `${me.name} created the trip with Nellore ⇄ Kerala 3D Round-Trip Plan`, at: new Date().toISOString(), by: me.id },
      ],
    };
    addTrip(trip);
    nav(`/trips/${newId}/road-trip`);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!imported.name || !imported.start || !imported.end) {
          setErr('Invalid trip file: missing name or dates.');
          return;
        }
        const newTripId = uid();
        const trip: Trip = {
          ...imported,
          id: newTripId,
          inviteCode: `${(imported.name.replace(/[^a-z]/gi, '').slice(0, 5) || 'TRIP').toUpperCase()}-${uid().slice(0, 4).toUpperCase()}`,
        };
        if (!trip.members.some((m) => m.id === me.id)) {
          trip.members.unshift({
            id: me.id,
            name: me.name,
            email: me.email,
            role: 'organizer',
            status: 'joined',
            budget: trip.perPersonBudget || 0,
            styles: [],
            pace: 'balanced',
            accommodation: '',
            transport: '',
          });
        }
        addTrip(trip);
        nav(`/trips/${newTripId}/overview`);
      } catch {
        setErr('Could not parse trip JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const validate = () => {
    if (step === 0) {
      if (f.name.trim().length < 2) return 'Give your trip a name.';
      if (!f.start || !f.end) return 'Choose start and end dates.';
      if (f.end < f.start) return 'End date cannot be before the start date.';
      if (Number(f.travelers) < 1) return 'At least one traveler.';
    }
    if (step === 1) {
      if (!(Number(f.total) > 0) && !(Number(f.per) > 0)) return 'Enter a total or per-person budget.';
      if (Number(f.total) < 0 || Number(f.per) < 0) return 'Budgets cannot be negative.';
    }
    return '';
  };
  const next = () => { const e = validate(); setErr(e); if (!e) setStep(step + 1); };
  const create = () => {
    const n = Math.max(1, Number(f.travelers));
    const total = Number(f.total) > 0 ? toMinor(f.total) : toMinor(f.per) * n;
    const per = Number(f.per) > 0 ? toMinor(f.per) : Math.round(total / n);
    const membersList = [
      { id: me.id, name: me.name, email: me.email, role: 'organizer' as const, status: 'joined' as const, budget: per, styles: f.styles, pace: f.pace as any, accommodation: f.accommodation, transport: f.transport },
      ...f.emails.split(/[,\s]+/).filter((e) => /\S+@\S+\.\S+/.test(e)).map((e) => ({ id: uid(), name: e.split('@')[0], email: e, role: 'member' as const, status: 'invited' as const, budget: 0, styles: [], pace: 'balanced' as const, accommodation: '', transport: '' })),
    ];

    const isRoadTripTarget =
      autoGenerateRoadPlan ||
      (f.startCity.toLowerCase().includes('nellore') || f.destination.toLowerCase().includes('kerala'));

    let initialItinerary: any[] = [];
    let initialExpenses: any[] = [];
    let initialDestinations: any[] = [];
    let initialTransport: any[] = [];
    let initialAccommodation: any[] = [];

    if (isRoadTripTarget) {
      const generated = generateRoadTripRoutes({
        origin: f.startCity || 'Nellore',
        destination: f.destination || 'Munnar, Kerala',
        totalBudget: total,
        days: 3,
        members: membersList.map((m) => ({ id: m.id, name: m.name })),
        isRoundTrip: true,
      });
      const route = generated[0];

      initialDestinations = [
        {
          id: uid(),
          name: route.destination,
          description: route.tagline,
          cost: route.budgetBreakdown.total,
          days: 3,
          distanceKm: route.totalDistanceKm,
          attractions: route.days.flatMap((d) => d.highlights),
          imageUrl: '',
          by: me.id,
          votes: membersList.map((m) => m.id),
          comments: [],
        },
      ];

      initialItinerary = route.stops.map((stop, idx) => ({
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

      initialTransport = [
        {
          id: uid(),
          mode: 'car',
          from: f.startCity || 'Nellore',
          to: route.destination,
          depart: `${f.start}T05:30`,
          arrive: `${f.end}T21:30`,
          fare: route.budgetBreakdown.fuel + route.budgetBreakdown.tolls,
          url: '',
          passengers: `All ${membersList.length} members`,
          notes: `${route.roadCondition}. Fuel split evenly.`,
          status: 'selected',
          votes: membersList.map((m) => m.id),
        },
      ];

      initialAccommodation = [
        {
          id: uid(),
          name: 'Misty Valley Tea Estate Resort & Homestay',
          location: 'Old Munnar, Kerala',
          checkIn: f.start,
          checkOut: f.end,
          cost: route.budgetBreakdown.stay,
          rooms: 2,
          roomAlloc: 'All members',
          url: '',
          cancellation: 'Free cancellation until 48 hours prior',
          status: 'selected',
          votes: membersList.map((m) => m.id),
        },
      ];

      initialExpenses = route.stops
        .filter((s) => s.estimatedCost > 0)
        .map((s) => {
          const joinedIds = membersList.map((m) => m.id);
          const perShare = Math.round(s.estimatedCost / Math.max(1, joinedIds.length));
          const shares: Record<string, number> = {};
          joinedIds.forEach((id) => (shares[id] = perShare));
          return {
            id: uid(),
            title: s.title,
            amount: s.estimatedCost,
            category: (s.category === 'food' ? 'Food' : s.category === 'fuel' ? 'Fuel' : s.category === 'stay' ? 'Accommodation' : s.category === 'activity' ? 'Activities' : 'Transportation') as Category,
            date: f.start,
            paidBy: s.suggestedPayerId,
            method: 'equal' as const,
            splitValues: {},
            shares,
            notes: `Road stop at KM ${s.distanceFromStartKm} (${s.locationName})`,
            createdBy: s.suggestedPayerId,
            createdAt: new Date().toISOString(),
            history: [],
          };
        });
    }

    const trip: Trip = {
      id: uid(), name: f.name.trim(), destination: f.destination, description: f.description, startCity: f.startCity, start: f.start, end: f.end,
      currency: f.currency, totalBudget: total, perPersonBudget: per, flexibility: f.flexibility, status: STATUSES[0],
      inviteCode: `${(f.name.replace(/[^a-z]/gi, '').slice(0, 5) || 'TRIP').toUpperCase()}-${uid().slice(0, 4).toUpperCase()}`,
      pace: f.pace, votingClosed: false, votingDeadline: '', categoryBudgets: {}, demo: false,
      members: membersList,
      destinations: initialDestinations,
      itinerary: initialItinerary,
      transport: initialTransport,
      accommodation: initialAccommodation,
      expenses: initialExpenses,
      settlements: [],
      messages: [],
      decisions: [],
      checklist: isRoadTripTarget
        ? ['Car PUC & Insurance valid', 'FASTag balance minimum ₹1,500', 'Emergency tire inflator & puncture kit', 'Warm clothes & raincoats for Munnar ghats', 'Offline downloaded Maps'].map((t) => ({ id: uid(), text: t, done: false }))
        : ['ID documents', 'Medicines', 'Chargers', 'Tickets'].map((t) => ({ id: uid(), text: t, done: false })),
      activity: [{ id: uid(), text: `${me.name} created the trip${isRoadTripTarget ? ' with 3D road trip plan' : ''}`, at: new Date().toISOString(), by: me.id }],
    };
    addTrip(trip);
    if (isRoadTripTarget) {
      nav(`/trips/${trip.id}/road-trip`);
    } else {
      nav(`/trips/${trip.id}/members`);
    }
  };
  const steps = ['Basics', 'Budget', 'Preferences', 'Group'];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Create a trip"
        action={
          <label className="btn-ghost flex items-center gap-1.5 cursor-pointer text-xs">
            <FileJson className="h-4 w-4 text-brand" />
            <span>Import trip JSON</span>
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportJson} />
          </label>
        }
      />
      <ol className="mb-5 flex gap-2 text-xs">{steps.map((s, i) => <li key={s} className={`flex-1 rounded-full px-3 py-1.5 text-center ${i === step ? 'bg-navy text-white' : i < step ? 'bg-teal/15 text-teal' : 'bg-white text-navy/50'}`}>{i + 1}. {s}</li>)}</ol>
      <div className="card space-y-4">
        {step === 0 && <>
          {/* Quick Nellore -> Kerala -> Nellore Round-Trip Template Card */}
          <div className="rounded-2xl border-2 border-brand/30 bg-gradient-to-r from-brand/5 via-teal/5 to-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge !bg-brand !text-white text-xs font-bold">Featured Road Circuit</span>
                  <span className="text-xs font-semibold text-teal flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5" /> 3D Highway Map
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-navy">
                  Nellore ➔ Kerala (Munnar) ➔ Nellore Round Trip
                </h3>
                <p className="text-xs text-navy/60">
                  Pre-load complete 3-day round trip highway plan with 22 food stops, fuel points, 3D map, and balanced payments.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createNelloreKeralaTrip}
                  className="btn-brand !py-1.5 text-xs font-semibold shadow-sm"
                  title="Create trip immediately pre-loaded with all 22 stops & 3D map"
                >
                  ⚡ Instant 1-Click Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    set('name', 'Nellore ⇄ Kerala Road Trip');
                    set('startCity', 'Nellore');
                    set('destination', 'Munnar, Kerala (Round-Trip to Nellore)');
                    set('travelers', '4');
                    set('total', '35000');
                    set('per', '8750');
                    set('description', 'Complete 3-day round trip circuit from Nellore to Kerala hills and back with all scheduled highway food stops and fuel points.');
                    const today = new Date();
                    const startStr = today.toISOString().slice(0, 10);
                    const endStr = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10);
                    set('start', startStr);
                    set('end', endStr);
                    setAutoGenerateRoadPlan(true);
                  }}
                  className="btn-ghost !py-1.5 text-xs font-semibold"
                >
                  Pre-fill Form
                </button>
                <Link
                  to="/road-planner"
                  className="btn-ghost !py-1.5 text-xs font-medium"
                >
                  Open 3D Planner
                </Link>
              </div>
            </div>
          </div>

          <Field label="Trip name *"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Destination(s)" hint="Optional — your group can suggest and vote later."><input className="input" value={f.destination} onChange={(e) => set('destination', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Start date *"><input type="date" className="input" value={f.start} onChange={(e) => set('start', e.target.value)} /></Field><Field label="End date *"><input type="date" className="input" value={f.end} min={f.start} onChange={(e) => set('end', e.target.value)} /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Starting city"><input className="input" value={f.startCity} onChange={(e) => set('startCity', e.target.value)} /></Field><Field label="Travelers"><input type="number" min={1} className="input" value={f.travelers} onChange={(e) => set('travelers', e.target.value)} /></Field></div>
          <Field label="Description"><textarea className="input" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>

          <label className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs font-semibold text-navy cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerateRoadPlan}
              onChange={(e) => setAutoGenerateRoadPlan(e.target.checked)}
              className="rounded text-brand"
            />
            <span>Auto-populate 3D round-trip road circuit (Nellore ⇄ Kerala) with 22 highway stops & payer schedule</span>
          </label>
        </>}
        {step === 1 && <>
          <div className="grid grid-cols-2 gap-3"><Field label="Expected total budget"><input type="number" min={0} className="input" value={f.total} onChange={(e) => set('total', e.target.value)} /></Field><Field label="Per-person budget"><input type="number" min={0} className="input" value={f.per} onChange={(e) => set('per', e.target.value)} /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Currency"><select className="input" value={f.currency} onChange={(e) => set('currency', e.target.value)}>{['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Budget flexibility"><select className="input" value={f.flexibility} onChange={(e) => set('flexibility', e.target.value)}>{['Fixed', 'Somewhat flexible (±10%)', 'Very flexible'].map((c) => <option key={c}>{c}</option>)}</select></Field></div>
          <p className="text-xs text-navy/50">The currency is fixed per trip. Amounts in different currencies are never added together.</p>
        </>}
        {step === 2 && <>
          <div><span className="label">What does the group enjoy?</span><div className="flex flex-wrap gap-2">{STYLES.map((s) => <button type="button" key={s} onClick={() => set('styles', f.styles.includes(s) ? f.styles.filter((x) => x !== s) : [...f.styles, s])} aria-pressed={f.styles.includes(s)} className={`rounded-full border px-3 py-1 text-sm capitalize ${f.styles.includes(s) ? 'border-brand bg-brand text-white' : 'border-black/10 bg-white'}`}>{s}</button>)}</div></div>
          <Field label="Travel pace"><select className="input" value={f.pace} onChange={(e) => set('pace', e.target.value)}><option>relaxed</option><option>balanced</option><option>packed</option></select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Preferred transport"><select className="input" value={f.transport} onChange={(e) => set('transport', e.target.value)}><option value="">No preference</option>{['car', 'train', 'bus', 'flight', 'bike'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Accommodation"><input className="input" placeholder="homestay, hotel, hostel…" value={f.accommodation} onChange={(e) => set('accommodation', e.target.value)} /></Field></div>
        </>}
        {step === 3 && <>
          <Field label="Invite by email (comma separated)" hint="Invitees are added as 'invited'. Emails are NOT sent without an email service; share the join link/code after creating the trip."><textarea className="input" rows={3} value={f.emails} onChange={(e) => set('emails', e.target.value)} /></Field>
          <Alert tone="info">A unique join code and link are generated when you create the trip.</Alert>
        </>}
        {err && <Alert tone="bad">{err}</Alert>}
        <div className="flex justify-between">
          <button className="btn-ghost" disabled={step === 0} onClick={() => { setErr(''); setStep(step - 1); }}>Back</button>
          {step < 3 ? <button className="btn-primary" onClick={next}>Next</button> : <button className="btn-brand" onClick={create}>Create trip</button>}
        </div>
      </div>
    </div>
  );
}

export function Notifications() {
  const { state, markRead } = useStore();
  const mine = state.notifs.filter((n) => state.trips.find((t) => t.id === n.tripId)?.members.some((m) => m.id === state.profile?.id));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" sub="In-app only. Email and push need an external provider." action={<button className="btn-ghost" onClick={() => markRead()}>Mark all read</button>} />
      {mine.length === 0 ? <Empty title="You're all caught up" text="Trip updates will appear here." /> : mine.map((n) => (
        <Link key={n.id} to={`/trips/${n.tripId}/overview`} onClick={() => markRead(n.id)} className={`card mb-2 flex items-start gap-3 !p-3 ${n.read ? 'opacity-60' : ''}`}><Bell className="mt-0.5 h-4 w-4 text-brand" /><div><p className="text-sm">{n.text}</p><p className="text-xs text-navy/50">{ago(n.at)}</p></div></Link>))}
    </div>
  );
}

export function Profile() {
  const { state, saveProfile } = useStore(); const [p, setP] = useState(state.profile!); const [saved, setSaved] = useState(false);
  const set = (k: string, v: any) => { setSaved(false); setP({ ...p, [k]: v }); };
  return (
    <form className="card mx-auto max-w-xl space-y-4" onSubmit={(e) => { e.preventDefault(); saveProfile(p); setSaved(true); }}>
      <h1 className="text-xl font-semibold">Profile & travel preferences</h1>
      <Field label="Name"><input required className="input" value={p.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Email"><input disabled className="input" value={p.email} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preferred currency"><select className="input" value={p.currency} onChange={(e) => set('currency', e.target.value)}>{['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Max comfortable trip budget"><input type="number" min={0} className="input" value={toMajor(p.maxBudget)} onChange={(e) => set('maxBudget', toMinor(e.target.value || 0))} /></Field></div>
      <div><span className="label">Travel style</span><div className="flex flex-wrap gap-2">{STYLES.map((s) => <button type="button" key={s} aria-pressed={p.styles.includes(s)} onClick={() => set('styles', p.styles.includes(s) ? p.styles.filter((x) => x !== s) : [...p.styles, s])} className={`rounded-full border px-3 py-1 text-sm capitalize ${p.styles.includes(s) ? 'border-brand bg-brand text-white' : 'border-black/10 bg-white'}`}>{s}</button>)}</div></div>
      <Field label="Preferred accommodation"><input className="input" value={p.accommodation} onChange={(e) => set('accommodation', e.target.value)} /></Field>
      <Field label="Dietary preferences"><input className="input" value={p.dietary} onChange={(e) => set('dietary', e.target.value)} /></Field>
      <Field label="Accessibility requirements"><input className="input" value={p.accessibility} onChange={(e) => set('accessibility', e.target.value)} /></Field>
      <p className="text-xs text-navy/50">Dietary and accessibility details are visible only to you in this version; they are not shared with trip members.</p>
      <div className="flex items-center gap-3"><button className="btn-primary">Save</button>{saved && <span className="text-sm text-teal">Saved</span>}</div>
    </form>
  );
}
