import React from "react";
import Logotype from "../ui/icons/Logotype";
import H3 from "../ui/typography/H3";
import Navigation from "../ui/typography/Navigation";
import Link from "next/link";
import H2 from "../ui/typography/H2";
import Descriptor from "../ui/typography/Descriptor";
interface FooterGroupItem {
  title: string;
  items: FooterGroupMenuItem[];
}
interface FooterGroupMenuItem {
  title: string;
  link: string;
}

const main: FooterGroupMenuItem[] = [
  {
    title: "Главная",
    link: "/",
  },
  {
    title: "Каталог",
    link: "/catalogue",
  },
  {
    title: "Ответы на вопросы",
    link: "/faq",
  },
  {
    title: "Доставка и оплата",
    link: "/shipping",
  },
];

const clients: FooterGroupMenuItem[] = [
  {
    title: "Как оформить заказ",
    link: "/how-to-buy",
  },
  {
    title: "Способы оплаты",
    link: "/buy-methods",
  },
  {
    title: "Условия доставки",
    link: "/shipping",
  },
  {
    title: "Возврат и обмен",
    link: "/",
  },
  {
    title: "Пользовательское соглашение",
    link: "https://docs.google.com/viewer?url=https://193bad6b-eacc-4eb6-bd19-72339c2afc74.selstorage.ru/%D0%A1%D0%BE%D0%B3%D0%BB%D0%B0%D1%81%D0%B8%D0%B5_%D0%9F%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F_%D0%BD%D0%B0_%D0%BE%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D1%83_%D0%BF%D0%B5%D1%80%D1%81%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85_%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85.docx&embedded=true",
  },
  {
    title: "Политика конфиденциальности",
    link: "https://docs.google.com/viewer?url=https://193bad6b-eacc-4eb6-bd19-72339c2afc74.selstorage.ru/%D0%9F%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0%D0%B2_%D0%BE%D1%82%D0%BD%D0%BE%D1%88%D0%B5%D0%BD%D0%B8%D0%B8_%D0%BE%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B8,_%D0%B7%D0%B0%D1%89%D0%B8%D1%82%D1%8B,_%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D0%B8_%D0%B8_%D1%81%D0%BE%D0%B1%D0%BB%D1%8E%D0%B4%D0%B5%D0%BD%D0%B8%D1%8F.rtf&embedded=true",
  },
];

const Footer = () => {
  return (
    <div className="w-full flex flex-col md:items-start gap-[64px] bg-white px-[16px] py-[32px] rounded-t-[20px] md:grid md:grid-cols-3 md:p-[64px] lg:flex-col lg:flex lg:w-full">
      <Logotype />
      <div className="flex flex-row flex-wrap col-span-2 gap-[64px] lg:grid lg:grid-cols-3 lg:w-full">
        <FooterGroup title="Меню" items={main} />
        <FooterGroup title="Покупателям" items={clients} />
        <div className="flex flex-col gap-[32px] w-full ">
          <H3>Контакты</H3>
          <div className="flex flex-col gap-[16px]">
            <H2>
              <Link href={"mailto:voicetoys@mail.ru"}>voicetoys@mail.ru</Link>
            </H2>
            <H2>
              <Link href={"tel:+7 (924) 338-23-31"}>+7 (924) 338-23-31</Link>
            </H2>
          </div>
        </div>
        <div className="flex flex-col gap-[16px]">
          {/* <Descriptor>ИНН / ОГРН / Название ИП или ООО</Descriptor> */}
          <Descriptor>© 2025 Voicetoys. Все права защищены.</Descriptor>
        </div>
      </div>
    </div>
  );
};

const FooterGroup = ({ title, items }: FooterGroupItem) => {
  return (
    <div className="flex flex-col gap-[32px] w-fit!">
      <H3>{title}</H3>
      <div className="flex flex-col gap-[16px]">
        {items.map((item, index) => (
          <Link href={item.link} key={index}>
            <Navigation>{item.title}</Navigation>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Footer;
