import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack to this project root — there's a stray lockfile at $HOME
  // that Next would otherwise pick as the workspace root.
  turbopack: { root: __dirname },
};

export default nextConfig;
