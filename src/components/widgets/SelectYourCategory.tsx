import React from "react";
import H2 from "../ui/typography/H2";
import { categories, CategoryCard } from "../entities/category";

const SelectYourCategory = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <H2>Выберите подходящую категорию</H2>
      <div className="grid grid-cols-2 gap-[16px] lg:flex lg:flex-row lg:max-h-[400px] 2xl:max-h-[600px]">
        {categories.map((item, index) => (
          <CategoryCard
            key={index}
            age={item.age}
            image={item.image}
            link={item.link}
            color={item.color}
            badges={item.badges}
          />
        ))}
      </div>
    </div>
  );
};

export default SelectYourCategory;
