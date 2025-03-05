import {FormField} from "~/components/form/FormUtils";
import React from "react";
import {Picker} from "~/components/data/Picker";
import {createProductType} from "~/app/(authenticated)/settings/products/Actions";
import {handleServerAction} from "~/util/api/client/APIClient";
import {toast} from "sonner";
import {Input} from "~/components/ui/input";
import {Textarea} from "~/components/ui/textarea";
import {PercentIcon} from "lucide-react";
import {getReducedProductTypes} from "~/app/(authenticated)/opportunities/[guid]/Actions";
import {BoundedNumber} from "~/util/input/state";

export function OpportunityProductSelector({productType, setProductType, dialog}: {
    productType: {
        guid: string,
        title: string,
        commission: number,
    } | null,
    setProductType: (productType: {
        guid: string,
        title: string,
        commission: number,
    } | null) => void,
    dialog?: boolean
}) {
    const [newProductTitle, setNewProductTitle] = React.useState('')
    const [newProductDescription, setNewProductDescription] = React.useState('')
    const [newProductCommission, setNewProductCommission] = React.useState(0)

    return <FormField grid={false} label="Product Type" htmlFor="productType">
        <Picker
            dialog={dialog}
            value={productType}
            onValueChange={setProductType}
            trigger={{
                placeholder: "Select product type",
                nameKey: "title",
            }}
            searchPlaceholder={'Search for products...'}
            title={'Select product type'}
            pickerKey={'productType'}
            dataTypeName={'product'}
            datatable={{
                idKey: 'guid',
                columns: [
                    {
                        title: 'Title',
                        key: 'title',
                        render: (row) => row.title,
                        sortable: true
                    }
                ]
            }}
            search={async (search, page, perPage, sortBy) => {
                const result = handleServerAction(await getReducedProductTypes(search, page, perPage, sortBy))
                if (!result.success) {
                    throw new Error(`Error loading products: ${result.message}`)
                }
                return result.result!
            }}
            useAdder
            adderTitle={'Add Product'}
            adderHeight={175}
            adder={<div className={'space-y-4'}>
                <FormField grid={false} label={'Title'} htmlFor="title">
                    <Input
                        name="title"
                        value={newProductTitle}
                        onChange={(e) => setNewProductTitle(e.target.value)}
                    />
                </FormField>
                <FormField grid={false} label={'Description'} htmlFor="description">
                    <Textarea
                        name="description"
                        value={newProductDescription ?? ''}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                    />
                </FormField>
                <FormField grid={false} label={'Commission'} htmlFor="commission">
                    <Input
                        endIcon={PercentIcon}
                        name="commission"
                        type="number"
                        value={newProductCommission.toString()}
                        onChange={BoundedNumber(setNewProductCommission, 0, 100, 'float')}
                    />
                </FormField>
            </div>}
            add={async () => {
                const result = handleServerAction(await createProductType({
                    guid: '_new',
                    title: newProductTitle,
                    description: newProductDescription,
                    commission: newProductCommission
                }))

                if (result.success) {
                    setNewProductTitle('')
                    setNewProductCommission(0)
                    setNewProductDescription('')
                    toast.success('Product created')
                    setProductType({
                        guid: result.result!,
                        title: newProductTitle,
                        commission: newProductCommission
                    })
                }
            }}
            cancelAdd={() => {
                setNewProductTitle('')
                setNewProductCommission(0)
                setNewProductDescription('')
            }}
        />
    </FormField>
}