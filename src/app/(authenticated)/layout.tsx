import Image from "next/image";
import { NavItem } from "~/components/NavItem";
import { BellIcon, SearchIcon, UserCircle, Home, Users, Activity, Calendar, UserPlus, DollarSign, Mail, FileText, Settings } from "lucide-react";
import { MobileNav } from "~/components/MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import React from "react";
import { getJWTToken, validateJWT } from "~/util/auth/AuthUtils";
import { TOKEN_VERSION } from "~/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme-toggle";
import { cookies } from "next/headers";
import { Pathfinder } from "~/app/(authenticated)/pathfinder/Pathfinder";
import { AIContextProvider } from "~/app/(authenticated)/pathfinder/AIContext";
import { SignOutButton } from "~/app/(authenticated)/LayoutClient";
import { PersistenceProvider } from "~/hooks/use-persisted";

// Navigation definition with responsive breakpoints
const navDefinition = [
    { link: "/", label: "Dashboard", icon: <Home className="h-4 w-4" />, responsive: "block" },
    { link: "/contacts", label: "Contacts", icon: <Users className="h-4 w-4" />, responsive: "hidden sm:block" },
    { link: "/activities", label: "Activities", icon: <Activity className="h-4 w-4" />, responsive: "hidden md:block" },
    { link: "/calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" />, responsive: "hidden lg:block" },
    { link: "/personal-service", label: "Personal Service", icon: <UserPlus className="h-4 w-4" />, responsive: "hidden xl:block" },
    { link: "/opportunities", label: "Sales Pipeline", icon: <DollarSign className="h-4 w-4" />, responsive: "hidden xl:block" },
    { link: "/marketing", label: "Marketing", icon: <Mail className="h-4 w-4" />, responsive: "hidden xl:block" },
    { link: "/document-manager", label: "Document Manager", icon: <FileText className="h-4 w-4" />, responsive: "hidden xl:block" },
    { link: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" />, responsive: "hidden xl:block" },
  ];

function Nav({ darkMode }: { darkMode: boolean }) {
  return (
    <nav className="glass-navbar shadow">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main header container with three sections */}
        <div className="flex h-16 items-center justify-between">
          {/* Left Section – Logo */}
          <div className="flex-shrink-0">
            <Image
              alt="Bill GOod Marketing"
              src="/img/BGM-logo.webp"
              className="h-8 w-auto"
              width={473}
              height={156}
            />
          </div>
          {/* Center Section – Navigation Items */}
          <div className="hidden lg:flex items-center justify-center space-x-4">
            {navDefinition.map((item, index) => (
              <div
                key={index}
                className={`${item.responsive} px-3 py-2 rounded-md backdrop-blur-sm hover:bg-white/10 transition-colors`}
              >
                <NavItem path={item.link} title={item.label} />
              </div>
            ))}
          </div>
          {/* Right Section – Search and Profile/Utilities */}
          <div className="flex flex-1 items-center justify-end">
            {/* Search Input */}
            <div className="hidden sm:flex items-center justify-center px-2">
              <div className="w-full max-w-lg lg:max-w-xs">
                <label htmlFor="search" className="sr-only">
                  Search
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon
                      aria-hidden="true"
                      className="h-5 w-5 text-gray-400"
                    />
                  </div>
                  <input
                    name="search"
                    type="search"
                    placeholder="Search"
                    className="block w-full rounded-md border-0 bg-background py-1.5 pl-10 pr-3 text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>
            {/* Utilities – Mobile Nav and Desktop Profile/Theme */}
            <div className="flex items-center space-x-4">
              {/* Mobile Navigation for small screens */}
              <div className="lg:hidden">
                <div className="px-3 py-2 rounded-md backdrop-blur-sm">
                  <MobileNav definition={navDefinition} />
                </div>
              </div>
              {/* Desktop Profile & Utilities */}
              <div className="hidden lg:flex items-center space-x-2">
                <ThemeToggle />
                <Button variant="ghost" size="icon" type="button">
                  <BellIcon aria-hidden="true" className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="relative flex items-center rounded-full bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    asChild
                  >
                    <Button variant="ghost" size="icon" className="hover:bg-transparent">
                      <UserCircle className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-950"
                      >
                        Your Profile
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-950"
                      >
                        Settings
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <SignOutButton />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getJWTToken();
  if (auth == null) return redirect("/login");

  const validateToken = validateJWT(auth);
  if (!validateToken) return redirect("/login");
  if (auth.invalidated || auth.version !== TOKEN_VERSION) return redirect("/login");

  const _cookies = await cookies();

  return (
    <>
      <Nav darkMode={_cookies.get("theme")?.value === "dark"} />
      <AIContextProvider>
        <PersistenceProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 transition-colors duration-500">
            {/* Advanced glassmorphism background elements */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
              <div className="floating-orb absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-300/40 dark:bg-blue-700/20"></div>
              <div className="floating-orb absolute top-60 -right-40 h-96 w-96 rounded-full bg-indigo-300/40 dark:bg-indigo-700/20"></div>
              <div className="floating-orb absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-purple-300/40 dark:bg-purple-700/20"></div>
              <div className="floating-orb absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-sky-300/30 dark:bg-sky-700/10"></div>
              <div className="floating-orb absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-pink-200/30 dark:bg-pink-700/10"></div>
              <div className="floating-orb absolute bottom-1/3 right-1/3 h-56 w-56 rounded-full bg-yellow-200/20 dark:bg-yellow-700/10"></div>
            </div>
            <div className="relative">
              <main>{children}</main>
            </div>
          </div>
        </PersistenceProvider>
        <Pathfinder />
      </AIContextProvider>
      {/* React-scan indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-mono glass-card">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        react-scan
      </div>
    </>
  );
}
