import { Suspense } from "react";
import AlreadyFoundToys from "@/components/widgets/AlreadyFoundToys";
import CategoriesTypes from "@/components/widgets/CategoriesTypes";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import Hero from "@/components/widgets/Hero";
import HitSales from "@/components/widgets/HitSales";
import SelectYourCategory from "@/components/widgets/SelectYourCategory";
import VoiceToysInNumbers from "@/components/widgets/VoiceToysInNumbers";
import { cn } from "@/lib/utils";

const HomeContent = () => {
  return (
    <main
      className={cn(
        "px-[10px] gap-[40px]",
        "xl:px-[50px] xl:gap-[50px]",
        "2xl:px-[100px] 2xl:gap-[60px]",
        "flex flex-col items-center justify-start min-h-screen bg-body-background"
      )}
    >
      <Header />
      <Hero />
      <HitSales />
      <SelectYourCategory />
      <CategoriesTypes />
      <VoiceToysInNumbers />
      <AlreadyFoundToys />
      <Footer />
    </main>
  );
};

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
