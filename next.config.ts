/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "placehold.co",
      "api.ru-7.storage.selcloud.ru",
      "voice-toys.s3.ru-7.storage.selcloud.ru",
      "**.selstorage.ru",
    ],
    formats: ["image/webp"],
    // Разрешаем SVG проходить через оптимизатор Next.js
    dangerouslyAllowSVG: true,
    // Жёстко запрещаем выполнение скриптов из SVG
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      new URL("https://voice-toys.s3.ru-7.storage.selcloud.ru/**"),
      new URL("https://**.selstorage.ru/**"),
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
