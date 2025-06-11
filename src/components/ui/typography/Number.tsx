import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const numberStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[40px] leading-[48px] tracking-normal font-semibold",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[48px] sm:leading-[48px] sm:tracking-normal sm:font-semibold",
  // от 1536px и выше
  xl: "xl:text-[64px] xl:leading-[64px] xl:tracking-normal xl:font-semibold",
};

const Number: FC<HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
}) => {
  return (
    <span className={cn(className, ...Object.values(numberStyles))}>
      {children}
    </span>
  );
};

export default Number;
