export interface LedgerExpense { amount: number; paidBy: string; shares: Record<string, number> }
export interface LedgerSettlement { from: string; to: string; amount: number; status: 'paid' | 'confirmed' }
export interface Balance { paid: number; share: number; net: number }
export interface Transfer { from: string; to: string; amount: number }

/** net = paid - share. Only CONFIRMED settlements move balances ("paid" alone is not proof of payment). */
export function computeBalances(memberIds: string[], expenses: LedgerExpense[], settlements: LedgerSettlement[] = []): Record<string, Balance> {
  const b: Record<string, Balance> = {};
  const ensure = (id: string) => (b[id] ??= { paid: 0, share: 0, net: 0 });
  memberIds.forEach(ensure);
  for (const e of expenses) {
    ensure(e.paidBy).paid += e.amount;
    for (const [id, s] of Object.entries(e.shares)) ensure(id).share += s;
  }
  for (const id of Object.keys(b)) b[id].net = b[id].paid - b[id].share;
  for (const s of settlements) {
    if (s.status !== 'confirmed') continue;
    ensure(s.from).net += s.amount; // sender has paid out, so owes less
    ensure(s.to).net -= s.amount; // receiver has been repaid, so is owed less
  }
  return b;
}

/** Deterministic greedy: repeatedly match the largest debtor with the largest creditor. */
export function suggestSettlements(balances: Record<string, { net: number }>): Transfer[] {
  const cmp = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0]);
  const cred = Object.entries(balances).filter(([, v]) => v.net > 0).map(([k, v]) => [k, v.net] as [string, number]).sort(cmp);
  const debt = Object.entries(balances).filter(([, v]) => v.net < 0).map(([k, v]) => [k, -v.net] as [string, number]).sort(cmp);
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const amt = Math.min(debt[i][1], cred[j][1]);
    if (amt > 0) out.push({ from: debt[i][0], to: cred[j][0], amount: amt });
    debt[i][1] -= amt; cred[j][1] -= amt;
    if (debt[i][1] === 0) i++;
    if (cred[j][1] === 0) j++;
    // keep lists ordered by remaining size for fewer transfers
    debt.slice(i).sort(cmp).forEach((d, k) => (debt[i + k] = d));
    cred.slice(j).sort(cmp).forEach((c, k) => (cred[j + k] = c));
  }
  return out;
}
