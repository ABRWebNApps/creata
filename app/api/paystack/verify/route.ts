import { NextRequest, NextResponse } from 'next/server';

const PAYSTACK_API = 'https://api.paystack.co/transaction/verify';

const PLAN_CREDITS: Record<string, number> = {
  basic: 15,
  pro: 35,
  premium: 50,
  // Legacy fallback
  agency: 50,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Missing reference query parameter' },
        { status: 400 }
      );
    }

    const response = await fetch(`${PAYSTACK_API}/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { success: false, message: data.message || 'Paystack verification failed' },
        { status: 400 }
      );
    }

    const plan: string = data.data.metadata?.plan;
    const credits = plan ? PLAN_CREDITS[plan] ?? 0 : 0;

    return NextResponse.json({
      success: true,
      plan,
      credits,
      amount: data.data.amount / 100,
      reference: data.data.reference,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}