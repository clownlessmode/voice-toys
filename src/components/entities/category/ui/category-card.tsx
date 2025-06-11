import React from "react";
import { CategoryCardItem } from "../config";
import { cn } from "@/lib/utils";
import H3 from "@/components/ui/typography/H3";
import Image from "next/image";
import Link from "next/link";
import Button1 from "@/components/ui/typography/Button1";
import { ArrowRight } from "lucide-react";

const CategoryCard = ({
  age,
  image,
  link,
  color,
  badges,
}: CategoryCardItem) => {
  return (
    <Link
      href={link}
      style={{ backgroundColor: color }}
      className={cn(
        "w-full flex flex-col gap-[20px] rounded-[20px] items-center px-[12px] py-[24px]"
      )}
    >
      <H3>{age}</H3>
      <Image
        alt="baby"
        src={`/select-your-category/${image}`}
        className="overflow-hidden rounded-[20px]"
        width={1000}
        height={1000}
      />
      <div className="hidden 2xl:flex flex-row gap-2 flex-wrap">
        {badges.map((item) => (
          <div className="border border-black rounded-full p-2" key={item}>
            {item}
          </div>
        ))}
      </div>
      <Button1 className="bg-transparent w-full py-0 h-fit justify-center 2xl:hidden">
        Перейти <ArrowRight className="size-[16px] md:size-[24px]" />
      </Button1>
    </Link>
  );
};

export default CategoryCard;
