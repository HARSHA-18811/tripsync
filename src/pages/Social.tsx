import { useState } from 'react';
import { Check, Copy, Download, FileJson, FileSpreadsheet, FileText, Pin, Printer, Share2 } from 'lucide-react';
import { useTrip, tripFinance } from '@/hooks';
import { fmt, uid } from '@/lib/money';
import { ago, d, downloadCsv, downloadJson, copyToClipboard, toMin } from '@/lib/util';
import { Alert, Empty, Field, Modal, PageHeader, Stat } from '@/components/ui';
import { CATEGORIES } from '@/types';

const linkify = (s: string) => s.split(/(https?:\/\/\S+)/g).map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer" className="text-brand underline">{p}</a> : p));

export function Chat() {
  const { trip, me, update, name } = useTrip(); const [v, setV] = useState(''); const [reply, setReply] = useState<string | null>(null);
  const msgs = [...trip.messages].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className="max-w-2xl">
      <PageHeader title="Trip chat" sub="Casual discussion. Final choices live in Decisions." />
      {msgs.filter((m) => m.pinned).map((m) => <div key={m.id} className="mb-2"><Alert tone="info">📌 <b>{name(m.by)}:</b> {linkify(m.text)}</Alert></div>)}
      <div className="card mb-3 space-y-3">{msgs.length === 0 && <p className="text-sm text-navy/60">No messages yet.</p>}
        {msgs.map((m) => { const r = msgs.find((x) => x.id === m.replyTo); return (
          <div key={m.id} className={m.by === me.id ? 'text-right' : ''}><div className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-left text-sm ${m.by === me.id ? 'bg-brand text-white' : 'bg-black/5'}`}>
            {r && <p className="mb-1 border-l-2 border-current pl-2 text-xs opacity-70">{name(r.by)}: {r.text.slice(0, 60)}</p>}<p className="text-xs font-medium opacity-70">{name(m.by)}</p>{linkify(m.text)}</div>
            <div className="mt-0.5 flex gap-2 text-xs text-navy/50" style={{ justifyContent: m.by === me.id ? 'flex-end' : 'flex-start' }}>{ago(m.at)}<button onClick={() => setReply(m.id)}>Reply</button><button aria-label="Pin" onClick={() => update((t) => { const x = t.messages.find((y) => y.id === m.id)!; x.pinned = !x.pinned; })}><Pin className={`h-3 w-3 ${m.pinned ? 'fill-current' : ''}`} /></button></div></div>); })}</div>
      {reply && <p className="mb-1 text-xs text-navy/60">Replying to {name(trip.messages.find((m) => m.id === reply)?.by ?? '')} <button className="underline" onClick={() => setReply(null)}>cancel</button></p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!v.trim()) return; update((t) => t.messages.push({ id: uid(), by: me.id, text: v.trim(), at: new Date().toISOString(), pinned: false, replyTo: reply ?? undefined }), 'posted in chat'); setV(''); setReply(null); }}>
        <input className="input" aria-label="Message" placeholder="Message the group…" value={v} onChange={(e) => setV(e.target.value)} /><button className="btn-primary">Send</button></form>
    </div>
  );
}

export function Decisions() {
  const { trip, me, update, name, isOrganizer } = useTrip(); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', options: '', deadline: '' });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Decisions & polls" sub="One vote per member per decision. Ties are shown, never auto-resolved." action={<button className="btn-primary" onClick={() => setOpen(!open)}>New decision</button>} />
      {open && <form className="card mb-4 space-y-3" onSubmit={(e) => { e.preventDefault(); const opts = f.options.split('\n').map((s) => s.trim()).filter(Boolean); if (!f.title.trim() || opts.length < 2) return; update((t) => t.decisions.push({ id: uid(), title: f.title.trim(), owner: me.id, deadline: f.deadline, status: 'open', options: opts.map((label) => ({ id: uid(), label, votes: [] })) }), `opened decision "${f.title.trim()}"`); setF({ title: '', options: '', deadline: '' }); setOpen(false); }}>
        <Field label="Question"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Options (one per line, at least 2)"><textarea className="input" rows={3} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} /></Field>
        <Field label="Deadline"><input type="date" className="input" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field><button className="btn-primary">Create</button></form>}
      {trip.decisions.length === 0 ? <Empty title="No decisions yet" text="Create a poll to settle things like the homestay or the pace." /> : trip.decisions.map((dc) => {
        const max = Math.max(0, ...dc.options.map((o) => o.votes.length)); const lead = dc.options.filter((o) => o.votes.length === max && max > 0);
        return (
          <div key={dc.id} className="card mb-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{dc.title}</p><p className="text-xs text-navy/60">Owner: {name(dc.owner)}{dc.deadline && ` · deadline ${d(dc.deadline)}`}</p></div><span className={`badge capitalize ${dc.status === 'closed' ? '!bg-teal/15 text-teal' : ''}`}>{dc.status}</span></div>
            <div className="mt-3 space-y-2">{dc.options.map((o) => <button key={o.id} disabled={dc.status === 'closed'} onClick={() => update((t) => { const x = t.decisions.find((y) => y.id === dc.id)!; const had = x.options.find((p) => p.id === o.id)!.votes.includes(me.id); x.options.forEach((p) => (p.votes = p.votes.filter((v) => v !== me.id))); if (!had) x.options.find((p) => p.id === o.id)!.votes.push(me.id); })} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${o.votes.includes(me.id) ? 'border-brand bg-brand/5' : 'border-black/10'}`}><span>{o.label}</span><span className="text-xs text-navy/60">{o.votes.length} · {o.votes.map(name).join(', ')}</span></button>)}</div>
            {dc.status === 'closed' ? (lead.length === 1 ? <div className="mt-3"><Alert tone="good">Final result: <b>{lead[0].label}</b></Alert></div> : <div className="mt-3"><Alert tone="warn">{lead.length > 1 ? `Tie between ${lead.map((l) => l.label).join(' and ')} — reopen to break it.` : 'Closed with no votes.'}</Alert></div>) : null}
            {(isOrganizer || dc.owner === me.id) && <button className="btn-ghost mt-3" onClick={() => update((t) => { const x = t.decisions.find((y) => y.id === dc.id)!; x.status = x.status === 'open' ? 'closed' : 'open'; }, `${dc.status === 'open' ? 'closed' : 'reopened'} decision "${dc.title}"`)}>{dc.status === 'open' ? 'Close decision' : 'Reopen'}</button>}</div>);
      })}
    </div>
  );
}

export function Summary() {
  const { trip, name, joined } = useTrip(); const { total, balances, transfers } = tripFinance(trip);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDossier, setShowDossier] = useState(false);

  const done = trip.itinerary.filter((i) => i.status === 'done').length;
  const by = CATEGORIES.map((c) => [c, trip.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)] as const).filter(([, v]) => v > 0);
  const links = [...trip.itinerary.map((i) => i.url), ...trip.transport.map((t) => t.url), ...trip.accommodation.map((a) => a.url)].filter((u) => /^https?:/.test(u ?? ''));

  const exportExpensesCsv = () => {
    downloadCsv(`${trip.name}-expenses.csv`, [
      ['Title', 'Category', 'Date', 'Paid by', 'Amount', 'Currency', 'Method', 'Notes'],
      ...trip.expenses.map((e) => [e.title, e.category, e.date, name(e.paidBy), e.amount / 100, trip.currency, e.method, e.notes])
    ]);
  };

  const exportItineraryCsv = () => {
    const sorted = [...trip.itinerary].sort((a, b) => a.day - b.day || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || toMin(a.time) - toMin(b.time));
    const headers = ['Day', 'Start Time', 'Duration (min)', 'Activity', 'Location', 'Cost', 'Currency', 'Responsible', 'Status', 'Booking Link', 'Notes'];
    const rows = sorted.map((it) => [
      it.day,
      it.time,
      it.duration,
      it.title,
      it.location,
      it.cost / 100,
      trip.currency,
      name(it.owner),
      it.status,
      it.url,
      it.notes,
    ]);
    downloadCsv(`${trip.name}-itinerary.csv`, [headers, ...rows]);
  };

  const exportBalancesCsv = () => {
    const headers = ['Payer (From)', 'Receiver (To)', 'Amount', 'Currency', 'Status'];
    const rows = transfers.map((t) => [
      name(t.from),
      name(t.to),
      t.amount / 100,
      trip.currency,
      'Suggested / Pending',
    ]);
    downloadCsv(`${trip.name}-settlements.csv`, [headers, ...rows]);
  };

  const exportTripJson = () => {
    downloadJson(`${trip.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-backup.json`, trip);
  };

  const copyWhatsAppSummary = async () => {
    const sorted = [...trip.itinerary].sort((a, b) => a.day - b.day || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || toMin(a.time) - toMin(b.time));
    const dayNums = Array.from(new Set(sorted.map((i) => i.day))).sort((a, b) => a - b);

    let text = `✈️ *${trip.name}*\n📍 ${trip.destination || 'Destination TBD'}\n📅 ${d(trip.start)} – ${d(trip.end)}\n\n`;

    if (dayNums.length > 0) {
      text += `🗓️ *DAY-BY-DAY ITINERARY*\n`;
      dayNums.forEach((day) => {
        text += `\n*Day ${day}:*\n`;
        const dayItems = sorted.filter((i) => i.day === day);
        dayItems.forEach((it) => {
          text += `• ${it.time} - ${it.title}${it.location ? ` (${it.location})` : ''}${it.cost ? ` [${fmt(it.cost, trip.currency)}]` : ''}\n`;
        });
      });
      text += `\n`;
    }

    text += `💰 *BUDGET & SPENDING*\n`;
    text += `• Total Budget: ${fmt(trip.totalBudget, trip.currency)}\n`;
    text += `• Spent so far: ${fmt(total, trip.currency)}\n\n`;

    if (transfers.length > 0) {
      text += `🤝 *PENDING SETTLEMENTS*\n`;
      transfers.forEach((t) => {
        text += `• ${name(t.from)} pays ${name(t.to)}: ${fmt(t.amount, trip.currency)}\n`;
      });
      text += `\n`;
    }

    text += `🔗 Join in TripSync: ${location.origin}/join/${trip.inviteCode}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const sortedItinerary = [...trip.itinerary].sort((a, b) => a.day - b.day || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || toMin(a.time) - toMin(b.time));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`${trip.name} — trip summary`}
        sub={`${trip.destination || 'Destination TBD'} · ${d(trip.start)} – ${d(trip.end)}`}
        action={
          <div className="no-print flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={copyWhatsAppSummary} title="Copy formatted text for WhatsApp/Telegram">
              {copiedShare ? <Check className="h-4 w-4 text-teal" /> : <Share2 className="h-4 w-4" />}
              {copiedShare ? 'Copied to clipboard!' : 'Share text'}
            </button>
            <button className="btn-ghost" onClick={() => setShowExportModal(true)}>
              <Download className="h-4 w-4" /> Export center
            </button>
            <button className="btn-primary" onClick={() => { setShowDossier(true); setTimeout(() => window.print(), 250); }}>
              <Printer className="h-4 w-4" /> Print dossier
            </button>
          </div>
        }
      />
      {trip.status !== 'Completed' && <div className="no-print mb-4"><Alert tone="info">This trip isn't marked Completed yet, so the figures below are in progress.</Alert></div>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Total spent" value={fmt(total, trip.currency)} /><Stat label="Per person (avg)" value={fmt(Math.round(total / Math.max(1, joined.length)), trip.currency)} /><Stat label="Activities done" value={`${done}/${trip.itinerary.length}`} /><Stat label="Transfers pending" value={transfers.length} /></div>
      <div className="card mb-4"><h2 className="mb-2 font-semibold">Spending breakdown</h2>{by.length ? by.map(([c, v]) => <div key={c} className="flex justify-between py-1 text-sm"><span>{c}</span><span>{fmt(v, trip.currency)} <span className="text-navy/50">({Math.round((v / total) * 100)}%)</span></span></div>) : <p className="text-sm text-navy/60">No expenses.</p>}</div>
      <div className="card mb-4"><h2 className="mb-2 font-semibold">Per-person position</h2>{joined.map((m) => <div key={m.id} className="flex justify-between py-1 text-sm"><span>{m.name}</span><span>paid {fmt(balances[m.id]?.paid ?? 0, trip.currency)} · share {fmt(balances[m.id]?.share ?? 0, trip.currency)}</span></div>)}
        <p className="mt-2 text-xs text-navy/60">Settlements: {trip.settlements.filter((s) => s.status === 'confirmed').length} confirmed, {trip.settlements.filter((s) => s.status === 'paid').length} awaiting confirmation, {transfers.length} still suggested.</p></div>
      <div className="card mb-4"><h2 className="mb-2 font-semibold">Useful links</h2>{links.length ? links.map((l) => <a key={l} className="block truncate text-sm text-brand underline" href={l} target="_blank" rel="noreferrer">{l}</a>) : <p className="text-sm text-navy/60">No links saved.</p>}</div>

      {/* Export Center Modal */}
      <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export & Backup Center">
        <div className="space-y-3">
          <p className="text-xs text-navy/60">Download your trip data in standard formats for spreadsheets, offline backups, or travel planning.</p>
          <div className="grid gap-2">
            <button
              onClick={() => { exportExpensesCsv(); setShowExportModal(false); }}
              className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left hover:bg-black/5 transition"
            >
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-brand" /> Expense Ledger (CSV)</p>
                <p className="text-xs text-navy/50">Complete itemized expenses with categories and split details</p>
              </div>
              <Download className="h-4 w-4 text-navy/40" />
            </button>
            <button
              onClick={() => { exportItineraryCsv(); setShowExportModal(false); }}
              className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left hover:bg-black/5 transition"
            >
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-teal" /> Itinerary Schedule (CSV)</p>
                <p className="text-xs text-navy/50">Day-by-day plan with timings, locations, costs, and links</p>
              </div>
              <Download className="h-4 w-4 text-navy/40" />
            </button>
            <button
              onClick={() => { exportBalancesCsv(); setShowExportModal(false); }}
              className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left hover:bg-black/5 transition"
            >
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-amber-600" /> Settlement Balance Sheet (CSV)</p>
                <p className="text-xs text-navy/50">Suggested minimal payment transfers between members</p>
              </div>
              <Download className="h-4 w-4 text-navy/40" />
            </button>
            <button
              onClick={() => { exportTripJson(); setShowExportModal(false); }}
              className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left hover:bg-black/5 transition"
            >
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><FileJson className="h-4 w-4 text-violet-600" /> Full Trip Backup (JSON)</p>
                <p className="text-xs text-navy/50">Complete portable JSON file of all trip records for backup or import</p>
              </div>
              <Download className="h-4 w-4 text-navy/40" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Printable Travel Dossier Preview / Print Section */}
      <div className={`mt-8 rounded-2xl border border-black/10 bg-white p-6 ${showDossier ? 'block' : 'hidden'} print:block print:border-none print:p-0`}>
        <div className="border-b border-black/10 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-navy">{trip.name}</h1>
              <p className="text-sm text-navy/70 mt-1">{trip.destination || 'Destination TBD'} · {d(trip.start)} – {d(trip.end)}</p>
            </div>
            <div className="text-right">
              <span className="badge">{trip.status}</span>
              <p className="text-xs text-navy/50 mt-1">Code: <b>{trip.inviteCode}</b></p>
            </div>
          </div>
          {trip.description && <p className="text-xs text-navy/60 mt-2">{trip.description}</p>}
        </div>

        <div className="mb-6">
          <h2 className="text-base font-semibold text-navy mb-2">Trip Members ({joined.length})</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {joined.map((m) => (
              <div key={m.id} className="p-2 rounded-lg bg-black/5">
                <b>{m.name}</b> {m.role === 'organizer' && '(Organizer)'} · {m.email}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-semibold text-navy mb-2">Complete Day-by-Day Itinerary</h2>
          <table className="w-full text-xs text-left border-collapse border border-black/10">
            <thead>
              <tr className="bg-black/5 text-navy/70">
                <th className="p-2 border border-black/10">Day / Time</th>
                <th className="p-2 border border-black/10">Activity</th>
                <th className="p-2 border border-black/10">Location</th>
                <th className="p-2 border border-black/10">Duration</th>
                <th className="p-2 border border-black/10">Cost</th>
                <th className="p-2 border border-black/10">Lead</th>
              </tr>
            </thead>
            <tbody>
              {sortedItinerary.map((it) => (
                <tr key={it.id} className="border border-black/10">
                  <td className="p-2 font-medium">Day {it.day} · {it.time}</td>
                  <td className="p-2">
                    <b>{it.title}</b>
                    {it.notes && <p className="text-[11px] text-navy/50">{it.notes}</p>}
                  </td>
                  <td className="p-2">{it.location || '—'}</td>
                  <td className="p-2">{it.duration} min</td>
                  <td className="p-2">{it.cost ? fmt(it.cost, trip.currency) : 'Free'}</td>
                  <td className="p-2">{name(it.owner)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-semibold text-navy mb-2">Settlement Summary</h2>
          <div className="space-y-1 text-xs">
            {transfers.length === 0 ? (
              <p className="text-navy/50">All expenses are settled.</p>
            ) : (
              transfers.map((t, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-black/5">
                  <span><b>{name(t.from)}</b> pays <b>{name(t.to)}</b></span>
                  <span className="font-semibold">{fmt(t.amount, trip.currency)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {trip.checklist.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-navy mb-2">Packing & Essentials Checklist</h2>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {trip.checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 py-0.5">
                  <span className="h-3 w-3 border border-black/30 rounded inline-block text-center text-[9px] leading-3">
                    {c.done ? '✓' : ''}
                  </span>
                  <span className={c.done ? 'line-through text-navy/40' : ''}>{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
