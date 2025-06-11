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
    link: "/",
  },
  {
    title: "Политика конфиденциальности",
    link: "/",
  },
];

const Footer = () => {
  return (
    <div className="w-full flex flex-col md:items-start gap-[64px] bg-white px-[16px] py-[32px] rounded-t-[20px] md:grid md:grid-cols-3 md:p-[64px] lg:flex-col lg:flex lg:w-full">
      <Logotype />
      <div className="flex flex-row flex-wrap col-span-2 gap-[64px] lg:grid lg:grid-cols-2 lg:w-full">
        <FooterGroup title="Меню" items={main} />
        <FooterGroup title="Покупателям" items={clients} />
        <div className="flex flex-col gap-[32px] w-full ">
          <H3>Контакты</H3>
          <div className="flex flex-col gap-[16px]">
            <H2>info@voicetoys.ru</H2>
            <H2>+7 (000) 000-00-00</H2>
          </div>
        </div>
        <div className="flex flex-col gap-[16px]">
          <Descriptor>ИНН / ОГРН / Название ИП или ООО</Descriptor>
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
