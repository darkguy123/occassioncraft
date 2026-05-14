import 'server-only';

const HARDCODED_PAYSTACK_SECRET_KEY = 'sk_live_1889a3ecb770bb0b0480183bd08e2b76f691ff8f';
const HARDCODED_KORAPAY_SECRET_KEY = 'sk_live_soSJnnV3P6g9Ey88rxFeryaCfUWyTAgDhthjyxo9';

export function getPaystackSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || HARDCODED_PAYSTACK_SECRET_KEY;
}

export function getKorapaySecretKey(): string {
  return process.env.KORAPAY_SECRET_KEY || HARDCODED_KORAPAY_SECRET_KEY;
}
