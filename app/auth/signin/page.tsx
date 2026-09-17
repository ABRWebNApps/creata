import type { Metadata } from "next";
import SignInClientPage from "./SignInClient";

export const metadata: Metadata = {
  title: "Sign In — Creata Lead & Customer Acquisition Platform",
  description: "Sign in to your Creata account to search across TikTok, Instagram, X, LinkedIn and Facebook for leads with buying intent and pain point analysis.",
  alternates: { canonical: "/auth/signin" },
};

export default function SignInPage() {
  return <SignInClientPage />;
}