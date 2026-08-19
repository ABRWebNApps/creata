import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, plan, amount } = await request.json();

    // Validate required fields
    if (!email || !plan || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: email, plan, amount' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans: Record<string, number> = {
      basic: 1099,
      agency: 4099,
    };

    if (!validPlans[plan]) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${Object.keys(validPlans).join(', ')}` },
        { status: 400 }
      );
    }

    // Call Paystack initialize endpoint
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to cents (Paystack expects amount in smallest currency unit)
        currency: 'USD',
        metadata: { plan },
      }),
    });

    const data = await paystackResponse.json();

    if (!paystackResponse.ok) {
      return NextResponse.json(
        { error: data.message || 'Paystack initialization failed' },
        { status: paystackResponse.status }
      );
    }

    // TODO: Set up webhook endpoint to verify Paystack payment status
    // - Create POST handler at /api/paystack/webhook
    // - Verify the webhook signature using process.env.PAYSTACK_SECRET_KEY
    // - Update the user's subscription status on successful payment

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Paystack initialize error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
