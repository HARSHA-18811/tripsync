export const CATEGORIES = ['Transportation', 'Accommodation', 'Food', 'Activities', 'Shopping', 'Fuel', 'Tickets', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];
export type SplitMethod = 'equal' | 'percentage' | 'exact';
export type TripStatus = 'Planning' | 'Voting' | 'Confirmed' | 'In progress' | 'Completed';
export const STATUSES: TripStatus[] = ['Planning', 'Voting', 'Confirmed', 'In progress', 'Completed'];
export const STYLES = ['adventure', 'relaxation', 'culture', 'nature', 'shopping', 'food', 'nightlife', 'sightseeing'];

export interface Profile {
  id: string; name: string; email: string; currency: string; styles: string[];
  accommodation: string; dietary: string; accessibility: string; maxBudget: number;
}
export interface Member {
  id: string; name: string; email: string; role: 'organizer' | 'member';
  status: 'joined' | 'invited' | 'declined'; budget: number; styles: string[];
  pace: 'relaxed' | 'balanced' | 'packed'; accommodation: string; transport: string;
}
export interface Comment { id: string; by: string; text: string; at: string }
export interface Destination {
  id: string; name: string; description: string; cost: number; days: number; distanceKm: number;
  attractions: string[]; imageUrl: string; by: string; votes: string[]; comments: Comment[];
}
export interface ItineraryItem {
  id: string; day: number; title: string; time: string; duration: number; location: string;
  description: string; cost: number; url: string; notes: string; owner: string;
  status: 'planned' | 'reserved' | 'done' | 'skipped'; votes: string[]; comments: Comment[];
  sortOrder?: number;
}
export type OptStatus = 'proposed' | 'selected' | 'confirmed';
export interface Opt { id: string; status: OptStatus; votes: string[];[k: string]: any }
export interface ExpenseEdit { by: string; at: string; note: string }
export interface Expense {
  id: string; title: string; amount: number; category: Category; date: string; paidBy: string;
  method: SplitMethod; splitValues: Record<string, number>; shares: Record<string, number>;
  notes: string; receiptUrl?: string; createdBy: string; createdAt: string; history: ExpenseEdit[];
}
export interface Settlement {
  id: string; from: string; to: string; amount: number; status: 'paid' | 'confirmed';
  reference: string; at: string;
}
export interface Message { id: string; by: string; text: string; at: string; pinned: boolean; replyTo?: string }
export interface Decision {
  id: string; title: string; owner: string; deadline: string; status: 'open' | 'closed';
  options: { id: string; label: string; votes: string[] }[];
}
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface Activity { id: string; text: string; at: string; by: string }
export interface Trip {
  id: string; name: string; description: string; startCity: string; destination: string;
  start: string; end: string; currency: string; totalBudget: number; perPersonBudget: number;
  flexibility: string; status: TripStatus; inviteCode: string; pace: string;
  votingClosed: boolean; votingDeadline: string; chosenDestination?: string;
  categoryBudgets: Partial<Record<Category, number>>; demo: boolean;
  members: Member[]; destinations: Destination[]; itinerary: ItineraryItem[];
  transport: Opt[]; accommodation: Opt[]; expenses: Expense[]; settlements: Settlement[];
  messages: Message[]; decisions: Decision[]; checklist: ChecklistItem[]; activity: Activity[];
}
export interface Notif { id: string; tripId: string; text: string; at: string; read: boolean }
