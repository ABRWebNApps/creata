import type { Metadata } from "next";
import SignUpClientPage from "./SignUpClient";

export const metadata: Metadata = {
  title: "Sign Up — Creata Lead & Customer Acquisition Platform",
  description: "Create a free Creata account. Search TikTok, Instagram, X, LinkedIn and Facebook for leads with buying intent. One free credit to start. No credit card required.",
  alternates: { canonical: "/auth/signup" },
};

export default function SignUpPage() {
  return <SignUpClientPage />;
}