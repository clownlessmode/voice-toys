import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
import Descriptor from "@/components/ui/typography/Descriptor";
import H1 from "@/components/ui/typography/H1";
import {
  LEGAL_DOCS,
  LEGAL_DOC_SLUGS,
  isLegalDocSlug,
  loadLegalDocMarkdown,
  type LegalDocSlug,
} from "@/lib/legal-docs";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_DOC_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalDocSlug(slug)) return {};

  const doc = LEGAL_DOCS[slug];
  return {
    title: `${doc.title} | Voicetoys`,
    description: doc.description,
  };
}

async function LegalPageContent({ slug }: { slug: LegalDocSlug }) {
  const doc = LEGAL_DOCS[slug];
  const content = loadLegalDocMarkdown(slug);

  return (
    <main
      className={cn(
        "px-[10px] gap-[40px]",
        "xl:px-[50px] xl:gap-[50px]",
        "2xl:px-[100px] 2xl:gap-[60px]",
        "flex flex-col items-center justify-start min-h-screen bg-body-background"
      )}
    >
      <Header />

      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <div className="text-center">
          <H1 className="mb-4">{doc.title}</H1>
          <Descriptor className="text-lg text-gray-600 max-w-2xl mx-auto">
            {doc.description}
          </Descriptor>
        </div>

        <div className="bg-white rounded-2xl px-6 py-8 md:px-10 md:py-10 shadow-sm">
          <LegalMarkdown content={content} />
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  if (!isLegalDocSlug(slug)) notFound();

  return (
    <Suspense fallback={<div className="min-h-screen bg-body-background" />}>
      <LegalPageContent slug={slug} />
    </Suspense>
  );
}
