'use client';

import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card";
import {Check, DollarSign, Mail, MapPin, PercentIcon, Phone, Plus, Trash2} from "lucide-react";
import React, {useEffect, useState} from "react";
import {Carousel, CarouselApi, CarouselContent, CarouselItem} from "~/components/ui/carousel";
import {NextButton, PrevButton, usePrevNextButtons} from "~/app/(authenticated)/opportunities/[guid]/components/CarouselArrowButtons";
import {DotButton, useDotButton} from "./components/CarouselDotButton";
import {Button} from "~/components/ui/button";
import {Input} from "~/components/ui/input";
import {useAsyncRouter} from "~/util/useRouterRefresh";
import {handleServerAction} from "~/util/api/client/APIClient";
import {addOpportunityProduct, deleteOpportunityProduct, updateOpportunityProduct} from "~/app/(authenticated)/opportunities/[guid]/Actions";
import {OpportunityProductSelector} from "~/app/(authenticated)/opportunities/[guid]/components/OpportunityProductSelector";
import {toast} from "sonner";
import {FormField} from "~/components/form/FormUtils";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog";
import {BoundedNumber, UpdateNumber} from "~/util/input/state";
import {ContactTypeIcon} from "~/common/components/hover-cards/ContactHoverCard";
import {ContactType} from "~/common/enum/enumerations";

export function ContactInformationCard({contacts}: {
    contacts: Array<{
        guid: string,
        name: string,
        type: ContactType,
        email: string | null,
        phone: string | null,
        address: string | null,
        deleted: boolean
    }>
}) {
    const [api, setApi] = useState<CarouselApi>()

    const {selectedIndex, scrollSnaps, onDotButtonClick} =
        useDotButton(api)

    const {
        prevBtnDisabled,
        nextBtnDisabled,
        onPrevButtonClick,
        onNextButtonClick
    } = usePrevNextButtons(api)

    return <Card>
        <CardHeader>
            <CardTitle className={'flex items-center flex-wrap'}>
                Contact Information - <ContactTypeIcon type={contacts[api?.selectedScrollSnap() ?? 0].type} className={'mx-2 h-5 w-5'}/> {contacts[api?.selectedScrollSnap() ?? 0].name}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Carousel setApi={setApi}>
                <CarouselContent>
                    {contacts.map(contact => (
                        <CarouselItem key={contact.guid}>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4"/>
                                    <span>{contact.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4"/>
                                    <span>{contact.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4"/>
                                    <span>{contact.address}</span>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>


                {contacts.length > 1 && <div className={'embla__controls'}>
                    <div className="embla__buttons">
                        <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled}/>
                        <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled}/>
                    </div>

                    <div className="embla__dots">
                        {scrollSnaps.map((_, index) => (
                            <DotButton
                                key={index}
                                onClick={() => onDotButtonClick(index)}
                                className={'embla__dot'.concat(
                                    index === selectedIndex ? ' embla__dot--selected' : ''
                                )}
                            />
                        ))}
                    </div>
                </div>}
            </Carousel>
        </CardContent>
    </Card>
}

type ProductType = {
    guid: string,
    title: string,
    commission: number,
}

export function ProductItem({product}: {
    product: {
        guid: string,
        productType: {
            guid: string,
            title: string,
            commission: number,
        },
        commission: number,
        price: number
    }
}) {
    const [interimProductType, setInterimProductType] = useState<ProductType | null>(product.productType)
    const [interimCommission, setInterimCommission] = useState(product.commission)
    const [interimPrice, setInterimPrice] = useState(product.price)

    const [initialized, setInitialized] = useState(false)

    const router = useAsyncRouter()

    useEffect(() => {
        if (interimProductType == null || !initialized) return
        setInterimCommission(interimProductType.commission ?? 0)
    }, [interimProductType])

    useEffect(() => {
        setInitialized(true)
    }, [])

    return <li className="flex justify-between items-center gap-2 w-full">
        <div className={'grid grid-cols-10 gap-2 w-full items-end'}>
            <div className="col-span-3">
                <OpportunityProductSelector productType={interimProductType} setProductType={setInterimProductType}/>
            </div>
            <FormField grid={false} label={'Price'} htmlFor="price" className="col-span-3">
                <Input
                    name="price"
                    startIcon={DollarSign}
                    value={interimPrice.toLocaleString()}
                    onChange={UpdateNumber(setInterimPrice)}
                />
            </FormField>
            <FormField grid={false} label={'Commission'} htmlFor="commission" className="col-span-3">
                <Input
                    name="commission"
                    type="number"
                    value={interimCommission.toString()}
                    endIcon={PercentIcon}
                    onChange={BoundedNumber(setInterimCommission, 0, 100, 'float')}
                />
            </FormField>
            <div className={'flex space-x-2'}>
                <Button variant="ghost" size="icon" onClick={async () => {
                    const result = handleServerAction(await deleteOpportunityProduct(product.guid))
                    if (result.success) {
                        toast.info('Product deleted')
                        await router.refresh()
                    }
                }}>
                    <Trash2 className="text-destructive h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="icon" onClick={async () => {
                    if (interimProductType == null) {
                        toast.error('Please select a product type')
                        return
                    }
                    const result = handleServerAction(await updateOpportunityProduct(product.guid, {
                        productType: interimProductType.guid,
                        price: interimPrice,
                        commission: interimCommission
                    }))

                    if (result.success) {
                        await router.refresh()
                        toast.success('Product updated')
                    }
                }}>
                    <Check className="h-4 w-4 text-green-500"/>
                </Button>
            </div>
        </div>
    </li>
}

export function AddProductButton({guid}: { guid: string }) {
    const [productType, setProductType] = useState<ProductType | null>(null)
    const [price, setPrice] = useState(0)
    const [commission, setCommission] = useState(0)

    const [open, setOpen] = useState(false)

    const router = useAsyncRouter()

    useEffect(() => {
        if (productType == null) return
        setCommission(productType.commission ?? 0)
    }, [productType])

    useEffect(() => {
        if (!open) {
            setProductType(null)
            setPrice(0)
            setCommission(0)
        }
    }, [open])

    return <div className={'flex justify-end mt-4'}>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="linkHover2" className={'force-border'}>
                    <Plus className="h-4 w-4 mr-2"/> Add Product
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Add Product</DialogTitle>
                </DialogHeader>

                <OpportunityProductSelector productType={productType} setProductType={setProductType} dialog/>
                <FormField grid={false} label={'Price'} htmlFor="price">
                    <Input
                        name="price"
                        startIcon={DollarSign}
                        value={price.toLocaleString()}
                        onChange={UpdateNumber(setPrice)}
                        className="col-span-2"
                    />
                </FormField>
                <FormField grid={false} label={'Commission'} htmlFor="commission">
                    <Input
                        name="commission"
                        type="number"
                        endIcon={PercentIcon}
                        value={commission.toString()}
                        onChange={BoundedNumber(setCommission, 0, 100, 'float')}
                        className="col-span-2"
                    />
                </FormField>

                <DialogFooter className={'mt-4'}>
                    <Button variant="outline" onClick={async () => {
                        if (productType == null) {
                            toast.error('Please select a product type')
                            return
                        }
                        const result = handleServerAction(await addOpportunityProduct(guid, {
                            productType: productType.guid,
                            price,
                            commission
                        }))
                        if (result.success) {
                            setProductType(null)
                            setPrice(0)
                            setCommission(0)
                            await router.refresh()
                            toast.success('Product added')
                            setOpen(false)
                        }
                    }}>
                        Add Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}