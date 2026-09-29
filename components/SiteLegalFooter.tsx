import Link from "next/link";
import CookieSettingsButton from "@/components/CookieSettingsButton";

export default function SiteLegalFooter() {
  return <footer className="border-t border-slate-200 px-6 py-5 text-center text-sm text-slate-600"><nav aria-label="Legal and cookie settings" className="flex flex-wrap justify-center gap-x-5 gap-y-2"><Link href="/cookie-policy">Cookie Policy</Link><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms">Terms and Conditions</Link><CookieSettingsButton /></nav></footer>;
}
