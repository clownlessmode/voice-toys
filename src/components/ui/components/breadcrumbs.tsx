import React from "react";
import Link from "next/link";
import Descriptor from "../typography/Descriptor";

interface BreadcrumbItem {
  title: string;
  link: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="leading-none">
      <Descriptor
        className="text-black/30"
        style={{ overflowWrap: "anywhere" }}
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Link href={item.link} className="hover:underline">
              {item.title}
            </Link>
            {index < items.length - 1 && " / "}
          </React.Fragment>
        ))}
      </Descriptor>
    </nav>
  );
};

export default Breadcrumbs;
