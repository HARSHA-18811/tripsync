/** All money is stored as integer minor units (paise/cents). Never use floats for money. */
export const fmt = (minor: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);
export const toMinor = (v: string | number) => Math.round(Number(v) * 100);
export const toMajor = (minor: number) => (minor / 100).toString();
export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
