export const HARDCODED_PAYSTACK_PUBLIC_KEY = 'pk_live_2b2908cd72c948b9dda38b1ad9e85e00d1c46304';
export const HARDCODED_KORAPAY_PUBLIC_KEY = 'pk_live_w1sXEJFS5Qoj1wjwDiaLdV3u4uGVjpVkn8Vr9RNo';

export function getPaystackPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    HARDCODED_PAYSTACK_PUBLIC_KEY
  );
}

export function getKorapayPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY ||
    process.env.KORAPAY_PUBLIC_KEY ||
    HARDCODED_KORAPAY_PUBLIC_KEY
  );
}
