"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, Bookmark, CreditCard, User, Settings, LogOut, Zap, Menu } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useSubscription, PLAN_CONFIGS } from "@/lib/subscription-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

const navLinks = [
  { href: "/leads", label: "My Leads", icon: Bookmark },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/account", label: "Account", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function Nav() {
  const { user, signOut } = useAuth()
  const { subscription } = useSubscription()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const currentPlan = PLAN_CONFIGS[subscription?.plan || "free"]
  const credits = subscription?.creditsRemaining ?? 0

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <Sparkles className="w-4 h-4 text-background" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">Creata</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              {subscription?.status === "active" && (
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-full text-yellow-700 dark:text-yellow-400 mr-2"
                >
                  <Zap className="w-3 h-3" />
                  {credits}/{currentPlan.runs}
                </Link>
              )}
              <Link
                href="/leads"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/leads"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                My Leads
              </Link>
              <Link
                href="/pricing"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/pricing"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Pricing
              </Link>
              <Link
                href="/account"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/account"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <User className="w-4 h-4" />
                Account
              </Link>
              <div className="h-5 w-px bg-border mx-1" />
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground">
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-foreground">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-sm">
                <Link href="/auth/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {user && subscription?.status === "active" && (
            <Link
              href="/account"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-full text-yellow-700 dark:text-yellow-400"
            >
              <Zap className="w-3 h-3" />
              {credits}
            </Link>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <SheetHeader className="p-4 pb-2">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-background" />
                  </div>
                  <span>Creata</span>
                </SheetTitle>
              </SheetHeader>
              <Separator />
              <div className="p-4 space-y-1">
                {user ? (
                  <>
                    {navLinks.map(({ href, label, icon: Icon }) => (
                      <SheetClose key={href} asChild>
                        <Link
                          href={href}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                            pathname === href
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </Link>
                      </SheetClose>
                    ))}
                    <Separator className="my-2" />
                    <button
                      onClick={() => { signOut(); setOpen(false) }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link href="/auth/signin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                        <User className="w-4 h-4" />
                        Sign in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/auth/signin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                        <CreditCard className="w-4 h-4" />
                        Get started
                      </Link>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}