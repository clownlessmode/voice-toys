import { cn } from "@/lib/utils";
import React, { FC, ButtonHTMLAttributes } from "react";

const buttonStyles = {
  xs: "text-[16px] leading-[16px] tracking-normal font-semibold",
  sm: "sm:text-[18px] sm:leading-[18px] sm:tracking-normal sm:font-semibold",
  xl: "xl:text-[20px] xl:leading-[20px] xl:tracking-normal xl:font-semibold",
};

const Button1: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "flex flex-row gap-[10px] items-center cursor-pointer hover:scale-[1.05] active:scale-[0.95] transition-all w-full px-[24px] py-[24px] rounded-[20px] bg-primary text-primary-foreground",
        ...Object.values(buttonStyles),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button1;
