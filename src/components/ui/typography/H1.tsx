import { cn } from "@/lib/utils";
import React, { FC, HTMLAttributes } from "react";

const headingStyles = {
  // 375–640px
  xs: "text-[32px] leading-[32px] tracking-normal font-semibold",

  // от 640px и выше (до следующей переопределяющей точки)
  sm: "sm:text-[40px] sm:leading-[40px] sm:tracking-normal sm:font-semibold",

  // от 1536px и выше
  xl:
    "xl:text-[48px] xl:leading-[48px] xl:tracking-normal xl:font-semibold",
};

const H1: FC<HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
}) => {
  return (
    <h1 className={cn(...Object.values(headingStyles), className)}>
      {children}
    </h1>
  );
};

export default H1;

export const H1Blue: FC<HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
}) => {
  return (
    <h1
      className={cn(
        ...Object.values(headingStyles),
        // "[&>span]:text-primary",
        className
      )}
    >
      {children}
    </h1>
  );
};
