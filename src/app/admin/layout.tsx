"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, Plus, BarChart3, Settings, ShoppingBag } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Обзор",
      href: "/admin",
      icon: BarChart3,
    },
    {
      name: "Заказы",
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      name: "Продукты",
      href: "/admin/products",
      icon: Package,
    },
    {
      name: "Промокоды",
      href: "/admin/promo-codes",
      icon: Package,
    },
    {
      name: "Добавить продукт",
      href: "/admin/products/new",
      icon: Plus,
    },
    {
      name: "Настройки",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="relative w-full bg-white shadow-lg md:fixed md:inset-y-0 md:left-0 md:z-50 md:w-64">
        <div className="flex h-16 items-center px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Voice Toys Admin</h1>
        </div>
        <nav className="px-3 py-3 md:mt-6 md:py-0">
          <ul className="grid grid-cols-2 gap-1 md:block md:space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 shrink-0 transition-colors",
                        isActive
                          ? "text-white"
                          : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
