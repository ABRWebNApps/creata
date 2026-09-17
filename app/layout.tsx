import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Creata — Lead & Customer Acquisition Platform | Find Buyers With Buying Intent",
  description:
    "Creata is a lead and customer acquisition platform that searches TikTok, Instagram, X, LinkedIn and Facebook by what people are actually saying — a complaint, a question, a caption — and surfaces the buying intent, plus pain point analysis that tells you exactly what to say next.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/favicon.svg", type: "image/svg+xml" },
  },
  metadataBase: new URL("https://creata.tech"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Creata — Lead & Customer Acquisition Platform",
    description:
      "Search social platforms by intent, not follower count. Find real people who just told the internet they need what you sell, with pain point analysis and an AI-suggested opening line.",
    url: "https://creata.tech",
    siteName: "Creata",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creata — Lead & Customer Acquisition Platform",
    description:
      "Search social platforms by intent, not follower count. Find real people who just told the internet they need what you sell, with pain point analysis and an AI-suggested opening line.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
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