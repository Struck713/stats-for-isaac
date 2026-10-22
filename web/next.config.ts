import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone (server.js + only the traced node_modules) for the Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite ships WebAssembly and the Postgres driver uses Node sockets; load both at runtime
  // instead of bundling them.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
