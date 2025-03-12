"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { MenuIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type MobileNavItem = {
  link: string;
  label: string;
  icon?: React.ReactNode;
};

type MobileNavProps = {
  definition: Array<MobileNavItem | { divider: true }>;
};

export function MobileNav({ definition }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const router = useRouter();

  const handleNavClick = async (link: string) => {
    setLoadingLink(link);
    // Simulate an asynchronous operation (e.g., data fetching, auth, etc.)
    await new Promise((resolve) => setTimeout(resolve, 500));
    setOpen(false);
    setLoadingLink(null);
    router.push(link);
  };

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger>
        <span className="sr-only">Open main menu</span>
        <MenuIcon aria-hidden="true" className="block h-6 w-6" />
      </SheetTrigger>
      <SheetContent
        side="top"
        className="bg-white/90 backdrop-blur-md p-4 z-50"
      >
        {definition.map((item, index) => {
          if ("divider" in item) {
            return (
              <hr key={index} className="my-2 border-t border-gray-200" />
            );
          }
          return (
            <button
              key={index}
              onClick={() => handleNavClick(item.link)}
              className="w-full flex items-center justify-between py-2 text-lg text-gray-700 hover:text-blue-500 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              {loadingLink === item.link && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </button>
          );
        })}
      </SheetContent>
    </Sheet>
  );
}
