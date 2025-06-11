import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const priceStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[24px] leading-[24px] tracking-normal font-semibold",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[24px] sm:leading-[24px] sm:tracking-normal sm:font-semibold",
  // от 1536px и выше
  xl: "xl:text-[24px] xl:leading-[24px] xl:tracking-normal xl:font-semibold",
};

const Price: FC<HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
}) => {
  return (
    <span className={cn(...Object.values(priceStyles), className)}>
      {children}
    </span>
  );
};

export default Price;
