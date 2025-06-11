import React from "react";
import { TypeCardItem } from "../config";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/typography/Navigation";

const TypeCard = ({ image, link, title }: TypeCardItem) => {
  return (
    <Link href={link} className="w-full h-fit overflow-hidden rounded-[20px]">
      <Image
        alt={title}
        src={`/categories-types/${image}`}
        className="overflow-hidden aspect-square"
        width={1000}
        height={1000}
      />
      <div className="flex justify-center text-center items-center pt-[24px] px-[12px] pb-[36px] bg-white">
        <Navigation className="scale-90">{title}</Navigation>
      </div>
    </Link>
  );
};

export default TypeCard;
