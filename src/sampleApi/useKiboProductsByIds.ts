import { sampleApi, SampleProduct } from "./SampleApi";
import { useEffect, useState } from "react";

export const useProductsByIds = (ids: string[]) => {
    const [products, setProducts] = useState<SampleProduct[]>([]);

    useEffect(() => {
        sampleApi.getProducts(ids).then(products => {
            setProducts(products)
        });
    }, [ids]);

    return products;
};
