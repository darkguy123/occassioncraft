export const PLATFORM_FEE_PERCENT = 5;

export function calculatePlatformFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount * (PLATFORM_FEE_PERCENT / 100)).toFixed(2));
}

export function calculateVendorNet(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount - calculatePlatformFee(amount)).toFixed(2));
}

export function toMinorUnit(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export function fromMinorUnit(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount / 100).toFixed(2));
}
