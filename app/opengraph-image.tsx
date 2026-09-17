import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#0b1b33",
        }}
      >
        {/* Sparkle icon in brand blue */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 32 32"
          style={{ marginBottom: 24 }}
        >
          <rect width="32" height="32" rx="8" fill="#2563eb" />
          <path d="M12.937 17.5A2 2 0 0 0 11.5 16.063l-4.135-1.582a.5.5 0 0 1 0-.962L11.5 11.936A2 2 0 0 0 12.937 10.5l1.582-4.135a.5.5 0 0 1 .963 0L17.063 10.5A2 2 0 0 0 18.5 11.936l4.135 1.581a.5.5 0 0 1 0 .964L18.5 16.063a2 2 0 0 0-1.437 1.437l-1.582 4.135a.5.5 0 0 1-.963 0z" fill="white" />
        </svg>
        <h1 style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, margin: 0, marginBottom: 8 }}>
          Creata
        </h1>
        <p style={{ fontSize: 28, opacity: 0.7, maxWidth: 600, textAlign: "center", lineHeight: 1.3 }}>
          Lead &amp; Customer Acquisition Platform
        </p>
      </div>
    ),
    {
      ...size,
    },
  );
}