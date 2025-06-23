/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Разрешаем SVG проходить через оптимизатор Next.js
    dangerouslyAllowSVG: true,
    // Жёстко запрещаем выполнение скриптов из SVG
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Разрешаем конкретные внешние домены (см. ниже)bun
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.ru-7.storage.selcloud.ru",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "voice-toys.s3.ru-7.storage.selcloud.ru",
        port: "",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
