import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion intentionally omitted to use SDK default
} as Stripe.StripeConfig);

const PRICE_MAP: Record<string, string> = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  team_monthly: process.env.STRIPE_TEAM_PRICE_ID!,
  team_annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID!,
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plan = "pro", interval = "monthly" } = body as {
      plan?: string;
      interval?: string;
    };

    const priceKey = `${plan}_${interval}`;
    const priceId = PRICE_MAP[priceKey];

    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
      metadata: {
        clerkUserId: userId,
        plan,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Unable to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
