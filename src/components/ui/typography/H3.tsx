// app/components/H3.tsx

import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const headingStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[18px] leading-[18px] tracking-normal font-semibold",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[20px] sm:leading-[20px] sm:tracking-normal sm:font-semibold",
  // от 1536px и выше
  xl: "xl:text-[24px] xl:leading-[24px] xl:tracking-normal xl:font-semibold",
};

const H3: FC<HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
}) => {
  return (
    <h3 className={cn(...Object.values(headingStyles), className)}>
      {children}
    </h3>
  );
};

export default H3;
