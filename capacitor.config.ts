import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.numelixa.app",
  appName: "Numelixa",
  webDir: "public",
  server: {
    url: "https://numelixa.com",
    cleartext: false,
    allowNavigation: ["numelixa.com", "www.numelixa.com"]
  },
  android: {
    allowMixedContent: false,
    captureInput: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#10151d",
      showSpinner: false
    }
  }
};

export default config;
