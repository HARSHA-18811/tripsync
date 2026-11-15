export type SplitMethod = 'equal' | 'percentage' | 'exact';
export interface SplitInput {
  total: number; // minor units
  method: SplitMethod;
  participants: string[]; // excluded members simply are not listed
  values?: Record<string, number>; // percentage (0-100) or exact minor units
}
export type SplitResult = { ok: true; shares: Record<string, number> } | { ok: false; error: string };

/** Distribute `total` over `raws` so integer parts sum exactly to total (largest remainder, ties by order). */
export function largestRemainder(total: number, raws: number[]): number[] {
  const out = raws.map((r) => Math.floor(r + 1e-9));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raws.map((r, i) => ({ i, f: r - Math.floor(r + 1e-9) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k].i] += 1;
  return out;
}

export function computeShares({ total, method, participants, values = {} }: SplitInput): SplitResult {
  if (!Number.isInteger(total) || total <= 0) return { ok: false, error: 'Amount must be greater than zero.' };
  const ids = [...new Set(participants)];
  if (ids.length === 0) return { ok: false, error: 'Select at least one participant.' };
  const shares: Record<string, number> = {};
  if (method === 'equal') {
    largestRemainder(total, ids.map(() => total / ids.length)).forEach((v, i) => (shares[ids[i]] = v));
  } else if (method === 'percentage') {
    const pcts = ids.map((id) => values[id] ?? 0);
    if (pcts.some((p) => p < 0 || Number.isNaN(p))) return { ok: false, error: 'Percentages cannot be negative.' };
    const sum = pcts.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.001) return { ok: false, error: `Percentages total ${+sum.toFixed(2)}%, they must total 100%.` };
    largestRemainder(total, pcts.map((p) => (total * p) / 100)).forEach((v, i) => (shares[ids[i]] = v));
  } else {
    const amts = ids.map((id) => values[id] ?? 0);
    if (amts.some((a) => a < 0 || !Number.isInteger(a))) return { ok: false, error: 'Shares must be non-negative amounts.' };
    const sum = amts.reduce((a, b) => a + b, 0);
    if (sum !== total) return { ok: false, error: `Shares add up to ${sum / 100} but the expense is ${total / 100} (difference ${(total - sum) / 100}).` };
    ids.forEach((id, i) => (shares[id] = amts[i]));
  }
  return { ok: true, shares };
}
