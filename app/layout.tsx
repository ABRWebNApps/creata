import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creata - AI-Powered Creator Discovery",
  description: "Find and connect with perfect creators for your brand",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Creata - AI-Powered Creator Discovery",
    description: "Find and connect with perfect creators for your brand",
    siteName: "Creata",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creata - AI-Powered Creator Discovery",
    description: "Find and connect with perfect creators for your brand",
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