// client/next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // This is CRITICAL for the Nginx strategy
};

module.exports = nextConfig;
