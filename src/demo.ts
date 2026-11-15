import type { Trip, Profile, Member, Expense } from './types';
import { computeShares } from './lib/split';

const m = (id: string, name: string, budget: number, o: Partial<Member> = {}): Member => ({
  id, name, email: `${name.toLowerCase()}@example.com`, role: 'member', status: 'joined', budget: budget * 100,
  styles: ['nature'], pace: 'balanced', accommodation: 'homestay', transport: 'car', ...o,
});

export const DEMO_USERS: Profile[] = [
  ['u1', 'Harsha', 8000], ['u2', 'Ananya', 9000], ['u3', 'Rohan', 10000], ['u4', 'Meera', 4500],
].map(([id, name, b]) => ({ id: id as string, name: name as string, email: `${(name as string).toLowerCase()}@example.com`, currency: 'INR', styles: ['nature'], accommodation: 'homestay', dietary: '', accessibility: '', maxBudget: (b as number) * 100 }));

const T = (h: number) => new Date(Date.UTC(2026, 9, 28, h)).toISOString();
const ex = (id: string, title: string, rupees: number, category: Expense['category'], date: string, paidBy: string,
  participants: string[], method: Expense['method'] = 'equal', values: Record<string, number> = {}, notes = ''): Expense => {
  const total = Math.round(rupees * 100);
  const r = computeShares({ total, method, participants, values });
  return { id, title, amount: total, category, date, paidBy, method, splitValues: values, shares: r.ok ? r.shares : {}, notes, createdBy: paidBy, createdAt: T(10), history: [] };
};
const all = ['u1', 'u2', 'u3', 'u4'];

export function demoTrip(): Trip {
  return {
    id: 'demo-coorg', name: 'Coorg Getaway', destination: 'Coorg (Kodagu), Karnataka', startCity: 'Bengaluru',
    description: 'A 3-day weekend of coffee estates, waterfalls and homestay food. Meera has a tighter budget, so we are comparing cheaper options.',
    start: '2026-11-14', end: '2026-11-16', currency: 'INR', totalBudget: 3200000, perPersonBudget: 800000,
    flexibility: 'Somewhat flexible (±10%)', status: 'Voting', inviteCode: 'COORG-4F7K', pace: 'balanced',
    votingClosed: false, votingDeadline: '2026-11-01', demo: true,
    categoryBudgets: { Transportation: 600000, Accommodation: 1200000, Food: 700000, Activities: 400000, Fuel: 150000, Other: 150000 },
    members: [
      m('u1', 'Harsha', 8000, { role: 'organizer', styles: ['nature', 'food'], pace: 'balanced' }),
      m('u2', 'Ananya', 9000, { styles: ['nature', 'culture', 'food'], pace: 'relaxed', accommodation: 'resort' }),
      m('u3', 'Rohan', 10000, { styles: ['adventure', 'nature'], pace: 'packed', accommodation: 'resort', transport: 'car' }),
      m('u4', 'Meera', 4500, { styles: ['relaxation', 'food'], pace: 'relaxed', accommodation: 'hostel', transport: 'bus' }),
    ],
    destinations: [
      { id: 'd1', name: 'Coorg (Madikeri)', description: 'Coffee estates, Abbey Falls, Raja\'s Seat sunsets.', cost: 800000, days: 3, distanceKm: 250, attractions: ['Abbey Falls', "Raja's Seat", 'Coffee estate walk'], imageUrl: '', by: 'u1', votes: ['u1', 'u2'], comments: [] },
      { id: 'd2', name: 'Chikmagalur', description: 'Hill treks and Mullayanagiri peak.', cost: 650000, days: 3, distanceKm: 245, attractions: ['Mullayanagiri trek', 'Hebbe Falls'], imageUrl: '', by: 'u3', votes: ['u3'], comments: [] },
      { id: 'd3', name: 'Gokarna', description: 'Beaches and relaxed vibes, cheapest stays.', cost: 520000, days: 3, distanceKm: 480, attractions: ['Om Beach', 'Kudle Beach'], imageUrl: '', by: 'u4', votes: ['u4'], comments: [] },
    ],
    itinerary: [
      { id: 'i1', day: 1, title: 'Drive Bengaluru → Madikeri', time: '06:00', duration: 360, location: 'Bengaluru', description: 'Breakfast stop at Maddur', cost: 240000, url: '', notes: 'Leave early to avoid traffic', owner: 'u3', status: 'planned', votes: ['u1', 'u3'], comments: [] },
      { id: 'i2', day: 1, title: 'Check in at homestay', time: '13:00', duration: 60, location: 'Madikeri', description: '', cost: 0, url: '', notes: '', owner: 'u1', status: 'planned', votes: [], comments: [] },
      { id: 'i3', day: 1, title: "Raja's Seat sunset", time: '17:00', duration: 90, location: 'Madikeri', description: '', cost: 20000, url: '', notes: '', owner: 'u2', status: 'planned', votes: ['u2'], comments: [] },
      { id: 'i4', day: 2, title: 'Abbey Falls', time: '09:00', duration: 120, location: 'Madikeri', description: '', cost: 10000, url: '', notes: '', owner: 'u2', status: 'planned', votes: [], comments: [] },
      { id: 'i5', day: 2, title: 'Coffee estate tour', time: '10:30', duration: 120, location: 'Madikeri', description: 'Overlaps with falls — needs a decision', cost: 160000, url: '', notes: '', owner: 'u1', status: 'planned', votes: [], comments: [] },
      { id: 'i6', day: 3, title: 'Dubare elephant camp', time: '08:30', duration: 180, location: 'Dubare', description: '', cost: 120000, url: '', notes: '', owner: 'u3', status: 'planned', votes: [], comments: [] },
      { id: 'i7', day: 3, title: 'Drive back', time: '14:00', duration: 360, location: 'Madikeri', description: '', cost: 0, url: '', notes: '', owner: 'u3', status: 'planned', votes: [], comments: [] },
    ],
    transport: [
      { id: 't1', mode: 'car', from: 'Bengaluru', to: 'Madikeri', depart: '2026-11-14T06:00', arrive: '2026-11-14T12:00', fare: 240000, url: '', passengers: 'All 4', notes: 'Rohan drives; fuel split', status: 'selected', votes: ['u1', 'u2', 'u3'] },
      { id: 't2', mode: 'bus', from: 'Bengaluru', to: 'Madikeri', depart: '2026-11-14T07:00', arrive: '2026-11-14T13:30', fare: 280000, url: '', passengers: 'All 4', notes: 'KSRTC Airavat — cheaper per person for Meera', status: 'proposed', votes: ['u4'] },
    ],
    accommodation: [
      { id: 'a1', name: 'Misty Hills Homestay', location: 'Madikeri', checkIn: '2026-11-14', checkOut: '2026-11-16', cost: 1200000, rooms: 2, roomAlloc: 'Harsha+Rohan, Ananya+Meera', url: '', cancellation: 'Free cancellation until 7 Nov', status: 'selected', votes: ['u1', 'u2', 'u3'] },
      { id: 'a2', name: 'Budget Backpackers Hostel', location: 'Madikeri', checkIn: '2026-11-14', checkOut: '2026-11-16', cost: 720000, rooms: 1, roomAlloc: 'Dorm beds', url: '', cancellation: 'Non-refundable', status: 'proposed', votes: ['u4'] },
    ],
    expenses: [
      ex('e1', 'Homestay advance', 6000, 'Accommodation', '2026-10-28', 'u1', all),
      ex('e2', 'Fuel (pre-trip fill)', 2400, 'Fuel', '2026-10-30', 'u3', all),
      ex('e3', 'Welcome dinner (Meera ordered less)', 1800, 'Food', '2026-10-31', 'u2', all, 'exact', { u1: 50000, u2: 50000, u3: 50000, u4: 30000 }),
      ex('e4', 'Estate tour tickets (Meera skipped)', 1500, 'Tickets', '2026-10-31', 'u2', ['u1', 'u2', 'u3'], 'equal'),
      ex('e5', 'Snacks (3 people)', 1001, 'Food', '2026-10-31', 'u4', ['u1', 'u2', 'u3'], 'equal', {}, 'Shows paise rounding'),
    ],
    settlements: [],
    messages: [
      { id: 'm1', by: 'u1', text: 'Voting closes 1 Nov. Please vote on the destination and homestay!', at: T(9), pinned: true },
      { id: 'm2', by: 'u4', text: 'My comfortable budget is ₹4,500 — can we look at the hostel option?', at: T(11), pinned: false },
    ],
    decisions: [
      { id: 'dc1', title: 'Which stay should we book?', owner: 'u1', deadline: '2026-11-01', status: 'open', options: [{ id: 'o1', label: 'Misty Hills Homestay', votes: ['u1', 'u2', 'u3'] }, { id: 'o2', label: 'Backpackers Hostel', votes: ['u4'] }] },
    ],
    checklist: ['Government ID', 'Medicines', 'Phone chargers', 'Rain jackets', 'Cash for estates'].map((t, i) => ({ id: 'c' + i, text: t, done: i === 0 })),
    activity: [{ id: 'ac1', text: 'Harsha created the trip', at: T(8), by: 'u1' }],
  };
}
