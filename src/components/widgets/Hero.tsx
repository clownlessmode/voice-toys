import { cn } from "@/lib/utils";
import Button1 from "../ui/typography/Button1";
import H1 from "../ui/typography/H1";
import T1 from "../ui/typography/T1";
import Link from "next/link";

const Hero = () => {
  return (
    <div
      className={cn(
        "p-[24px] rounded-[20px] gap-[96px]",
        "sm:p-[48px] sm:gap-[128px]",
        "w-full bg-cover bg-center lg:bg-right",
        "bg-background w-full flex flex-col items-center min-h-[80vh] lg:min-h-[600px] justify-between",
        "bg-[url('/hero/mobile-bg.png')]",
        "lg:bg-[url('/hero/bg.png')]",
        "lg:items-start "
      )}
    >
      <div
        className={cn(
          "gap-[24px] max-w-[560px] sm:max-w-[640px] md:max-w-[760px]",
          "flex flex-col items-center lg:items-start"
        )}
      >
        <H1 className="text-center lg:text-left">
          Развивающие игрушки,
          <br />в которые влюбляются дети
        </H1>
        <T1 className="text-center  lg:text-left sm:px-[10px] max-w-[500px] sm:max-w-[605px] xl:max-w-[850px]">
          Яркие, безопасные и говорящие игрушки для детей от 6 месяцев до 10
          лет. Более 500 000 заказов, доверие родителей по всей России.
        </T1>
      </div>
      <Link
        href={"/catalogue"}
        className="w-full flex justify-center lg:justify-start"
      >
        <Button1 className="max-w-[560px] justify-center w-full!">
          Перейти в каталог
        </Button1>
      </Link>
    </div>
  );
};

export default Hero;
