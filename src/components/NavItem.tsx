"use client";

import { usePathname } from "next/navigation";
import React, { ReactNode } from "react";

type NavItemProps = {
  path: string;
  title: string;
  icon?: ReactNode;
};

export function NavItem({ path, title, icon }: NavItemProps) {
  const currentPath = usePathname();
  const active = currentPath === path || currentPath.startsWith(path + "/");

  const baseClasses =
    "flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-md transition-colors";
  const activeClasses =
    "bg-white/20 text-blue-400 dark:text-indigo-300";
  const inactiveClasses =
    "text-gray-400 dark:text-gray-300";

  return (
    <a
      href={path}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      {icon && <span>{icon}</span>}
      <span>{title}</span>
    </a>
  );
}
