import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kreata — AI-Native Lead Generation for GTM Teams",
  description:
    "Find real people on social media who actually want to buy what you sell. Kreata turns any idea into a pipeline of high-intent leads across TikTok, Instagram, X, LinkedIn, and Facebook.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Kreata — AI-Native Lead Generation for GTM Teams",
    description:
      "Find real people on social media who actually want to buy what you sell. Kreata turns any idea into a pipeline of high-intent leads across TikTok, Instagram, X, LinkedIn, and Facebook.",
    siteName: "Kreata",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kreata — AI-Native Lead Generation for GTM Teams",
    description:
      "Find real people on social media who actually want to buy what you sell. Kreata turns any idea into a pipeline of high-intent leads across TikTok, Instagram, X, LinkedIn, and Facebook.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <SubscriptionProvider>
            <GlobalBackground>
              <Nav />
              {children}
            </GlobalBackground>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}