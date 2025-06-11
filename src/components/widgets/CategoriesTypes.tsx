import { TypeCard, types } from "../entities/type";

const CategoriesTypes = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] md:gap-4">
      {types.map((item, index) => (
        <TypeCard key={index} {...item} />
      ))}
    </div>
  );
};

export default CategoriesTypes;
