export type PolicySection = { heading: string; body: string };

export type Policy = {
  slug: string;
  title: string;
  intro: string;
  sections: PolicySection[];
};

export const POLICIES: Policy[] = [
  {
    slug: 'shipping',
    title: 'Shipping',
    intro: 'We want your order to reach you easily. Pick the payment option that suits you best, and we will take care of the rest.',
    sections: [
      {
        heading: 'Pay in full now',
        body: 'Pay the full amount at checkout and your eligible order ships free. There is nothing more to pay when it arrives.',
      },
      {
        heading: 'Cash on delivery',
        body: 'Pay a $3 prepaid shipping fee when you place your order. The rest of your total is paid in cash when your order is delivered.',
      },
      {
        heading: 'Discount codes',
        body: 'Your discount is taken off the price of your pieces, and shipping is added after that.',
      },
      {
        heading: 'Order confirmation',
        body: 'Your order number is shown on the confirmation page straight after checkout. We also send it to the email address you gave us.',
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Refund Policy',
    intro: 'If your order is not delivered, we will refund you.',
    sections: [
      {
        heading: 'Where your refund goes',
        body: 'Refunds are sent to the bank account you provide.',
      },
    ],
  },
];

export function getPolicy(slug: string) {
  return POLICIES.find((policy) => policy.slug === slug) ?? null;
}
