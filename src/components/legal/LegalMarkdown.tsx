import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => (
    <h2 className="text-[28px] leading-[32px] font-semibold text-foreground mb-6">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-[22px] leading-[28px] font-semibold text-foreground mt-10 mb-4">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-[18px] leading-[24px] font-semibold text-foreground mt-8 mb-3">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5 className="text-[16px] leading-[22px] font-semibold text-foreground mt-6 mb-2">
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p className="text-[15px] leading-[24px] text-gray-700 mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-4 space-y-2 text-[15px] leading-[24px] text-gray-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 text-[15px] leading-[24px] text-gray-700">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => {
    const url = href ?? "#";
    const className =
      "text-foreground underline underline-offset-2 hover:text-gray-600";

    if (url.startsWith("/")) {
      const isLegalDoc = url.startsWith("/legal/");
      return (
        <Link
          href={url}
          className={className}
          {...(isLegalDoc
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {children}
        </Link>
      );
    }

    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
};

interface LegalMarkdownProps {
  content: string;
}

export default function LegalMarkdown({ content }: LegalMarkdownProps) {
  return (
    <article className="legal-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
