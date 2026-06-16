import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SubscriptionTier } from "@/lib/subscription/tiers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion intentionally omitted to use SDK default
} as Stripe.StripeConfig);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID!]: "pro",
  [process.env.STRIPE_TEAM_PRICE_ID!]: "team",
  [process.env.STRIPE_TEAM_ANNUAL_PRICE_ID!]: "team",
};

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string | undefined;
        const subscriptionId = session.subscription as string | undefined;

        if (!userId) {
          return new Response("Missing client_reference_id", { status: 400 });
        }

        let tier: SubscriptionTier = "free";
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const price = subscription.items.data[0]?.price;
          const priceId = typeof price === "string" ? price : price?.id;
          if (priceId) {
            tier = PRICE_TO_TIER[priceId] ?? "free";
          }
        }

        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            subscriptionTier: tier,
            stripeSubscriptionId: subscriptionId ?? null,
          },
          privateMetadata: {
            stripeCustomerId: customerId ?? null,
          },
        });

        await prisma.userSettings.upsert({
          where: { userId },
          create: { userId, isPremium: tier !== "free" },
          update: { isPremium: tier !== "free" },
        });

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.clerkUserId as string | undefined;

        if (!userId) {
          // Fallback: resolve user from checkout session
          const sessions = await stripe.checkout.sessions.list({
            subscription: subscription.id,
            limit: 1,
          });
          userId = sessions.data[0]?.client_reference_id ?? undefined;
        }

        if (!userId) {
          return new Response("Could not resolve user for subscription", { status: 400 });
        }

        const isCanceled =
          subscription.status === "canceled" || subscription.status === "unpaid";
        const tier: SubscriptionTier = isCanceled ? "free" : (() => {
          const price = subscription.items.data[0]?.price;
          const priceId = typeof price === "string" ? price : price?.id;
          return priceId ? (PRICE_TO_TIER[priceId] ?? "free") : "free";
        })();

        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            subscriptionTier: tier,
            stripeSubscriptionId: isCanceled ? null : subscription.id,
          },
        });

        await prisma.userSettings.upsert({
          where: { userId },
          create: { userId, isPremium: tier !== "free" },
          update: { isPremium: tier !== "free" },
        });

        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
