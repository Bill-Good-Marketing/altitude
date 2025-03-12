'use client';
import React, {useState} from "react";
import {DataTable, ErroredDataTable, NoDataTable, Sort} from "~/components/data/DataTable";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {handleServerAction} from "~/util/api/client/APIClient";
import {createProductType, getProductTypes, updateProductType as server_updateProduct} from "~/app/(authenticated)/settings/products/Actions";
import {Input} from "~/components/ui/input";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";
import {Textarea} from "~/components/ui/textarea";
import {PercentIcon, Plus} from "lucide-react";
import {Button} from "~/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "~/components/ui/dialog";
import {FormField} from "~/components/form/FormUtils";
import {clamp} from "~/util/math/clamp";
import {toast} from "sonner";

export declare type ClientProductType = {
    guid: string,
    title: string,
    description: string | null,
    commission: number,
}

export function ProductList({products: initialProducts, count: initialCount}: {
    products: ClientProductType[],
    count: number
}) {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(25)
    const [sort, setSort] = useState<Sort<ClientProductType>>({title: 'asc'})
    const [search, setSearch] = useState('')
    const [interimSearch, setInterimSearch] = useState('')

    const [creating, setCreating] = useState(false)

    const [newProduct, setNewProduct] = useState<ClientProductType>({
        guid: '_new',
        title: '',
        description: '',
        commission: 0,
    })

    const {data, isLoading, isError, error} = useQuery({
        queryKey: ['products', page, perPage, sort, search],
        queryFn: async () => {
            const result = handleServerAction(await getProductTypes(search, page, perPage, sort))
            if (!result.success) {
                throw new Error(result.message)
            }

            return result.result
        },
        initialData: [initialProducts, initialCount],
    })

    let table: React.ReactNode;

    const queryClient = useQueryClient()

    const [clientSideProducts, setClientSideProducts] = useState<Record<string, {
        title: string,
        commission: number,
        description: string | null,
    }>>({})

    const handleProductChange = (guid: string, key: 'title' | 'description' | 'commission', value: string) => {
        let _value: string | number = value

        if (key === 'commission') {
            _value = parseFloat(value)
            if (isNaN(_value)) {
                return
            }
            _value = clamp(_value, 0, 100)
        }

        setClientSideProducts(prev => ({
            ...prev, [guid]: {
                title: prev[guid].title,
                commission: prev[guid].commission,
                description: prev[guid].description,
                [key]: _value
            }
        }))
    }

    const updateProduct = async (guid: string, key: 'title' | 'description' | 'commission', value: string | number) => {
        const result = handleServerAction(await server_updateProduct(guid, key, value));

        if (result.success) {
            await queryClient.invalidateQueries({
                queryKey: ['products']
            })
            setClientSideProducts({});
        }
    }

    const [products, count] = data as [ClientProductType[], number]

    if (isLoading) {
        table = <LoadingDataTable
            columns={['Name', 'Description', 'Commission']}
            fakeRowCount={perPage}
            pageable={true}
            height={'70vh'}
        />
    } else if (isError || data == null) {
        table = <ErroredDataTable
            columns={['Name', 'Description', 'Commission']}
            message={(error as Error)?.message ?? 'Error loading products'}
        />
    } else if (data.length === 0) {
        table = <NoDataTable
            columns={['Name', 'Description', 'Commission']}
            dataTypeName={'product'}
            clearSearch={() => {
                setSearch('')
                setInterimSearch('')
                setPage(1)
                setPerPage(25)
                setSort({title: 'asc'})
            }}
        />
    } else {
        table = <DataTable
            height={'70vh'}
            data={products}
            count={count}
            idKey={'guid'}
            setSortBy={setSort}
            sortBy={sort}
            pageable={true}
            page={page}
            perPage={perPage}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            columns={[{
                title: 'Name',
                key: 'title',
                render: (row: ClientProductType) => <Input
                    type="text"
                    value={clientSideProducts[row.guid]?.title ?? row.title}
                    onChange={(e) => handleProductChange(row.guid, 'title', e.target.value)}
                    onBlur={async (event) => {
                        await updateProduct(row.guid, 'title', event.target.value)
                    }}
                    onKeyDown={async (event) => {
                        if (event.key === 'Enter') {
                            await updateProduct(row.guid, 'title', (event.target as HTMLInputElement).value)
                        }
                    }}
                />,
                sortable: true
            }, {
                title: 'Description',
                key: 'description',
                render: (row: ClientProductType) => <Input
                    type="text"
                    value={clientSideProducts[row.guid]?.description ?? row.description ?? ''}
                    onChange={(e) => handleProductChange(row.guid, 'description', e.target.value)}
                    onBlur={async (event) => {
                        const val = event.target.value
                        if (val.trim() === row.description) return;
                        await updateProduct(row.guid, 'description', event.target.value)
                    }}
                    onKeyDown={async (event) => {
                        if (event.key === 'Enter') {
                            const val = (event.target as HTMLInputElement).value
                            if (val.trim() === row.description) return;
                            await updateProduct(row.guid, 'description', val)
                        }
                    }}
                />,
            }, {
                title: 'Commission',
                key: 'commission',
                render: (row: ClientProductType) => <Input
                    endIcon={PercentIcon}
                    type="number"
                    value={clientSideProducts[row.guid]?.commission ?? row.commission}
                    onChange={(e) => handleProductChange(row.guid, 'commission', e.target.value)}
                    onBlur={async (event) => {
                        const val = parseFloat(event.target.value)
                        if (isNaN(val) || val === row.commission) return;
                        await updateProduct(row.guid, 'commission', val)
                    }}
                    onKeyDown={async (event) => {
                        if (event.key === 'Enter') {
                            const val = parseFloat((event.target as HTMLInputElement).value)
                            if (val === row.commission || isNaN(val)) return;
                            await updateProduct(row.guid, 'commission', val)
                        }
                    }}
                />,
                sortable: true
            }]}
        />
    }

    return <div>
        <div className="mb-6 flex justify-between">
            <h1 className="text-2xl font-bold">Financial Products</h1>

            <Button onClick={() => setCreating(true)} variant={'linkHover2'} className={'force-border'}>
                <Plus className="h-4 w-4 mr-2"/> New Product
            </Button>
        </div>

        <Input
            type="text"
            placeholder="Search products"
            value={interimSearch}
            onChange={(event) => setInterimSearch(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    setSearch(interimSearch)
                }
            }}
            onBlur={() => setSearch(interimSearch)}
            className="mb-6"
        />

        {table}

        <Dialog open={creating} onOpenChange={(open) => {
            if (!open) {
                setCreating(false)
            }
        }}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Add Product Type</DialogTitle>
                </DialogHeader>
                <div className={'space-y-4'}>
                    <FormField grid={false} label={'Title'} htmlFor="title">
                        <Input
                            id="title"
                            value={newProduct.title}
                            onChange={(e) => setNewProduct(prev => ({...prev, title: e.target.value}))}
                        />
                    </FormField>
                    <FormField grid={false} label={'Description'} htmlFor="description">
                        <Textarea
                            id="description"
                            value={newProduct.description ?? ''}
                            onChange={(e) => setNewProduct(prev => ({...prev, description: e.target.value}))}
                        />
                    </FormField>
                    <FormField grid={false} label={'Commission'} htmlFor="commission">
                        <Input
                            endIcon={PercentIcon}
                            id="commission"
                            type="number"
                            value={newProduct.commission.toString()}
                            onChange={(e) => {
                                const val = parseInt(e.target.value)
                                if (isNaN(val)) {
                                    return
                                }
                                setNewProduct(prev => ({...prev, commission: clamp(val, 0, 100)}))
                            }}
                        />
                    </FormField>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                    <Button onClick={async () => {
                        const result = handleServerAction(await createProductType(newProduct))
                        if (result.success) {
                            setCreating(false)
                            setNewProduct({
                                guid: '_new',
                                title: '',
                                description: '',
                                commission: 0,
                            })
                            await queryClient.invalidateQueries({
                                queryKey: ['products']
                            })
                            toast.success('Product created')
                        }
                    }}>Create Product</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}