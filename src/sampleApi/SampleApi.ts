import { APIAuthClient } from './kiboauth/authclient';
//'@kibocommerce/sdk-authentication'
// configuration parameters
const config = 
{
  clientId: process.env.NEXT_PUBLIC_KIBO_CLIENT_ID,
  sharedSecret: process.env.NEXT_PUBLIC_KIBO_SHARED_SECRET,
  authHost: process.env.NEXT_PUBLIC_KIBO_AUTH_HOST,
  apiHost: process.env.NEXT_PUBLIC_KIBO_API_HOST,
} as any
console.log(config)
const apiAuthClient = new APIAuthClient(config, fetch)

type ApiProduct = {
    id: string;
    title: string;
    price: number;
    description: string;
    category: string;
    image: string;
    rating: {
        rate: number;
        count: number;
    };
};

export type SampleProduct = ApiProduct & {
    id: string;
};

const getProductQuery = `
query GetProduct($filter: String) {
  products(filter: $filter) {
    totalCount
    items {
      price {
        price
      }
      categories{
        content {
          name
        }
      }
      content {
        productName
        productShortDescription
        productFullDescription
        productImages{
          imageUrl
        }
      }
      
      productCode
      
    }
  }
}`

const fetcher = async ({ query, variables }: any, options: any) => {
  const authToken = await apiAuthClient.getAccessToken()
  const graphqlUrl = `https://${config.apiHost}/graphql`
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })
  return await response.json()
}
function mapKiboProductToApiProduct(kiboProduct:any) {
    return {
        id: kiboProduct.productCode || '',
        title: kiboProduct.content?.productName || '',
        price: kiboProduct.price?.price || 0,
        description: kiboProduct.content?.productShortDescription || kiboProduct.content?.productFullDescription || '',
        category: kiboProduct.categories?.[0]?.content?.name || '',
        image: kiboProduct.content?.productImages?.[0]?.imageUrl || '',
        rating: {
            rate: 3,
            count: 0 // Kibo doesn't seem to have a review count field
        }
    };
}
export class SampleApi {
    private readonly apiHost: string;
    private productCache = new Map<string, SampleProduct>();
    private listCache: Array<SampleProduct> | null = null;

    constructor(apiHost: string) {
        this.apiHost = apiHost;
    }

    async listProducts(): Promise<SampleProduct[]> {
        if (this.listCache) {
            return [...this.listCache];
        }
        const kiboProducts = await fetcher({ query: getProductQuery, variables: { filter: '' } }, {});
        if (!kiboProducts || !kiboProducts.data || !kiboProducts.data.products || !kiboProducts.data.products.items) {
            return [];
        }
        const products: ApiProduct[] = kiboProducts.data.products.items.map(mapKiboProductToApiProduct);
        this.listCache = products.map(product => {
            return { ...product, id: String(product.id) };
        }) as SampleProduct[];

        return [...(this.listCache ?? [])];
    }
    async getProducts(ids: string[]): Promise<SampleProduct[]> {
      if(!ids || ids.length === 0) {
          return [];
      }
      const filterStr = ids.map(id => `productCode eq ${id}`).join(' or '); 
      const kiboProducts = await fetcher({ query: getProductQuery, variables: { filter: filterStr } }, {});
        if (!kiboProducts || !kiboProducts.data || !kiboProducts.data.products || !kiboProducts.data.products.items) {
            return [];
        }
        const products: ApiProduct[] = kiboProducts.data.products.items.map(mapKiboProductToApiProduct);
        this.listCache = products.map(product => {
            return { ...product, id: String(product.id) };
        }) as SampleProduct[];

        return [...(this.listCache ?? [])];
    }
    async getProduct(id: string): Promise<SampleProduct | null> {
        if (this.productCache.has(id)) {
            return this.productCache.get(id) as SampleProduct;
        }
        const kiboProducts = await fetcher({ query: getProductQuery, variables: { filter: `productCode eq ${id}` } }, {});
        if (!kiboProducts || !kiboProducts.data || !kiboProducts.data.products || !kiboProducts.data.products.items) {
            return null;
        }
        const product: ApiProduct = mapKiboProductToApiProduct(kiboProducts.data.products.items[0])
        if (!product) {
            return null;
        }

        product.id = String(product.id);
        this.productCache.set(product.id, product);
        return product;
    }

    private async fetch(url: string) {
        const res = await fetch(this.apiHost + url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        return await res.json().catch(() => {
            return null;
        });
    }
}

export const sampleApi = new SampleApi("https://fakestoreapi.com");
