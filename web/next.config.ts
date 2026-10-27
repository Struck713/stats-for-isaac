import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone (server.js + only the traced node_modules) for the Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite ships WebAssembly and the Postgres driver uses Node sockets; load both at runtime
  // instead of bundling them.
  // The embed images read the game font from disk, which the tracer can't see.
  outputFileTracingIncludes: { "/**/opengraph-image": ["./src/app/fonts/IsaacGame.ttf"] },
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
