// app/components/T2.tsx

import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const textStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[16px] leading-[16px] tracking-normal font-medium",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[16px] sm:leading-[16px] sm:tracking-normal sm:font-medium",
  // от 1536px и выше
  xl: "xl:text-[16px] xl:leading-[16px] xl:tracking-normal xl:font-medium",
};

const T2: FC<HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
}) => {
  return (
    <p className={cn(...Object.values(textStyles), className)}>{children}</p>
  );
};

export default T2;
