"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Unhandled root error", error); }, [error]);
  return <html lang="en"><body><main style={{ fontFamily: "sans-serif", margin: "10vh auto", maxWidth: 560, padding: 24, textAlign: "center" }}><h1>Creata could not load</h1><p>Try again. If the problem continues, contact [SUPPORT EMAIL].</p><button onClick={() => reset()}>Try again</button></main></body></html>;
}
