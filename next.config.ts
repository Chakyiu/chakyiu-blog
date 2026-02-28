import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "blog.chakyiu.dev" },
    ],
  },
  turbopack: {
    resolveAlias: {
      // Tell Turbopack that bun:sqlite is a native Bun built-in;
      // it will be left as an external and resolved at runtime by Bun.
      "bun:sqlite": "bun:sqlite",
    },
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      // nextRuntime === 'nodejs'  → API routes & RSC run in Bun's runtime,
      //   so mark bun:sqlite as a real external that Bun resolves natively.
      // nextRuntime === 'edge'    → middleware no longer imports bun:sqlite
      //   (auth.config.ts is DB-free), so no special handling needed.
      if (nextRuntime === "nodejs") {
        config.externals = [
          { "bun:sqlite": "commonjs bun:sqlite" },
          ...externals.filter((ext: unknown) => ext !== "bun:sqlite"),
        ];
      }
    }
    return config;
  },
};

export default nextConfig;
