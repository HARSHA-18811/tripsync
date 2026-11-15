import { useParams } from 'react-router-dom';
import { useStore } from './store';
import type { Trip } from './types';
import { computeBalances, suggestSettlements } from './lib/settle';

export function useTrip() {
  const { tripId } = useParams();
  const { state, updateTrip } = useStore();
  const trip = state.trips.find((t) => t.id === tripId) as Trip;
  const me = state.profile!;
  const update = (fn: (t: Trip) => void, note?: string) => updateTrip(trip.id, fn, note);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? 'Former member';
  const joined = trip.members.filter((m) => m.status === 'joined');
  const isOrganizer = trip.members.find((m) => m.id === me.id)?.role === 'organizer';
  return { trip, me, update, name, joined, isOrganizer };
}

export function tripFinance(trip: Trip) {
  const ids = trip.members.filter((m) => m.status === 'joined').map((m) => m.id);
  const balances = computeBalances(ids, trip.expenses, trip.settlements);
  const total = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const transfers = suggestSettlements(balances);
  return { balances, total, transfers };
}
