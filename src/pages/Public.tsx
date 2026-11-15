import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plane, Users, Wallet, Vote } from 'lucide-react';
import { useAuth } from '@/auth';
import { useStore } from '@/store';
import { isCloud } from '@/lib/supabase';
import { Alert, Cover } from '@/components/ui';
import { d } from '@/lib/util';


export function Landing() {
  const { state } = useStore();
  if (state.profile) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-[#1c2a5e] text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-5"><span className="flex items-center gap-2 text-lg font-semibold"><Plane className="h-5 w-5 text-teal" />TripSync</span>
        <div className="flex gap-2"><Link to="/login" className="btn border border-white/20 text-white hover:bg-white/10">Log in</Link><Link to="/signup" className="btn bg-white text-navy hover:bg-white/90">Sign up</Link></div></header>
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Plan Together.<br />Travel Better.<br /><span className="text-teal">Split Fairly.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-white/70">One place for your group to vote on destinations, build an itinerary, track budgets and settle shared expenses with the fewest payments.</p>
        <Link to="/login" className="btn-brand mt-8 px-6 py-3">Try the demo trip</Link>
      </section>
      <section className="mx-auto grid max-w-4xl gap-4 px-5 pb-20 md:grid-cols-3">
        {[[Vote, 'Democratic voting', 'Destinations, stays and transport — ties are never silently decided.'], [Users, 'Budget compatibility', 'See where the group agrees, and where one budget is far lower.'], [Wallet, 'Fair settlements', 'Exact-to-the-paisa splits and a minimal list of who pays whom.']].map(([I, t, x]: any) => (
          <div key={t} className="rounded-2xl bg-white/5 p-5"><I className="h-5 w-5 text-teal" /><p className="mt-3 font-medium">{t}</p><p className="mt-1 text-sm text-white/60">{x}</p></div>))}
      </section>
    </div>
  );
}

function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand p-4">
      <div className="card w-full max-w-sm"><Link to="/" className="mb-4 flex items-center gap-2 font-semibold"><Plane className="h-5 w-5 text-brand" />TripSync</Link>
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        {!isCloud && <div className="mb-3"><Alert tone="info">Demo mode: accounts live only in this browser and passwords are not stored or checked.</Alert></div>}
        {children}</div>
    </div>
  );
}

const loginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(isCloud ? 6 : 0, 'At least 6 characters') });
export function Login() {
  const { signIn } = useAuth(); const { state, setProfile } = useStore(); const nav = useNavigate(); const loc = useLocation();
  const from = (loc.state as any)?.from ?? '/dashboard';
  const [err, setErr] = useState<string | null>(null);
  const f = useForm({ resolver: zodResolver(loginSchema) });
  if (state.profile) return <Navigate to={from} replace />;
  return (
    <AuthFrame title="Welcome back">
      <button
        type="button"
        className="btn-brand mb-4 w-full text-sm font-semibold shadow-sm"
        onClick={() => {
          setProfile(state.profiles[0]);
          nav(from);
        }}
      >
        ⚡ 1-Click Login: Continue as Harsha
      </button>

      <div className="relative mb-4 flex items-center justify-center">
        <div className="border-t border-black/10 w-full" />
        <span className="bg-white px-2 text-xs text-navy/40 uppercase font-semibold absolute">or with email</span>
      </div>

      <form className="space-y-3" onSubmit={f.handleSubmit(async (v) => { const e = await signIn(v.email, v.password); if (e) setErr(e); else nav(from); })}>
        <div>
          <label className="label" htmlFor="em">Email</label>
          <input id="em" className="input" type="email" placeholder="harsha@example.com" {...f.register('email')} />
          <p className="mt-1 text-xs text-red-600">{f.formState.errors.email?.message as string}</p>
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" placeholder="Any password" {...f.register('password')} />
          <p className="mt-1 text-xs text-red-600">{f.formState.errors.password?.message as string}</p>
        </div>
        {err && <Alert tone="bad">{err}</Alert>}
        <button className="btn-primary w-full" disabled={f.formState.isSubmitting}>Log in</button>
      </form>
      <div className="mt-4 flex justify-between text-sm"><Link to="/signup" className="text-brand">Create account</Link><Link to="/reset-password" className="text-brand">Forgot password?</Link></div>
    </AuthFrame>
  );
}

const signupSchema = z.object({ name: z.string().min(2, 'Enter your name'), email: z.string().email('Enter a valid email'), password: z.string().min(6, 'At least 6 characters') });
export function Signup() {
  const { signUp } = useAuth(); const nav = useNavigate(); const [msg, setMsg] = useState<{ t: 'bad' | 'good'; s: string } | null>(null);
  const f = useForm({ resolver: zodResolver(signupSchema) });
  return (
    <AuthFrame title="Create your account">
      <form className="space-y-3" onSubmit={f.handleSubmit(async (v) => {
        const e = await signUp(v.name, v.email, v.password);
        if (e) setMsg({ t: 'bad', s: e }); else if (isCloud) setMsg({ t: 'good', s: 'Check your email to confirm your account, then log in.' }); else nav('/dashboard');
      })}>
        {(['name', 'email', 'password'] as const).map((k) => (
          <div key={k}><label className="label capitalize" htmlFor={k}>{k}</label><input id={k} className="input" type={k === 'password' ? 'password' : k} {...f.register(k)} /><p className="mt-1 text-xs text-red-600">{f.formState.errors[k]?.message as string}</p></div>))}
        {msg && <Alert tone={msg.t}>{msg.s}</Alert>}
        <button className="btn-primary w-full" disabled={f.formState.isSubmitting}>Sign up</button>
      </form>
      <p className="mt-4 text-sm">Already have an account? <Link to="/login" className="text-brand">Log in</Link></p>
    </AuthFrame>
  );
}

export function ResetPassword() {
  const { reset } = useAuth(); const [email, setEmail] = useState(''); const [msg, setMsg] = useState('');
  return (
    <AuthFrame title="Reset password">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await reset(email); setMsg(r ?? (isCloud ? 'If the account exists, a reset link has been emailed.' : 'Demo mode has no passwords to reset.')); }}>
        <div><label className="label" htmlFor="re">Email</label><input id="re" required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {msg && <Alert tone="info">{msg}</Alert>}
        <button className="btn-primary w-full">Send reset link</button>
      </form>
      <Link to="/login" className="mt-4 block text-sm text-brand">Back to login</Link>
    </AuthFrame>
  );
}

export function Join() {
  const { inviteCode } = useParams(); const { state, updateTrip } = useStore(); const nav = useNavigate(); const loc = useLocation();
  const me = state.profile;
  const trip = state.trips.find((t) => t.inviteCode.toUpperCase() === (inviteCode ?? '').toUpperCase());
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!trip) return <AuthFrame title="Invalid invitation"><Alert tone="bad">This invite link or code is not valid. Ask the organizer for a new one.</Alert><Link to="/dashboard" className="btn-ghost mt-4 w-full">Dashboard</Link></AuthFrame>;
  const mine = trip.members.find((m) => m.id === me.id || m.email.toLowerCase() === me.email.toLowerCase());
  if (mine?.status === 'joined') return <Navigate to={`/trips/${trip.id}/overview`} replace />;
  const accept = () => {
    updateTrip(trip.id, (t) => {
      const ex = t.members.find((m) => m.id === mine?.id);
      if (ex) { ex.id = me.id; ex.name = me.name; ex.status = 'joined'; }
      else t.members.push({ id: me.id, name: me.name, email: me.email, role: 'member', status: 'joined', budget: me.maxBudget, styles: me.styles, pace: 'balanced', accommodation: me.accommodation, transport: '' });
    }, 'joined the trip');
    nav(`/trips/${trip.id}/overview`);
  };
  return (
    <AuthFrame title="You're invited">
      <Cover name={trip.name} className="h-28" />
      <p className="mt-3 text-sm text-navy/70">{trip.destination || 'Destination to be decided'} · {d(trip.start)} – {d(trip.end)} · {trip.members.filter((m) => m.status === 'joined').length} members</p>
      <div className="mt-4 flex gap-2"><button className="btn-primary flex-1" onClick={accept}>Accept</button>
        <button className="btn-ghost flex-1" onClick={() => { if (mine) updateTrip(trip.id, (t) => { const m = t.members.find((x) => x.id === mine.id); if (m) m.status = 'declined'; }, "declined the invitation"); nav('/dashboard'); }}>Decline</button></div>
    </AuthFrame>
  );
}
