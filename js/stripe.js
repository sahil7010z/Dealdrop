// Stripe integration utilities
import { stripeProducts } from '../src/stripe-config.js';

class StripeService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
    }

    async createCheckoutSession(priceId, mode = 'payment') {
        try {
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            
            if (authError || !user) {
                throw new Error('User not authenticated');
            }

            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            
            if (sessionError || !session?.access_token) {
                throw new Error('No valid session found');
            }

            const product = stripeProducts.find(p => p.priceId === priceId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Store order info for success page
            localStorage.setItem('lastOrderProduct', product.name);
            localStorage.setItem('lastOrderAmount', product.price_per_unit.toString());
            localStorage.setItem('lastOrderMode', mode);

            const response = await fetch(`${this.baseUrl}/functions/v1/stripe-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    price_id: priceId,
                    mode: mode,
                    success_url: `${window.location.origin}/pages/success.html?session_id={CHECKOUT_SESSION_ID}&product=${encodeURIComponent(product.name)}&amount=${product.price_per_unit}&mode=${mode}`,
                    cancel_url: `${window.location.origin}/pages/categories_page.html`
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            throw error;
        }
    }

    async getUserSubscription() {
        try {
            const { data, error } = await this.supabase
                .from('stripe_user_subscriptions')
                .select('*')
                .maybeSingle();

            if (error) {
                console.error('Error fetching subscription:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error getting user subscription:', error);
            return null;
        }
    }

    async getUserOrders() {
        try {
            const { data, error } = await this.supabase
                .from('stripe_user_orders')
                .select('*')
                .order('order_date', { ascending: false });

            if (error) {
                console.error('Error fetching orders:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error getting user orders:', error);
            return [];
        }
    }

    getProducts() {
        return stripeProducts;
    }

    getProductById(id) {
        return stripeProducts.find(product => product.id === id);
    }

    getProductByPriceId(priceId) {
        return stripeProducts.find(product => product.priceId === priceId);
    }
}

// Export for use in other files
window.StripeService = StripeService;

export default StripeService;