import Image from "next/image";
import Button1 from "../ui/typography/Button1";
import H2 from "../ui/typography/H2";
import T1 from "../ui/typography/T1";
import Link from "next/link";

const AlreadyFoundToys = () => {
  return (
    <div className="flex flex-col gap-[24px] rounded-[20px] bg-white overflow-hidden justify-center items-center text-center lg:text-start md:flex-row w-full md:justify-between">
      <div className="flex flex-col gap-[48px] py-[32px] px-[16px] sm:p-[32px] w-full md:w-fit items-center lg:items-start">
        <H2>Уже присмотрели игрушку?</H2>
        <T1 className="max-w-[320px]">
          Переходите в каталог и выбирайте с удовольствием!
        </T1>
        <Link href="/catalogue" className="w-full max-w-[486px]">
          <Button1 className="flex justify-center items-center">
            Перейти в каталог
          </Button1>
        </Link>
      </div>
      <Image
        alt="baby"
        src={`/already-found-toys/bg.png`}
        className="overflow-hidden rounded-t-[20px] sm:rounded-[20px] object-cover aspect-[9/12] sm:aspect-auto md:w-auto h-full max-w-1/2"
        width={1000}
        height={1000}
      />
    </div>
  );
};

export default AlreadyFoundToys;
