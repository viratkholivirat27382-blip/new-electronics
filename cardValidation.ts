import type { PaymentBrand } from '@/lib/orders';

export type CardDetails = { name: string; number: string; expiry: string; cvc: string };

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCardNumber(value: string) {
  const digits = digitsOnly(value).slice(0, 19);
  return digits.replace(/(.{4})(?=.)/g, '$1 ');
}

export function formatCardExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export type BrandRule = { brand: PaymentBrand; starting_digits: string };

const DEFAULT_RULES: BrandRule[] = [
  { brand: 'visa', starting_digits: '4' },
  { brand: 'mastercard', starting_digits: '5' },
  { brand: 'amex', starting_digits: '3' },
];

export function detectCardBrand(value: string, rules: BrandRule[] = DEFAULT_RULES): PaymentBrand | null {
  const digits = digitsOnly(value);
  if (!digits) return null;
  for (const rule of rules) {
    if (digits.startsWith(rule.starting_digits)) return rule.brand;
  }
  return null;
}

function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardDetails(
  brand: PaymentBrand,
  details: CardDetails,
  now: Date = new Date(),
): string | null {
  if (!details.name.trim()) return 'Please enter the name on your card.';

  const number = digitsOnly(details.number);
  const expectedLength = brand === 'amex' ? 15 : 16;
  if (number.length !== expectedLength) return `Please enter a valid ${expectedLength}-digit card number.`;
  if (detectCardBrand(number) !== brand) return 'This card number does not match the card brand you selected.';
  if (!passesLuhn(number)) return 'Please check your card number.';

  const match = /^(\d{2})\/(\d{2})$/.exec(details.expiry.trim());
  if (!match) return 'Please enter the expiry date as MM/YY.';
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'Please enter a valid expiry month.';
  const endOfExpiryMonth = new Date(year, month, 1);
  if (endOfExpiryMonth <= now) return 'This card has expired.';

  const cvcLength = brand === 'amex' ? 4 : 3;
  if (digitsOnly(details.cvc).length !== cvcLength) return `Please enter a ${cvcLength}-digit security code.`;

  return null;
}
