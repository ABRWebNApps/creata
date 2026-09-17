import type { Metadata } from "next";
import PricingClientPage from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — Creata Lead & Customer Acquisition Platform",
  description:
    "Creata pricing: Free, Basic, Pro, and Premium plans. Credits roll over, top up from $5. Search TikTok, Instagram, X, LinkedIn and Facebook for leads with buying intent.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — Creata Lead & Customer Acquisition Platform",
    description:
      "Free, Basic, Pro, and Premium plans. Credits roll over, top up from $5. Search social media for leads with buying intent.",
    url: "https://creata.tech/pricing",
  },
};

export default function PricingPage() {
  return <PricingClientPage />;
}