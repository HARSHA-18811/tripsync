import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isCloud, supabase } from './lib/supabase';
import { useStore } from './store';
import type { Profile } from './types';

interface AuthCtx {
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  reset: (email: string) => Promise<string | null>;
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

const blank = (id: string, name: string, email: string): Profile => ({ id, name, email, currency: 'INR', styles: [], accommodation: '', dietary: '', accessibility: '', maxBudget: 0 });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, setProfile, saveProfile } = useStore();
  const [loading, setLoading] = useState(isCloud);

  useEffect(() => {
    if (!supabase) return;
    const apply = (u: { id: string; email?: string; user_metadata?: Record<string, any> } | null | undefined) => {
      if (!u) return setProfile(null);
      const existing = state.profiles.find((p) => p.id === u.id);
      const p = existing ?? blank(u.id, u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Traveller', u.email ?? '');
      if (!existing) saveProfile(p); else setProfile(p);
    };
    supabase.auth.getSession().then(({ data }) => { apply(data.session?.user); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user));
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthCtx = {
    loading,
    async signIn(email, password) {
      if (supabase) { const { error } = await supabase.auth.signInWithPassword({ email, password }); return error?.message ?? null; }
      // DEMO MODE: no real authentication. Passwords are NOT stored or checked.
      const p = state.profiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!p) return 'No local demo account with that email. Use "Continue as Harsha" or sign up.';
      setProfile(p); return null;
    },
    async signUp(name, email, password) {
      if (supabase) {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        return error?.message ?? null;
      }
      const existing = state.profiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (existing) return 'An account with this email already exists in this browser.';
      const p = blank(crypto.randomUUID(), name, email); saveProfile(p); return null;
    },
    async signOut() { if (supabase) await supabase.auth.signOut(); setProfile(null); },
    async reset(email) {
      if (!supabase) return null;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
      return error?.message ?? null;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
