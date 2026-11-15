import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Compass, Home, LogOut, Navigation, Plane, PlusCircle, User } from 'lucide-react';
import { useAuth } from '@/auth';
import { useStore } from '@/store';
import { isCloud } from '@/lib/supabase';
import { useTrip } from '@/hooks';
import { Alert } from './ui';

export function RequireAuth() {
  const { state } = useStore(); const { loading } = useAuth(); const loc = useLocation();
  if (loading) return <div className="p-10 text-center text-navy/60">Loading…</div>;
  if (!state.profile) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Shell />;
}

function Shell() {
  const { state, resetDemo } = useStore(); const { signOut } = useAuth(); const nav = useNavigate();
  const unread = state.notifs.filter((n) => !n.read).length;
  const link = 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-navy/70 hover:bg-black/5';
  const active = ({ isActive }: { isActive: boolean }) => `${link} ${isActive ? '!bg-navy !text-white' : ''}`;
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-black/5 bg-white p-4 md:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold"><Plane className="h-5 w-5 text-brand" />TripSync</Link>
        <nav className="space-y-1">
          <NavLink to="/dashboard" className={active}><Home className="h-4 w-4" />Dashboard</NavLink>
          <NavLink to="/trips/new" className={active}><PlusCircle className="h-4 w-4" />New trip</NavLink>
          <NavLink to="/road-planner" className={active}><Compass className="h-4 w-4 text-teal" />3D Road Planner</NavLink>
          <NavLink to="/notifications" className={active}><Bell className="h-4 w-4" />Notifications{unread > 0 && <span className="ml-auto rounded-full bg-brand px-2 text-xs text-white">{unread}</span>}</NavLink>
          <NavLink to="/settings/profile" className={active}><User className="h-4 w-4" />Profile</NavLink>
        </nav>
        <div className="mt-auto space-y-2">
          {!isCloud && <button className="btn-ghost w-full text-xs" onClick={() => confirm('Reset all local demo data?') && resetDemo()}>Reset demo data</button>}
          <button className="btn-ghost w-full" onClick={async () => { await signOut(); nav('/'); }}><LogOut className="h-4 w-4" />Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">
        {!isCloud && <div className="no-print mb-4"><Alert tone="info"><b>Demo mode.</b> Sample data is stored only in this browser. Nothing is synced to a cloud database and no bookings or payments are real.</Alert></div>}
        <Outlet />
      </main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-black/5 bg-white py-2 md:hidden">
        {[['/dashboard', Home, 'Home'], ['/trips/new', PlusCircle, 'New'], ['/notifications', Bell, 'Alerts'], ['/settings/profile', User, 'Profile']].map(([to, Icon, l]: any) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center text-xs ${isActive ? 'text-brand' : 'text-navy/60'}`}><Icon className="h-5 w-5" />{l}</NavLink>
        ))}
      </nav>
    </div>
  );
}

const TABS = ['overview', 'road-trip', 'members', 'destinations', 'preferences', 'itinerary', 'transport', 'accommodation', 'expenses', 'settlements', 'budget', 'chat', 'decisions', 'summary'];

export function TripLayout() {
  const { state } = useStore(); const loc = useLocation();
  const id = loc.pathname.split('/')[2];
  const trip = state.trips.find((t) => t.id === id);
  const allowed = trip?.members.some((m) => m.id === state.profile?.id && m.status !== 'declined');
  if (!trip || !allowed) return <div className="card mx-auto mt-10 max-w-md text-center"><p className="font-medium">Trip not found or you don't have access.</p><p className="mt-1 text-sm text-navy/60">Only invited members can open a trip. Ask the organizer for an invite link.</p><Link to="/dashboard" className="btn-primary mt-4">Back to dashboard</Link></div>;
  return <TripShell />;
}
function TripShell() {
  const { trip } = useTrip(); const loc = useLocation();
  const cur = loc.pathname.split('/')[3] ?? 'overview';
  return (
    <div>
      <nav aria-label="Breadcrumb" className="no-print mb-2 text-xs text-navy/50"><Link to="/dashboard" className="hover:underline">Dashboard</Link> / <span>{trip.name}</span> / <span className="capitalize text-navy">{cur === 'road-trip' ? '3D Road Map' : cur}</span></nav>
      <div className="no-print -mx-1 mb-6 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => <NavLink key={t} to={`/trips/${trip.id}/${t}`} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-sm capitalize ${isActive ? 'bg-navy text-white' : 'bg-white text-navy/70 hover:bg-black/5'}`}>{t === 'road-trip' ? '🚗 3D Road Map' : t}</NavLink>)}
      </div>
      <Outlet />
    </div>
  );
}
