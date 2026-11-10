import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "../components/pwa-register";

export const metadata: Metadata = {
  title: "Nexora AI | One Platform. Multiple Intelligences.",
  description: "A modular AI workspace with specialist assistants.",
  applicationName: "Nexora AI",
  appleWebApp: { capable: true, title: "Nexora AI", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/nexora-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/nexora-icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#080d18" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<PwaRegister /></body></html>;
}
