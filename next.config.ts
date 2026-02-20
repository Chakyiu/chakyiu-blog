import type { NextConfig } from "next";
import path from "path";

const mockPath = path.resolve(
  __dirname,
  "src/lib/db/bun-sqlite-mock.cjs"
);

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        { "bun:sqlite": `commonjs ${mockPath}` },
        ...externals.filter((ext: unknown) => ext !== "bun:sqlite"),
      ];
    }
    return config;
  },
};

export default nextConfig;
