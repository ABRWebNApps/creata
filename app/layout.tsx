import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "wght"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Creata — Find buyers from what they say, not who follows them",
  description:
    "Search TikTok, Instagram, X, LinkedIn and Facebook by what people are actually saying — a complaint, a question, a caption — and get the comment that gave them away.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Creata — AI-native lead generation",
    description:
      "Search social platforms by intent, not follower count. Find real people who just told the internet they need what you sell.",
    siteName: "Creata",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creata — AI-native lead generation",
    description:
      "Search social platforms by intent, not follower count. Find real people who just told the internet they need what you sell.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${spaceGrotesk.variable} font-body antialiased`} suppressHydrationWarning>
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