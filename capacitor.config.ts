import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.NEXORA_MOBILE_WEB_URL;

const config: CapacitorConfig = {
  appId: "com.nexoraai.app",
  appName: "Nexora AI",
  webDir: "www",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        allowNavigation: [new URL(serverUrl).hostname],
      }
    : undefined,
  ios: {
    contentInset: "automatic",
    backgroundColor: "#080d18",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#080d18",
    allowMixedContent: false,
  },
};

export default config;
