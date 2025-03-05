import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {User} from "~/db/sql/models/User";
import {getProducts} from "~/app/(authenticated)/settings/products/common";
import {ProductList} from "~/app/(authenticated)/settings/products/client";
import {QueryWrapper} from "~/components/util/QueryWrapper";

async function ProductsPage({requester}: {requester: User}) {
    const [products, count] = await getProducts(requester.tenetId ?? undefined, '', 1, 25, {title: 'asc'})

    return <div>
        <QueryWrapper>
            <ProductList products={products} count={count}/>
        </QueryWrapper>
    </div>
}

export const metadata = {
    title: 'Configure Products',
}

export default withAuthentication(ProductsPage)