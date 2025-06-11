import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const headingStyles = {
  // до 640px включительно
  xs: "text-[22px] leading-[22px] tracking-normal font-semibold",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[24px] sm:leading-[24px] sm:tracking-normal sm:font-semibold",
  // от 1536px и выше
  xl: "xl:text-[32px] xl:leading-[32px] xl:tracking-normal xl:font-semibold",
};

const H2: FC<HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
}) => {
  return (
    <h2 className={cn(...Object.values(headingStyles), className)}>
      {children}
    </h2>
  );
};

export default H2;
