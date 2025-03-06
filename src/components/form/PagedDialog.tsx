'use client';

import React, {CSSProperties, HTMLAttributes, useEffect, useState} from "react";
import {DialogContent, DialogFooter, DialogHeader} from "~/components/ui/dialog";
import {cn, getChildOfType} from "~/lib/utils";
import {Carousel, CarouselApi, CarouselContent, CarouselItem} from "~/components/ui/carousel";
import {DialogContentProps} from "@radix-ui/react-dialog";

type DialogPageContextType = {
    page: string | null,
    height: CSSProperties['height'],
    setHeight: (height: CSSProperties['height']) => void
}

const DialogPageContext = React.createContext<DialogPageContextType>({
    page: null as string | null,
    height: undefined as CSSProperties['height'],
    setHeight: () => {
        // Do nothing
    }
})

type PagedDialogContentProps = {
    children: React.ReactNode,
    page: string,
    index?: number
    setPage: (page: string) => void
    closer?: boolean
} & DialogContentProps

export function PagedDialogContent({children, className, page, setPage, style, index, ...props}: PagedDialogContentProps) {
    const [api, setApi] = useState<CarouselApi>()
    const [height, setHeight] = useState<CSSProperties['height']>()

    const [header, _children] = getChildOfType(children, DialogHeader)
    let [footer, content] = getChildOfType(_children, PagedDialogFooter)

    if (footer == null) {
        [footer, content] = getChildOfType(_children, DialogFooter)
    }

    const pages = React.Children.toArray(content).map(child => {
        if (React.isValidElement(child) && child.type === DialogPage) {
            return (child.props as { page: string }).page
        }
        return undefined;
    }).filter(page => typeof page === 'string');

    useEffect(() => {
        const selected = pages.indexOf(page)
        if (selected === -1 || api == null) {
            return;
        } else if (selected === api.selectedScrollSnap()) {
            return;
        }
        api?.scrollTo(selected)
    }, [page, pages, api])

    useEffect(() => {
        if (api == null) {
            return;
        }

        api.on('select', () => {
            const page = pages[api.selectedScrollSnap()]
            if (page != null) {
                setPage(page)
            }
        })
    }, [api, pages, setPage])

    return <DialogPageContext.Provider value={{page, height, setHeight}}>
        <DialogContent {...props} index={index} style={{height, ...style}}
                       className={cn('w-full transition-all duration-300 ease-in-out flex flex-col justify-between', className)}>
            {header}

            <div>
                <Carousel setApi={setApi}>
                    {/*<CarouselContent className={'transition-transform duration-500 ease-in-out'}>*/}
                    {/* If anims break, see if replacing with the above line fixes it */}
                    <CarouselContent>
                        {content}
                    </CarouselContent>
                </Carousel>
            </div>

            {footer}
        </DialogContent>
    </DialogPageContext.Provider>
}

PagedDialogContent.displayName = "PagedDialogContent"

const PageContext = React.createContext({
    page: null as string | null
})

export declare type DialogPageProps = {
    children: React.ReactNode,
    page: string,
    height: CSSProperties['height']
    className?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DialogPage({children, page, height, className}: DialogPageProps) {
    const {height: dialogHeight, setHeight, page: dialogPage} = React.useContext(DialogPageContext)

    useEffect(() => {
        if (setHeight != null && height != null && dialogPage === page) {
            setHeight(height)
        }
    }, [dialogHeight, dialogPage, height, page, setHeight])

    return <PageContext.Provider value={{page}}>
        <CarouselItem className={className}>
            {children}
        </CarouselItem>
    </PageContext.Provider>
}

DialogPage.displayName = "DialogPage"

export function RenderOnPage({children}: { children: React.ReactNode }) {
    const {page} = React.useContext(PageContext)
    const {page: dialogPage} = React.useContext(DialogPageContext)

    if (page === dialogPage) {
        return children;
    }
}

RenderOnPage.displayName = "RenderOnPage"

export function PagedDialogFooter({className, ...props}: HTMLAttributes<HTMLDivElement>) {
    return <DialogFooter className={cn("flex-col sm:flex-row items-stretch sm:items-center gap-2 h-min", className)} {...props}/>
}

PagedDialogFooter.displayName = "PagedDialogFooter"