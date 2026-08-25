import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      { source: "/auth/login", destination: "/login", permanent: false },
      { source: "/auth/sign-up", destination: "/register", permanent: false },
      { source: "/protected", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
