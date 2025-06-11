import H2 from "../ui/typography/H2";
import Number from "../ui/typography/Number";
import T2 from "../ui/typography/T2";

const CardsXS = () => {
  return (
    <div className="flex flex-col w-full gap-[10px] sm:hidden">
      <H2 className={"mb-[24px]"}>VoiceToys в цифрах</H2>
      <div className="bg-[#D2F267] w-full rounded-[20px] p-[32px] h-[264px]">
        <Number>540 288</Number>
        <T2>товаров продано</T2>
      </div>
      <div className=" bg-[#D8B4F8] w-full rounded-[20px] p-[32px] h-[264px]">
        <Number>87 279</Number>
        <T2>отзывов</T2>
      </div>
      <div className="bg-[#A1E7F8] w-full rounded-[20px] p-[32px] h-[194px]">
        <Number>3</Number>
        <T2>года на рынке</T2>
      </div>
      <div className="bg-[#FFA7C0]  w-full rounded-[20px] p-[32px] h-[194px]">
        <Number>4.85</Number>
        <T2>средняя оценка покупателей</T2>
      </div>
      <div className="bg-[#FFF07C] w-full rounded-[20px] p-[32px] h-[380px]">
        <Number>Voicetoys — это больше, чем просто игрушки</Number>
        <T2 className="mt-[24px]">
          Уже 3 года мы создаём игрушки, которые говорят, обучают и радуют.
          Родители по всей России доверили нам более 500 000 заказов.
        </T2>
      </div>
    </div>
  );
};

const CardsSM = () => {
  return (
    <div className="hidden flex-row w-full gap-[10px] sm:flex md:hidden flex-wrap">
      <div className="flex flex-col justify-between w-[calc(50%-5px)]">
        <H2 className="mb-[76px]">VoiceToys в цифрах</H2>
        <div className="bg-[#D2F267] w-full rounded-[20px] p-[32px] h-[264px]">
          <Number>540 288</Number>
          <T2>товаров продано</T2>
        </div>
      </div>
      <div className=" bg-[#D8B4F8]  rounded-[20px] p-[32px] h-[364px] w-[calc(50%-5px)]">
        <Number>87 279</Number>
        <T2>отзывов</T2>
      </div>
      <div className="bg-[#A1E7F8] w-[calc(50%-5px)] rounded-[20px] p-[32px] h-[214px]">
        <Number>3</Number>
        <T2>года на рынке</T2>
      </div>
      <div className="bg-[#FFA7C0]  w-[calc(50%-5px)] rounded-[20px] p-[32px] h-[214px]">
        <Number>4.85</Number>
        <T2>средняя оценка покупателей</T2>
      </div>
      <div className="bg-[#FFF07C] w-full rounded-[20px] p-[32px] h-[364px]">
        <Number>Voicetoys — это больше, чем просто игрушки</Number>
        <T2 className="mt-[24px]">
          Уже 3 года мы создаём игрушки, которые говорят, обучают и радуют.
          Родители по всей России доверили нам более 500 000 заказов.
        </T2>
      </div>
    </div>
  );
};

const CardsMD = () => {
  return (
    <div className="hidden flex-row w-full gap-[10px] md:grid grid-cols-5 lg:hidden">
      <div className="flex flex-col justify-between w-full col-span-2">
        <H2 className="mb-[273px]">VoiceToys в цифрах</H2>
        <div className="bg-[#D2F267] w-full rounded-[20px] p-[32px] h-[415px]">
          <Number>540 288</Number>
          <T2>товаров продано</T2>
        </div>
      </div>
      <div className=" bg-[#D8B4F8] col-span-2  rounded-[20px] p-[32px] h-full w-full">
        <Number>87 279</Number>
        <T2>отзывов</T2>
      </div>
      <div className="flex flex-col gap-[10px]">
        <div className="bg-[#A1E7F8] rounded-[20px] p-[32px] h-full">
          <Number>3</Number>
          <T2>года на рынке</T2>
        </div>
        <div className="bg-[#FFA7C0] rounded-[20px] p-[32px] h-full">
          <Number>4.85</Number>
          <T2>средняя оценка покупателей</T2>
        </div>
      </div>
      <div className="bg-[#FFF07C] col-span-5 w-full rounded-[20px] p-[32px] h-[720px]">
        <Number className=" max-w-[600px]! block">
          Voicetoys — это больше, чем просто игрушки
        </Number>
        <T2 className="mt-[24px] max-w-[600px]!">
          Уже 3 года мы создаём игрушки, которые говорят, обучают и радуют.
          Родители по всей России доверили нам более 500 000 заказов.
        </T2>
      </div>
    </div>
  );
};

const CardsLG = () => {
  return (
    <div className="hidden flex-col w-full gap-[10px] md:hidden lg:flex">
      <div className="flex flex-row gap-[10px] w-full">
        <div className="flex flex-col justify-between w-full">
          <H2 className="mb-[273px]">VoiceToys в цифрах</H2>
          <div className="bg-[#D2F267] w-full rounded-[20px] p-[32px] h-[415px]">
            <Number>540 288</Number>
            <T2>товаров продано</T2>
          </div>
        </div>
        <div className=" bg-[#D8B4F8] col-span-2  rounded-[20px] p-[32px] h-[712px] w-full">
          <Number>87 279</Number>
          <T2>отзывов</T2>
        </div>
      </div>
      <div className="flex flex-row gap-[10px]">
        <div className="flex flex-col gap-[10px]">
          <div className="bg-[#A1E7F8] rounded-[20px] p-[32px] h-full">
            <Number>3</Number>
            <T2>года на рынке</T2>
          </div>
          <div className="bg-[#FFA7C0] rounded-[20px] p-[32px] h-full">
            <Number>4.85</Number>
            <T2>средняя оценка покупателей</T2>
          </div>
        </div>
        <div className="bg-[#FFF07C] col-span-5 w-full rounded-[20px] p-[32px] h-[720px]">
          <Number className=" max-w-[600px]! block">
            Voicetoys — это больше, чем просто игрушки
          </Number>
          <T2 className="mt-[24px] max-w-[600px]!">
            Уже 3 года мы создаём игрушки, которые говорят, обучают и радуют.
            Родители по всей России доверили нам более 500 000 заказов.
          </T2>
        </div>
      </div>
    </div>
  );
};

const VoiceToysInNumbers = () => {
  return (
    <>
      <CardsXS />
      <CardsSM />
      <CardsMD />
      <CardsLG />
    </>
  );
};

export default VoiceToysInNumbers;
