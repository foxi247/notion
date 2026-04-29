import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  allowedDevOrigins: [
    "https://preview-chat-f116cb47-af87-401e-846e-1d28a6bbc10e.space.z.ai",
  ],
};

export default nextConfig;
