// client/next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "export", // This is CRITICAL for the Nginx strategy
};

module.exports = nextConfig;
