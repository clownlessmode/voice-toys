import { readFileSync } from "node:fs";
import path from "node:path";

export const LEGAL_DOC_SLUGS = ["privacy-policy", "user-consent"] as const;

export type LegalDocSlug = (typeof LEGAL_DOC_SLUGS)[number];

export interface LegalDocMeta {
  slug: LegalDocSlug;
  title: string;
  description: string;
  footerTitle: string;
}

export const LEGAL_DOCS: Record<LegalDocSlug, LegalDocMeta> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Политика конфиденциальности",
    description:
      "Политика ИП Мурзина К.Г. в отношении обработки, защиты и конфиденциальности персональных данных.",
    footerTitle: "Политика конфиденциальности",
  },
  "user-consent": {
    slug: "user-consent",
    title: "Согласие на обработку персональных данных",
    description:
      "Пользовательское соглашение и согласие на обработку персональных данных на сайте Voicetoys.",
    footerTitle: "Пользовательское соглашение",
  },
};

export function isLegalDocSlug(value: string): value is LegalDocSlug {
  return (LEGAL_DOC_SLUGS as readonly string[]).includes(value);
}

export function loadLegalDocMarkdown(slug: LegalDocSlug): string {
  const filePath = path.join(process.cwd(), "content", "legal", `${slug}.md`);
  return readFileSync(filePath, "utf8");
}
