import { Suspense } from "react";
import LoadingSkeleton from "./LoadingSkeleton";
import CatalogueContent from "./CatalogueContent";

const Page = () => {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CatalogueContent />
    </Suspense>
  );
};

export default Page;
