import { describe, expect, it } from 'vitest';
import { computeShares } from './split';
import { computeBalances, suggestSettlements, type LedgerExpense } from './settle';

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('equal split', () => {
  it('splits evenly', () => {
    const r = computeShares({ total: 300000, method: 'equal', participants: ['a', 'b', 'c'] });
    expect(r.ok && r.shares).toEqual({ a: 100000, b: 100000, c: 100000 });
  });
  it('handles rounding to the smallest unit and always sums to total', () => {
    const r = computeShares({ total: 10000, method: 'equal', participants: ['a', 'b', 'c'] });
    expect(r.ok && r.shares).toEqual({ a: 3334, b: 3333, c: 3333 });
    expect(r.ok && sum(r.shares)).toBe(10000);
  });
  it('excluded participants take no share', () => {
    const r = computeShares({ total: 90000, method: 'equal', participants: ['a', 'c'] });
    expect(r.ok && r.shares).toEqual({ a: 45000, c: 45000 });
  });
  it('rejects zero/negative amounts and empty participants', () => {
    expect(computeShares({ total: 0, method: 'equal', participants: ['a'] }).ok).toBe(false);
    expect(computeShares({ total: -5, method: 'equal', participants: ['a'] }).ok).toBe(false);
    expect(computeShares({ total: 100, method: 'equal', participants: [] }).ok).toBe(false);
  });
});

describe('unequal splits', () => {
  it('percentage split with rounding', () => {
    const r = computeShares({ total: 10001, method: 'percentage', participants: ['a', 'b', 'c'], values: { a: 33.33, b: 33.33, c: 33.34 } });
    expect(r.ok && sum(r.shares)).toBe(10001);
  });
  it('percentages must total 100', () => {
    expect(computeShares({ total: 1000, method: 'percentage', participants: ['a', 'b'], values: { a: 60, b: 30 } }).ok).toBe(false);
  });
  it('exact split must match total', () => {
    expect(computeShares({ total: 1000, method: 'exact', participants: ['a', 'b'], values: { a: 700, b: 200 } }).ok).toBe(false);
    const ok = computeShares({ total: 1000, method: 'exact', participants: ['a', 'b'], values: { a: 700, b: 300 } });
    expect(ok.ok && ok.shares).toEqual({ a: 700, b: 300 });
  });
});

describe('balances and settlement', () => {
  it('matches the worked example from the spec (paid 3000/500/1000, fair share 1500 each)', () => {
    const exp: LedgerExpense[] = [
      { amount: 300000, paidBy: 'h', shares: { h: 100000, a: 100000, b: 100000 } },
      { amount: 50000, paidBy: 'a', shares: { h: 50000 } },
      { amount: 100000, paidBy: 'b', shares: { a: 50000, b: 50000 } },
    ];
    const bal = computeBalances(['h', 'a', 'b'], exp);
    expect([bal.h.net, bal.a.net, bal.b.net]).toEqual([150000, -100000, -50000]);
    expect(suggestSettlements(bal)).toEqual([
      { from: 'a', to: 'h', amount: 100000 },
      { from: 'b', to: 'h', amount: 50000 },
    ]);
  });
  it('spec example: +1500, -1000, -500', () => {
    const bal = { h: { net: 150000 }, a: { net: -100000 }, b: { net: -50000 } };
    expect(suggestSettlements(bal)).toEqual([
      { from: 'a', to: 'h', amount: 100000 },
      { from: 'b', to: 'h', amount: 50000 },
    ]);
  });
  it('multiple payers: transfers zero out every balance', () => {
    const exp: LedgerExpense[] = [
      { amount: 6000, paidBy: 'a', shares: { a: 1500, b: 1500, c: 1500, d: 1500 } },
      { amount: 2400, paidBy: 'c', shares: { a: 600, b: 600, c: 600, d: 600 } },
      { amount: 1001, paidBy: 'd', shares: { a: 334, b: 334, c: 333 } },
    ];
    const bal = computeBalances(['a', 'b', 'c', 'd'], exp);
    const transfers = suggestSettlements(bal);
    const after = computeBalances(['a', 'b', 'c', 'd'], exp, transfers.map((t) => ({ ...t, status: 'confirmed' as const })));
    Object.values(after).forEach((v) => expect(v.net).toBe(0));
    expect(transfers.length).toBeLessThanOrEqual(3);
  });
  it('excluded participant owes nothing for that expense', () => {
    const r = computeShares({ total: 9000, method: 'equal', participants: ['a', 'b'] });
    const bal = computeBalances(['a', 'b', 'c'], [{ amount: 9000, paidBy: 'a', shares: r.ok ? r.shares : {} }]);
    expect(bal.c.net).toBe(0);
    expect(bal.b.net).toBe(-4500);
  });
  it('partial settlement: only confirmed transfers reduce what is owed', () => {
    const exp = [{ amount: 10000, paidBy: 'a', shares: { a: 5000, b: 5000 } }];
    const paidOnly = computeBalances(['a', 'b'], exp, [{ from: 'b', to: 'a', amount: 2000, status: 'paid' }]);
    expect(paidOnly.b.net).toBe(-5000);
    const confirmed = computeBalances(['a', 'b'], exp, [{ from: 'b', to: 'a', amount: 2000, status: 'confirmed' }]);
    expect(confirmed.b.net).toBe(-3000);
    expect(suggestSettlements(confirmed)).toEqual([{ from: 'b', to: 'a', amount: 3000 }]);
  });
  it('rounding case leaves balances summing to zero', () => {
    const r = computeShares({ total: 10000, method: 'equal', participants: ['a', 'b', 'c'] });
    const bal = computeBalances(['a', 'b', 'c'], [{ amount: 10000, paidBy: 'a', shares: r.ok ? r.shares : {} }]);
    expect(Object.values(bal).reduce((s, v) => s + v.net, 0)).toBe(0);
  });
});
