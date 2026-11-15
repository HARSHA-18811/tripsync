import { useState } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { z } from 'zod';
import { Download, Eye, FileSpreadsheet, Pencil, Receipt, Trash2 } from 'lucide-react';
import { useTrip, tripFinance } from '@/hooks';
import { fmt, toMajor, toMinor, uid } from '@/lib/money';
import { computeShares } from '@/lib/split';
import { d, downloadCsv, ago, tripDays, compressImage } from '@/lib/util';
import { Alert, Avatar, Bar, Empty, Field, Modal, PageHeader, Stat } from '@/components/ui';
import { CATEGORIES, type Category, type Expense, type SplitMethod } from '@/types';

const schema = z.object({ title: z.string().trim().min(1, 'Add a title'), amount: z.number().positive('Amount must be greater than zero'), date: z.string().min(1, 'Pick a date'), paidBy: z.string().min(1, 'Choose who paid') });
const COLORS = ['#6d4aff', '#0ea5a4', '#0f1b3d', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b'];

export function Expenses() {
  const { trip, me, update, joined, name } = useTrip(); const [form, setForm] = useState<Expense | 'new' | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{ title: string; url: string; amount: number; date: string; paidBy: string } | null>(null);
  const { total } = tripFinance(trip);
  const list = [...trip.expenses].sort((a, b) => b.date.localeCompare(a.date));

  const exportDetailedCsv = () => {
    const headers = ['Title', 'Category', 'Date', 'Paid by', 'Amount', 'Currency', 'Method', ...joined.map((m) => `${m.name}'s Share`), 'Receipt Attached', 'Notes'];
    const rows = list.map((e) => [
      e.title,
      e.category,
      e.date,
      name(e.paidBy),
      e.amount / 100,
      trip.currency,
      e.method,
      ...joined.map((m) => (e.shares[m.id] !== undefined ? e.shares[m.id] / 100 : 0)),
      e.receiptUrl ? 'Yes' : 'No',
      e.notes,
    ]);
    downloadCsv(`${trip.name}-expenses-detailed.csv`, [headers, ...rows]);
  };

  return (
    <div>
      <PageHeader title="Expenses" sub="Amounts are stored in whole paise/cents so shares always add up exactly." action={<div className="flex gap-2"><button className="btn-ghost" onClick={exportDetailedCsv} title="Export full expense split breakdown"><FileSpreadsheet className="h-4 w-4" />Export CSV</button><button className="btn-primary" onClick={() => setForm('new')}>Add expense</button></div>} />
      <div className="mb-4 grid grid-cols-2 gap-3"><Stat label="Total group spending" value={fmt(total, trip.currency)} /><Stat label="Budget remaining" value={fmt(trip.totalBudget - total, trip.currency)} tone={total > trip.totalBudget ? 'bad' : 'good'} /></div>
      {form && <ExpenseForm key={typeof form === 'string' ? 'new' : form.id} init={form === 'new' ? null : form} onClose={() => setForm(null)} />}
      {list.length === 0 ? <Empty title="No expenses yet" text="Record the first shared expense." /> : (
        <div className="space-y-2">{list.map((e) => (
          <div key={e.id} className="card !p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{e.title} <span className="badge ml-1">{e.category}</span></p><p className="text-xs text-navy/60">{d(e.date)} · paid by <b>{name(e.paidBy)}</b> · {e.method} split</p></div>
              <div className="flex items-center gap-2"><p className="text-lg font-semibold">{fmt(e.amount, trip.currency)}</p>
                {e.receiptUrl && (
                  <button type="button" onClick={() => setSelectedReceipt({ title: e.title, url: e.receiptUrl!, amount: e.amount, date: e.date, paidBy: e.paidBy })} className="btn-ghost !px-2 text-xs text-teal hover:bg-teal/10" title="View attached receipt">
                    <Receipt className="h-4 w-4" />
                  </button>
                )}
                {(e.createdBy === me.id || trip.members.find((m) => m.id === me.id)?.role === 'organizer') && <><button aria-label="Edit" className="btn-ghost !px-2" onClick={() => setForm(e)}><Pencil className="h-4 w-4" /></button><button aria-label="Delete" className="btn-danger !px-2" onClick={() => confirm('Delete this expense?') && update((t) => { t.expenses = t.expenses.filter((x) => x.id !== e.id); }, `deleted expense "${e.title}"`)}><Trash2 className="h-4 w-4" /></button></>}</div></div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-navy/70">Shares: {Object.entries(e.shares).map(([k, v]) => `${name(k)} ${fmt(v, trip.currency)}`).join(' · ')}{joined.filter((m) => !(m.id in e.shares)).length > 0 && <span className="text-navy/50"> · excluded: {joined.filter((m) => !(m.id in e.shares)).map((m) => m.name).join(', ')}</span>}</p>
              {e.receiptUrl && (
                <button type="button" onClick={() => setSelectedReceipt({ title: e.title, url: e.receiptUrl!, amount: e.amount, date: e.date, paidBy: e.paidBy })} className="inline-flex items-center gap-1 rounded-md bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal hover:bg-teal/20 transition">
                  <Receipt className="h-3 w-3" /> View receipt
                </button>
              )}
            </div>
            {e.notes && <p className="mt-1 text-xs">{e.notes}</p>}
            {e.history.length > 0 && <details className="mt-1 text-xs text-navy/50"><summary className="cursor-pointer">Edit history ({e.history.length})</summary>{e.history.map((h, i) => <p key={i}>{ago(h.at)} · {name(h.by)} — {h.note}</p>)}</details>}
          </div>))}</div>)}

      <Modal open={Boolean(selectedReceipt)} onClose={() => setSelectedReceipt(null)} title={selectedReceipt ? `Receipt: ${selectedReceipt.title}` : 'Receipt'} maxWidth="max-w-xl">
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2 text-xs text-navy/70">
              <span>Paid by <b>{name(selectedReceipt.paidBy)}</b> · {d(selectedReceipt.date)}</span>
              <span className="text-sm font-bold text-navy">{fmt(selectedReceipt.amount, trip.currency)}</span>
            </div>
            <div className="flex max-h-[60vh] justify-center overflow-auto rounded-xl border border-black/10 bg-black/5 p-2">
              <img src={selectedReceipt.url} alt={`Receipt for ${selectedReceipt.title}`} className="max-h-[55vh] w-auto max-w-full rounded-lg object-contain shadow-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <a href={selectedReceipt.url} download={`${selectedReceipt.title}-receipt.jpg`} className="btn-ghost text-xs">
                <Download className="mr-1 h-3.5 w-3.5" /> Download
              </a>
              <button type="button" className="btn-primary text-xs" onClick={() => setSelectedReceipt(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ExpenseForm({ init, onClose }: { init: Expense | null; onClose: () => void }) {
  const { trip, me, update, joined } = useTrip(); const cur = trip.currency;
  const [title, setTitle] = useState(init?.title ?? ''); const [amount, setAmount] = useState(init ? toMajor(init.amount) : '');
  const [category, setCategory] = useState<Category>(init?.category ?? 'Food'); const [date, setDate] = useState(init?.date ?? new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState(init?.paidBy ?? me.id); const [method, setMethod] = useState<SplitMethod>(init?.method ?? 'equal');
  const [parts, setParts] = useState<string[]>(init ? Object.keys(init.shares) : joined.map((m) => m.id));
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(init?.splitValues ?? {}).map(([k, v]) => [k, init?.method === 'exact' ? toMajor(v) : String(v)])));
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(init?.receiptUrl);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [errs, setErrs] = useState<string[]>([]); const [busy, setBusy] = useState(false);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingReceipt(true);
      const compressed = await compressImage(file, 1200, 1200, 0.8);
      setReceiptUrl(compressed);
    } catch {
      setErrs(['Failed to process image file.']);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const numVals = Object.fromEntries(parts.map((p) => [p, method === 'exact' ? toMinor(vals[p] || 0) : Number(vals[p] || 0)]));
  const preview = computeShares({ total: toMinor(amount || 0), method, participants: parts, values: numVals });
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return;
    const p = schema.safeParse({ title, amount: Number(amount), date, paidBy });
    if (!p.success) return setErrs(p.error.issues.map((i) => i.message));
    if (!preview.ok) return setErrs([preview.error]);
    const total = toMinor(amount);
    if (!init && trip.expenses.some((x) => x.title === title.trim() && x.amount === total && x.date === date && x.paidBy === paidBy && Date.now() - new Date(x.createdAt).getTime() < 15000)) return setErrs(['This looks like a duplicate of an expense you just added.']);
    setBusy(true);
    const base = { title: title.trim(), amount: total, category, date, paidBy, method, splitValues: numVals, shares: preview.shares, notes, receiptUrl };
    update((t) => {
      if (init) { const i = t.expenses.findIndex((x) => x.id === init.id); t.expenses[i] = { ...t.expenses[i], ...base, history: [...t.expenses[i].history, { by: me.id, at: new Date().toISOString(), note: `Changed from ${fmt(init.amount, cur)} to ${fmt(total, cur)}` }] }; }
      else t.expenses.push({ ...base, id: uid(), createdBy: me.id, createdAt: new Date().toISOString(), history: [] });
    }, `${init ? 'edited' : 'added'} expense "${title.trim()}" (${fmt(total, cur)})`);
    onClose();
  };
  return (
    <form onSubmit={submit} className="card mb-5 grid gap-3 md:grid-cols-3">
      <Field label="Title *"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label={`Amount (${cur}) *`}><input type="number" min={0} step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Category"><select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Paid by"><select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>{joined.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
      <Field label="Split method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value as SplitMethod)}><option value="equal">Equal</option><option value="percentage">Percentage</option><option value="exact">Exact / custom amounts</option></select></Field>
      <div className="md:col-span-3"><span className="label">Participants (untick to exclude someone)</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{joined.map((m) => { const on = parts.includes(m.id); const sh = preview.ok ? preview.shares[m.id] : undefined; return (
          <div key={m.id} className="rounded-xl border border-black/10 p-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={() => setParts(on ? parts.filter((x) => x !== m.id) : [...parts, m.id])} />{m.name}</label>
            {on && method !== 'equal' && <input aria-label={`${m.name} ${method === 'exact' ? 'amount' : 'percent'}`} type="number" min={0} step="0.01" className="input mt-1" placeholder={method === 'exact' ? cur : '%'} value={vals[m.id] ?? ''} onChange={(e) => setVals({ ...vals, [m.id]: e.target.value })} />}
            {on && sh !== undefined && <p className="mt-1 text-xs text-navy/60">Share: {fmt(sh, cur)}</p>}</div>); })}</div>
        {!preview.ok && Number(amount) > 0 && <p className="mt-2 text-xs text-amber-700">{preview.error}</p>}</div>
      <div className="md:col-span-3"><Field label="Notes"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
      <div className="md:col-span-3">
        <span className="label">Receipt / Bill</span>
        {receiptUrl ? (
          <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-sand/30 p-3">
            <img src={receiptUrl} alt="Receipt thumbnail" className="h-14 w-14 rounded-lg border border-black/10 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-navy">Receipt image attached</p>
              <p className="text-xs text-navy/50">Stored with expense (ready for demo & Supabase storage)</p>
            </div>
            <div className="flex gap-2">
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-2 text-xs" title="Open receipt in new tab">
                <Eye className="h-3.5 w-3.5" />
              </a>
              <button type="button" onClick={() => setReceiptUrl(undefined)} className="btn-danger !px-2 text-xs" title="Remove receipt">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 p-4 hover:border-brand/40 hover:bg-brand/5 transition">
            <Receipt className="mb-1 h-5 w-5 text-brand/70" />
            <span className="text-xs font-medium text-navy">
              {uploadingReceipt ? 'Optimizing receipt image...' : 'Attach receipt photo or bill'}
            </span>
            <span className="mt-0.5 text-[11px] text-navy/50">JPG, PNG, WebP (auto-compressed for fast load)</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
          </label>
        )}
      </div>
      {errs.length > 0 && <div className="md:col-span-3"><Alert tone="bad">{errs.join(' · ')}</Alert></div>}
      <div className="flex gap-2 md:col-span-3"><button className="btn-primary" disabled={busy}>{init ? 'Save changes' : 'Add expense'}</button><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button></div>
    </form>
  );
}

export function Settlements() {
  const { trip, me, update, joined, name } = useTrip(); const { balances, transfers } = tripFinance(trip);
  const open = (t: { from: string; to: string; amount: number }) => trip.settlements.find((s) => s.status === 'paid' && s.from === t.from && s.to === t.to);
  const [ref, setRef] = useState<Record<string, string>>({});
  return (
    <div>
      <PageHeader title="Settlements" sub="Who owes whom, using the fewest payments the algorithm can find." />
      <div className="card mb-4 text-sm"><b>How it works:</b> your <b>balance = what you paid − your fair share</b>. A positive balance means the group owes you; negative means you owe the group. Paying a big bill doesn't mean it was all yours — only your share counts.</div>
      <div className="card mb-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-navy/60"><th className="pb-2">Member</th><th>Paid</th><th>Fair share</th><th>Balance</th></tr></thead><tbody>
        {joined.map((m) => { const b = balances[m.id] ?? { paid: 0, share: 0, net: 0 }; return <tr key={m.id} className="border-t border-black/5"><td className="py-2"><span className="flex items-center gap-2"><Avatar name={m.name} />{m.name}</span></td><td>{fmt(b.paid, trip.currency)}</td><td>{fmt(b.share, trip.currency)}</td><td className={b.net > 0 ? 'font-medium text-teal' : b.net < 0 ? 'font-medium text-red-600' : ''}>{b.net > 0 ? '+' : ''}{fmt(b.net, trip.currency)} <span className="text-xs text-navy/50">{b.net > 0 ? 'to receive' : b.net < 0 ? 'owes' : 'settled'}</span></td></tr>; })}</tbody></table></div>
      <h2 className="mb-2 font-semibold">Suggested transfers</h2>
      {transfers.length === 0 ? <Alert tone="good">Everyone is settled up 🎉</Alert> : <div className="space-y-2">{transfers.map((t) => { const rec = open(t); const k = `${t.from}-${t.to}`; return (
        <div key={k} className="card flex flex-wrap items-center justify-between gap-3 !p-4"><p className="text-sm"><b>{name(t.from)}</b> pays <b>{name(t.to)}</b> <span className="text-lg font-semibold">{fmt(t.amount, trip.currency)}</span></p>
          <div className="flex flex-wrap items-center gap-2"><span className="badge">{rec ? 'Marked paid — awaiting confirmation' : 'Pending'}</span>
            {!rec && t.from === me.id && <><input className="input w-40" placeholder="Payment reference" aria-label="Payment reference" value={ref[k] ?? ''} onChange={(e) => setRef({ ...ref, [k]: e.target.value })} /><button className="btn-primary" onClick={() => update((s) => { s.settlements.push({ id: uid(), from: t.from, to: t.to, amount: t.amount, status: 'paid', reference: ref[k] ?? '', at: new Date().toISOString() }); }, `marked ${fmt(t.amount, trip.currency)} to ${name(t.to)} as paid`)}>Mark as paid</button></>}
            {rec && t.to === me.id && <button className="btn-brand" onClick={() => update((s) => { const x = s.settlements.find((y) => y.id === rec.id)!; x.status = 'confirmed'; x.amount = Math.min(x.amount, t.amount); }, `confirmed receiving ${fmt(rec.amount, trip.currency)} from ${name(t.from)}`)}>Confirm received</button>}
            {rec?.reference && <span className="text-xs text-navy/50">ref: {rec.reference}</span>}</div></div>); })}</div>}
      <p className="mt-2 text-xs text-navy/50">“Marked paid” is a member's claim, not proof of a bank transaction. Balances only change once the receiver confirms. This app does not move money.</p>
      {trip.settlements.length > 0 && <><h2 className="mb-2 mt-6 font-semibold">History</h2><div className="card divide-y divide-black/5">{[...trip.settlements].reverse().map((s) => <p key={s.id} className="py-2 text-sm">{name(s.from)} → {name(s.to)} · {fmt(s.amount, trip.currency)} · <span className="badge capitalize">{s.status}</span> <span className="text-xs text-navy/50">{ago(s.at)}</span></p>)}</div></>}
    </div>
  );
}

export function Budget() {
  const { trip, update, isOrganizer, me } = useTrip();
  const days = tripDays(trip.start, trip.end);
  const spent = (c: Category) => trip.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
  const total = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const rows = CATEGORIES.map((c) => ({ c, plan: trip.categoryBudgets[c] ?? 0, actual: spent(c) }));
  const byDay: Record<string, number> = {}; trip.expenses.forEach((e) => (byDay[e.date] = (byDay[e.date] ?? 0) + e.amount));
  const dayRows = Object.entries(byDay).sort().map(([k, v]) => ({ day: d(k, 'd MMM'), amount: v / 100 }));
  const spendDays = Math.max(1, Object.keys(byDay).length);
  const forecast = Math.round((total / spendDays) * days);
  const linked = { Activities: trip.itinerary.reduce((s, i) => s + i.cost, 0), Accommodation: trip.accommodation.filter((a) => a.status !== 'proposed').reduce((s, a) => s + (a.cost ?? 0), 0), Transportation: trip.transport.filter((a) => a.status !== 'proposed').reduce((s, a) => s + (a.fare ?? 0), 0) };
  const alerts: { t: 'warn' | 'bad'; s: string }[] = [];
  rows.forEach((r) => { if (r.plan > 0 && r.actual > r.plan) alerts.push({ t: 'bad', s: `${r.c} is over its budget (${fmt(r.actual, trip.currency)} of ${fmt(r.plan, trip.currency)}).` }); else if (r.plan > 0 && r.actual >= r.plan * 0.8) alerts.push({ t: 'warn', s: `${r.c} has used ${Math.round((r.actual / r.plan) * 100)}% of its budget.` }); });
  if (total > trip.totalBudget) alerts.push({ t: 'bad', s: 'Actual spending has exceeded the trip budget.' });
  else if (forecast > trip.totalBudget) alerts.push({ t: 'warn', s: `At the current pace (${fmt(Math.round(total / spendDays), trip.currency)} per spending day × ${days} days) the trip would reach ${fmt(forecast, trip.currency)}, above the ${fmt(trip.totalBudget, trip.currency)} target.` });
  trip.expenses.filter((e) => e.amount > trip.totalBudget * 0.25).forEach((e) => alerts.push({ t: 'warn', s: `Large expense: "${e.title}" is ${Math.round((e.amount / trip.totalBudget) * 100)}% of the total budget.` }));
  const [prop, setProp] = useState('');
  const chart = rows.filter((r) => r.plan || r.actual).map((r) => ({ name: r.c, Planned: r.plan / 100, Actual: r.actual / 100 }));
  return (
    <div>
      <PageHeader title="Budget" sub="All figures come from the same expense records as the Expenses and Settlements pages." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Trip budget" value={fmt(trip.totalBudget, trip.currency)} /><Stat label="Spent" value={fmt(total, trip.currency)} sub={`${Math.round((total / Math.max(1, trip.totalBudget)) * 100)}% of budget`} /><Stat label="Remaining" value={fmt(trip.totalBudget - total, trip.currency)} tone={total > trip.totalBudget ? 'bad' : 'good'} /><Stat label="Forecast" value={fmt(forecast, trip.currency)} sub="spend per active day × trip days" /></div>
      <div className="mb-4 space-y-2">{alerts.map((a, i) => <Alert key={i} tone={a.t}>{a.s}</Alert>)}</div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-2 font-semibold">Planned vs actual</h2>{chart.length ? <div className="h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><RBar dataKey="Planned" fill="#0f1b3d" radius={[4, 4, 0, 0]} /><RBar dataKey="Actual" fill="#6d4aff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-navy/60">Set category budgets below.</p>}</div>
        <div className="card"><h2 className="mb-2 font-semibold">Spending by category</h2>{total ? <div className="h-64"><ResponsiveContainer><PieChart><Pie data={rows.filter((r) => r.actual).map((r) => ({ name: r.c, value: r.actual / 100 }))} dataKey="value" nameKey="name" outerRadius={90} label>{rows.filter((r) => r.actual).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p className="text-sm text-navy/60">No spending yet.</p>}</div>
        <div className="card"><h2 className="mb-2 font-semibold">Daily spending</h2>{dayRows.length ? <div className="h-56"><ResponsiveContainer><BarChart data={dayRows}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><RBar dataKey="amount" fill="#0ea5a4" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-navy/60">No spending yet.</p>}</div>
        <div className="card"><h2 className="mb-2 font-semibold">Estimates from your plan</h2><p className="mb-2 text-xs text-navy/60">Summed from the itinerary and from options marked selected/confirmed.</p>{Object.entries(linked).map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span>{k}</span><b>{fmt(v, trip.currency)}</b></div>)}</div>
      </div>
      <div className="card mb-4"><h2 className="mb-3 font-semibold">Category budgets</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{CATEGORIES.map((c) => { const r = rows.find((x) => x.c === c)!; return <div key={c}><Field label={c}><input disabled={!isOrganizer} type="number" min={0} className="input" value={toMajor(r.plan)} onChange={(e) => update((t) => { t.categoryBudgets[c] = toMinor(e.target.value || 0); })} /></Field><div className="mt-1"><Bar pct={r.plan ? (r.actual / r.plan) * 100 : 0} tone={r.plan && r.actual > r.plan ? 'red' : 'brand'} /></div></div>; })}</div>{!isOrganizer && <p className="mt-2 text-xs text-navy/50">Only the organizer edits budgets directly. Propose a change below.</p>}</div>
      <form className="card flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!(Number(prop) > 0)) return; update((t) => t.decisions.push({ id: uid(), title: `Change total budget to ${fmt(toMinor(prop), t.currency)}?`, owner: me.id, deadline: '', status: 'open', options: [{ id: uid(), label: 'Approve', votes: [me.id] }, { id: uid(), label: 'Reject', votes: [] }] }), 'proposed a budget change'); setProp(''); }}>
        <Field label="Propose a new total budget"><input type="number" min={1} className="input" value={prop} onChange={(e) => setProp(e.target.value)} /></Field><button className="btn-ghost">Create vote in Decisions</button></form>
    </div>
  );
}
