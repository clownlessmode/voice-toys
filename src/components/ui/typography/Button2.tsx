// app/components/Button2.tsx

import { cn } from "@/lib/utils";
import React, { FC, ButtonHTMLAttributes } from "react";

const buttonStyles = {
  // до 640px включительно (~375–640px)
  xs: "text-[16px] leading-[16px] tracking-normal font-medium",
  // от 640px и выше (до 1536px)
  sm: "sm:text-[16px] sm:leading-[16px] sm:tracking-normal sm:font-medium",
  // от 1536px и выше
  xl: "xl:text-[18px] xl:leading-[18px] xl:tracking-normal xl:font-medium",
};

const Button2: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "cursor-pointer hover:scale-[1.05] active:scale-[0.95] transition-all w-full px-[16px] py-[12px] rounded-[12px] bg-primary text-primary-foreground",
        ...Object.values(buttonStyles),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button2;
