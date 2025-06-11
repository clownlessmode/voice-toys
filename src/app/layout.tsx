import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
const montserrat = Montserrat({
  variable: "--font-montserrat-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voicetoys — развивающие игрушки, в которые влюбляются дети",
  description:
    "Яркие, безопасные и говорящие игрушки для детей от 6 месяцев до 10 лет. Более 500 000 заказов, доверие родителей по всей России.",
  keywords: [
    "Voicetoys",
    "развивающие игрушки",
    "говорящие игрушки",
    "интерактивные игрушки",
    "безопасные игрушки",
    "дети 6 месяцев 10 лет",
    "радиоуправляемые",
    "конструкторы",
    "обучающие наборы",
    "мягкие игрушки",
    "сенсорные игрушки",
    "логические игры",
    "подарочные наборы",
  ],
  metadataBase: new URL("https://voicetoys.ru"),
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "Voicetoys" }],
  publisher: "Voicetoys",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://voicetoys.ru",
    title: "Voicetoys — развивающие игрушки, в которые влюбляются дети",
    description:
      "Яркие, безопасные и говорящие игрушки для детей от 6 месяцев до 10 лет. Более 500 000 заказов, доверие родителей по всей России.",
    siteName: "Voicetoys",
  },
  twitter: {
    card: "summary",
    title: "Voicetoys — развивающие игрушки, в которые влюбляются дети",
    description:
      "Яркие, безопасные и говорящие игрушки для детей от 6 месяцев до 10 лет. Более 500 000 заказов, доверие родителей по всей России.",
    creator: "@voicetoys_ru",
    site: "@voicetoys_ru",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="bg-body-background">
      <body className={`${montserrat.variable} antialiased `}>{children}</body>
    </html>
  );
}
