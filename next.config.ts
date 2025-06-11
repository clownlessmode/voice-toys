/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Разрешаем SVG проходить через оптимизатор Next.js
    dangerouslyAllowSVG: true,
    // Жёстко запрещаем выполнение скриптов из SVG
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Разрешаем конкретные внешние домены (см. ниже)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
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
