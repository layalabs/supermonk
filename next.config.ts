import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // lib/data.ts reads data/*.json at runtime; make sure Vercel ships them with the API routes.
  outputFileTracingIncludes: { "/api/**": ["./data/*.json"] },
};

export default nextConfig;
