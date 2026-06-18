/**
 * Shared-expense / split-bills engine. Pure, deterministic, stateless — given a
 * group's members and expenses, computes who owes whom and a minimal set of
 * settlements. Used by the split MVP (the page keeps group state client-side).
 */

export interface SplitMember {
  id: string;
  name: string;
}

export interface SplitExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // member id
  /** Optional explicit shares per member. If omitted, split equally. */
  shares?: Record<string, number>; // member id -> share weight (or amount)
  /** "weight" shares are proportional; "amount" shares are exact COP. */
  shareType?: "weight" | "amount";
}

export interface SplitGroup {
  id: string;
  name: string;
  members: SplitMember[];
  expenses: SplitExpense[];
  currency: string;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  paid: number; // total they fronted
  owes: number; // total they're responsible for
  net: number; // paid - owes: positive => group owes them; negative => they owe the group
}

export interface Settlement {
  from: string; // member id (payer)
  to: string; // member id (receiver)
  amount: number;
}

const EPSILON = 0.01;

function normalizeShares(
  expense: SplitExpense,
  memberIds: string[]
): Record<string, number> {
  if (expense.shareType === "amount") {
    const shares = { ...(expense.shares ?? {}) };
    // If amount shares don't sum to expense.amount, scale them.
    const total = memberIds.reduce((sum, id) => sum + (shares[id] ?? 0), 0);
    if (total > EPSILON && Math.abs(total - expense.amount) > EPSILON) {
      const scale = expense.amount / total;
      for (const id of memberIds) shares[id] = (shares[id] ?? 0) * scale;
    }
    return shares;
  }
  // weight (default): equal split if no shares.
  if (!expense.shares) {
    const equal = expense.amount / memberIds.length;
    return Object.fromEntries(memberIds.map((id) => [id, equal]));
  }
  const totalWeight = memberIds.reduce((sum, id) => sum + (expense.shares![id] ?? 0), 0);
  if (totalWeight <= 0) {
    const equal = expense.amount / memberIds.length;
    return Object.fromEntries(memberIds.map((id) => [id, equal]));
  }
  return Object.fromEntries(
    memberIds.map((id) => [id, expense.amount * ((expense.shares![id] ?? 0) / totalWeight)])
  );
}

export function computeBalances(group: SplitGroup): MemberBalance[] {
  const memberIds = group.members.map((m) => m.id);
  const paid = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const owes = new Map<string, number>(memberIds.map((id) => [id, 0]));

  for (const expense of group.expenses) {
    if (!paid.has(expense.paidBy)) continue;
    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + expense.amount);
    const shares = normalizeShares(expense, memberIds);
    for (const id of memberIds) {
      owes.set(id, (owes.get(id) ?? 0) + (shares[id] ?? 0));
    }
  }

  return group.members.map((m) => {
    const p = paid.get(m.id) ?? 0;
    const o = owes.get(m.id) ?? 0;
    return { memberId: m.id, name: m.name, paid: p, owes: o, net: p - o };
  });
}

/**
 * Greedy minimal-settlement algorithm: settle the largest creditor from the
 * largest debtor until balances are zero. Produces a small set of payments.
 */
export function suggestSettlements(balances: MemberBalance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net > EPSILON)
    .map((b) => ({ id: b.memberId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.net < -EPSILON)
    .map((b) => ({ id: b.memberId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const payment = Math.min(creditor.amount, debtor.amount);
    if (payment > EPSILON) {
      settlements.push({ from: debtor.id, to: creditor.id, amount: round(payment) });
    }
    creditor.amount -= payment;
    debtor.amount -= payment;
    if (creditor.amount <= EPSILON) ci++;
    if (debtor.amount <= EPSILON) di++;
  }
  return settlements;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}