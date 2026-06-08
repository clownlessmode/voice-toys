/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "placehold.co",
      "example.com",
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
      // Demo / seed URLs (e.g. sample-wb-card fixture)
      { protocol: "https", hostname: "example.com", pathname: "/**" },
      // Wildberries product photos (basket CDN subdomains)
      { protocol: "https", hostname: "**.wbbasket.ru", pathname: "/**" },
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
