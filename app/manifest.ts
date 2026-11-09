import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nexora AI",
    short_name: "Nexora",
    description: "One Platform. Multiple Intelligences.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#080d18",
    theme_color: "#080d18",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/nexora-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/nexora-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/nexora-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
