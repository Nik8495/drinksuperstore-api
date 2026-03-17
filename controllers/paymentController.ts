import { Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../utils/SupabaseClient.js';

const stripeSecretKey = process.env['STRIPE_SECRET_KEY'] || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export const createPaymentIntent = async (req: Request, res: Response) => {
  const { amount, currency } = req.body || {};

  if (!stripe) {
    return res.status(500).json({
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
    });
  }

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency: currency || 'usd',
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Error creating payment intent',
      error: error?.message || 'Unknown error',
    });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { amount, currency, customerEmail, userId } = req.body || {};

  if (!stripe) {
    return res.status(500).json({
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
    });
  }

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }

  const origin = req.headers.origin || process.env['FRONTEND_URL'] || '';
  if (!origin) {
    return res.status(400).json({ message: 'Missing origin for redirect URLs.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'gbp',
            product_data: {
              name: 'Drink Superstore Order',
            },
            unit_amount: Number(amount),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout?paymentSuccess=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?paymentCanceled=true`,
      customer_email: customerEmail || undefined,
      client_reference_id: userId || undefined,
      metadata: {
        user_id: userId || '',
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Error creating checkout session',
      error: error?.message || 'Unknown error',
    });
  }
};

export const getCheckoutSession = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!stripe) {
    return res.status(500).json({
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
    });
  }

  if (!id) {
    return res.status(400).json({ message: 'sessionId is required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['payment_intent'],
    });

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
    const payload = {
      session_id: session.id,
      payment_intent_id: paymentIntent?.id ?? (session.payment_intent as any),
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_email,
      user_id: session.client_reference_id,
      response_payload: {
        id: session.id,
        payment_intent: paymentIntent?.id ?? session.payment_intent,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
        created: session.created,
      },
      created_at: new Date(),
    };

    await supabase
      .from('payments')
      .upsert(payload, { onConflict: 'session_id' });

    return res.status(200).json(session);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Error retrieving checkout session',
      error: error?.message || 'Unknown error',
    });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const record = {
      user_id: payload.userId ?? payload.user_id ?? null,
      order_id: payload.orderId ?? payload.order_id ?? null,
      session_id: payload.sessionId ?? payload.session_id ?? null,
      payment_intent_id: payload.paymentIntentId ?? payload.payment_intent_id ?? null,
      status: payload.status ?? null,
      payment_status: payload.paymentStatus ?? payload.payment_status ?? null,
      amount_total: payload.amountTotal ?? payload.amount_total ?? null,
      currency: payload.currency ?? null,
      customer_email: payload.customerEmail ?? payload.customer_email ?? null,
      response_payload: payload.responsePayload ?? payload.response_payload ?? null,
      created_at: new Date(),
    };

    let query = supabase.from('payments');
    let response;
    if (record.session_id) {
      response = await query.upsert(record, { onConflict: 'session_id' }).select().single();
    } else {
      response = await query.insert(record).select().single();
    }

    if (response.error) {
      return res.status(500).json({ message: 'Failed to record payment', error: response.error.message });
    }

    return res.status(201).json(response.data);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to record payment',
      error: error?.message || 'Unknown error',
    });
  }
};
