import { auth } from "@/lib/clerk-stub/server";
import { clerkClient } from "@/lib/clerk-stub/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion intentionally omitted to use SDK default
} as Stripe.StripeConfig);

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await clerkClient.users.getUser(userId);
    const customerId = user.privateMetadata?.stripeCustomerId as string | undefined;

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Subscribe to a plan first." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe portal error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
