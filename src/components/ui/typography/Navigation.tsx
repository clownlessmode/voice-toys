// app/components/Navigation.tsx

import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const navStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[16px] leading-[16px] tracking-normal font-semibold",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[18px] sm:leading-[18px] sm:tracking-normal sm:font-semibold",
  // от 1536px и выше
  xl: "xl:text-[18px] xl:leading-[18px] xl:tracking-normal xl:font-semibold",
};

const Navigation: FC<HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <span className={cn(...Object.values(navStyles), className)} {...props}>
      {children}
    </span>
  );
};

export default Navigation;
