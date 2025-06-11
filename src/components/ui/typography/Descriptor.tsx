// app/components/Descriptor.tsx

import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const descriptorStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[14px] leading-[14px] tracking-normal font-medium",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[14px] sm:leading-[14px] sm:tracking-normal sm:font-medium",
  // от 1536px и выше
  xl: "xl:text-[14px] xl:leading-[14px] xl:tracking-normal xl:font-medium",
};

const Descriptor: FC<HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(...Object.values(descriptorStyles), className)}
      {...props}
    >
      {children}
    </span>
  );
};

export default Descriptor;
