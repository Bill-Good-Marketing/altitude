import Image from "next/image";
import {NavItem} from "~/common/components/NavItem";
import {BellIcon, SearchIcon, UserCircle} from "lucide-react";
import {MobileNav} from "~/common/components/MobileNav";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "~/components/ui/dropdown-menu";
import {DropdownMenuItem} from "@radix-ui/react-dropdown-menu";
import React from "react";
import {getJWTToken, validateJWT} from "~/util/auth/AuthUtils";
import {TOKEN_VERSION} from "~/app/api/auth/[...nextauth]/route";
import {redirect} from "next/navigation";
import {Button} from "~/components/ui/button";
import {DarkModeButton} from "~/app/(authenticated)/DarkModeButton";
import {cookies} from "next/headers";
import {Pathfinder} from "~/app/(authenticated)/pathfinder/Pathfinder";
import {AIContextProvider} from "~/app/(authenticated)/pathfinder/AIContext";
import {SignOutButton} from "~/app/(authenticated)/LayoutClient";
import { PersistenceProvider } from "~/hooks/use-persisted";

const navDefinition = [
    {
        link: '/',
        label: 'Dashboard',
    }, {
        link: '/contacts',
        label: 'Contacts',
    }, {
        link: '/activities',
        label: 'Activities',
    }, {
        link: '/calendar',
        label: 'Calendar',
    }, {
        label: 'Personal Service',
        link: '/personal-service',
    }, {
        label: 'Sales Pipeline',
        link: '/opportunities',
    }, {
        label: 'Marketing',
        link: '/marketing',
    }, {
        label: 'Document Manager',
        link: '/document-manager',
    }, {
        label: 'Settings',
        link: '/settings',
    }
]

function Nav({darkMode}: { darkMode: boolean }) {
    return <nav className="bg-background shadow">
        <div className="mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex h-16 justify-between">
                <div className="flex px-2 lg:px-0">
                    <div className="flex flex-shrink-0 items-center">
                        <Image
                            alt="Bill GOod Marketing"
                            src="/img/BGM-logo.webp"
                            className="h-8 w-auto"
                            width={473}
                            height={156}
                        />
                    </div>
                    <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
                        {navDefinition.map((item, index) => {
                            if ('divider' in item) {
                                return null;
                                // return <div key={index} className="border-l my-5 border-gray-400"/>
                            }
                            return <NavItem key={index} path={item.link} title={item.label}/>
                        })}
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center px-2 lg:ml-6 lg:justify-end">
                    <div className="w-full max-w-lg lg:max-w-xs">
                        <label htmlFor="search" className="sr-only">
                            Search
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <SearchIcon aria-hidden="true" className="h-5 w-5 text-gray-400"/>
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
                <div className="flex items-center lg:hidden">
                    {/* Mobile menu button */}
                    <MobileNav definition={navDefinition}/>
                </div>
                <div className="hidden lg:ml-4 lg:flex lg:items-center">
                    <DarkModeButton darkMode={darkMode}/>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        type="button"
                        className={'mr-2'}
                    >
                        <BellIcon aria-hidden="true" className="h-5 w-5"/>
                    </Button>

                    {/* Profile dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className="relative flex rounded-full bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            asChild>
                            <Button variant={'ghost'} size={'icon'} className={'hover:bg-transparent'}>
                                <UserCircle className="h-5 w-5"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>
                                <a href="#"
                                   className="block px-4 py-2 text-sm text-gray-700 dark:text-white data-[focus]:bg-gray-100 dark:bg-zinc-950">
                                    Your Profile
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <a href="#"
                                   className="block px-4 py-2 text-sm text-gray-700 dark:text-white data-[focus]:bg-gray-100 dark:bg-zinc-950">
                                    Settings
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <SignOutButton/>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        {/*<MenuItems*/}
                        {/*    transition*/}
                        {/*    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-background py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"*/}
                        {/*>*/}
                        {/*    <MenuItem>*/}
                        {/*        <a href="#"*/}
                        {/*           className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100">*/}
                        {/*            Your Profile*/}
                        {/*        </a>*/}
                        {/*    </MenuItem>*/}
                        {/*    <MenuItem>*/}
                        {/*        <a href="#"*/}
                        {/*           className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100">*/}
                        {/*            Settings*/}
                        {/*        </a>*/}
                        {/*    </MenuItem>*/}
                        {/*    <MenuItem>*/}
                        {/*        <a href="#"*/}
                        {/*           className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100">*/}
                        {/*            Sign out*/}
                        {/*        </a>*/}
                        {/*    </MenuItem>*/}
                        {/*</MenuItems>*/}
                    </DropdownMenu>
                </div>
            </div>
        </div>
    </nav>
}

export default async function AuthenticatedLayout({children}: { children: React.ReactNode }) {
    const auth = await getJWTToken();

    if (auth == null) {
        return redirect('/login');
    }

    const validateToken = validateJWT(auth);

    if (!validateToken) {
        return redirect('/login');
    }

    if (auth.invalidated || auth.version !== TOKEN_VERSION) {
        return redirect('/login');
    }

    const _cookies = await cookies();

    return <>
        <Nav darkMode={_cookies.get('theme')?.value === 'dark'}/>
        <AIContextProvider>
            <PersistenceProvider>
                <main>
                    {children}
                </main>
            </PersistenceProvider>
            <Pathfinder/>
        </AIContextProvider>
    </>
}