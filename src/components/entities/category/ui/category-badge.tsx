import React from "react";
import { CategoryBadgeItem } from "../config/types";
import T2 from "@/components/ui/typography/T2";
import { cn } from "@/lib/utils";

const CategoryBadge = ({ label, onClick, value }: CategoryBadgeItem) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "px-[14px] py-[6px] rounded-full w-fit cursor-pointer",
        value ? "bg-primary" : "bg-white"
      )}
    >
      <T2>{label}</T2>
    </div>
  );
};

export default CategoryBadge;
