import { cn } from "@/lib/utils";

const LoadingSkeleton = () => (
  <main
    className={cn(
      "px-[10px] gap-[80px]",
      "xl:px-[50px] xl:gap-[100px]",
      "2xl:px-[100px] 2xl:gap-[150px]",
      "flex flex-col items-center justify-start min-h-screen bg-body-background"
    )}
  >
    {/* Header Skeleton */}
    <div className="w-full h-16 bg-gray-200 animate-pulse rounded-b-[20px]" />

    <div className="flex flex-col gap-[24px] w-full">
      <div className="flex flex-col gap-[32px] w-full">
        <div className="flex flex-col gap-[16px]">
          {/* Breadcrumbs Skeleton */}
          <div className="h-4 bg-gray-200 animate-pulse rounded w-48" />

          {/* Title and Counter Skeleton */}
          <div className="flex flex-row gap-[16px] items-end">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-32" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-24" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-[16px] w-full">
          <div className="h-8 bg-gray-200 animate-pulse rounded-full w-32" />
          <div className="flex flex-row flex-wrap gap-[12px] w-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-8 bg-gray-200 animate-pulse rounded-full w-20"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-2 gap-[10px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 animate-pulse rounded-lg"
          />
        ))}
      </div>
    </div>

    {/* Footer Skeleton */}
    <div className="w-full h-32 bg-gray-200 animate-pulse rounded" />
  </main>
);

export default LoadingSkeleton;
