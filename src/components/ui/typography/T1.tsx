// app/components/T1.tsx

import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const textStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[18px] leading-[22px] tracking-normal font-medium",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[20px] sm:leading-[24px] sm:tracking-normal sm:font-medium",
  // от 1536px и выше
  xl: "xl:text-[24px] xl:leading-[32px] xl:tracking-normal xl:font-medium",
};

const T1: FC<HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
}) => {
  return (
    <p className={cn(...Object.values(textStyles), className)}>{children}</p>
  );
};

export default T1;
