export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price_per_unit: number;
  currency_symbol: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TbN3CrDZa8YPTi',
    priceId: 'price_1SeAJFCKgRedzyinWELxWsB4',
    name: 'Potatoes',
    description: 'Fresh organic potatoes delivered to your door',
    price_per_unit: 45.00,
    currency_symbol: '₹',
    mode: 'subscription'
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}