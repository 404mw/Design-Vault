import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default Server Action body limit is 1MB, which real screenshots and the
  // short screen recordings the UI-screens route accepts blow past
  // immediately. Raised for the /screens/new upload action.
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
