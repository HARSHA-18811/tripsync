import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Notif, Profile, Trip } from './types';
import { DEMO_USERS, demoTrip } from './demo';
import { uid } from './lib/money';

const KEY = 'tripsync.v1';
interface State { trips: Trip[]; notifs: Notif[]; profile: Profile | null; profiles: Profile[] }
interface Ctx {
  state: State;
  setProfile: (p: Profile | null) => void;
  saveProfile: (p: Profile) => void;
  updateTrip: (id: string, fn: (t: Trip) => void, note?: string) => void;
  addTrip: (t: Trip) => void;
  markRead: (id?: string) => void;
  resetDemo: () => void;
}
const seed = (): State => ({ trips: [demoTrip()], notifs: [], profile: null, profiles: DEMO_USERS });
const load = (): State => {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return seed();
};
const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ } }, [state]);

  const value: Ctx = {
    state,
    setProfile: (profile) => setState((s) => ({ ...s, profile })),
    saveProfile: (p) => setState((s) => ({
      ...s, profile: p,
      profiles: s.profiles.some((x) => x.id === p.id) ? s.profiles.map((x) => (x.id === p.id ? p : x)) : [...s.profiles, p],
    })),
    updateTrip: (id, fn, note) => setState((s) => {
      const next = structuredClone(s);
      const t = next.trips.find((x) => x.id === id);
      if (!t) return s;
      fn(t);
      if (note) {
        const at = new Date().toISOString();
        t.activity.unshift({ id: uid(), text: `${s.profile?.name ?? 'Someone'} ${note}`, at, by: s.profile?.id ?? '' });
        t.activity = t.activity.slice(0, 100);
        next.notifs.unshift({ id: uid(), tripId: id, text: `${t.name}: ${s.profile?.name ?? 'Someone'} ${note}`, at, read: false });
        next.notifs = next.notifs.slice(0, 200);
      }
      return next;
    }),
    addTrip: (t) => setState((s) => ({ ...s, trips: [t, ...s.trips] })),
    markRead: (id) => setState((s) => ({ ...s, notifs: s.notifs.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })),
    resetDemo: () => setState((s) => ({ ...seed(), profile: s.profile, profiles: s.profiles })),
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
