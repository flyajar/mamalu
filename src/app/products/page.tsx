import { Metadata } from "next";
import { getProducts, getProductCategories } from "@/lib/sanity/queries";
import { urlFor } from "@/lib/sanity/client";
import ProductsClient from "./ProductsClient";
import { Sparkles, ShoppingBag, Truck, Shield } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Shop premium ingredients and kitchenware from Mamalu Kitchen.",
};

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getProductCategories(),
  ]);

  // Pre-process image URLs on the server
  const productsWithImages = (products || []).map((product: any) => ({
    ...product,
    imageUrl: product.images?.[0] 
      ? urlFor(product.images[0]).width(400).height(400).url() 
      : null,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative gradient-mesh py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-stone-300/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-gradient-to-br from-[#ff7f5c]/15 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="flex items-center justify-center gap-4 lg:gap-8">
              <div className="hidden lg:block">
                <Image src="/images/0312b1_27732e4abccb4925bca29ff7f349d958~mv2_d_1772_1772_s_2.avif" alt="" width={200} height={200} className="opacity-70" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6">
                Shop <span className="text-gradient">Products</span>
              </h1>
              <div className="hidden lg:block">
                <Image src="/images/0312b1_fee52e9b65c54277bd129615e50d68ff~mv2_d_1772_1772_s_2.avif" alt="" width={190} height={190} className="opacity-70" />
              </div>
            </div>
            <p className="text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto">
              Premium ingredients and kitchenware to elevate your cooking experience
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-2">
                <ShoppingBag className="h-5 w-5 text-stone-900" />
              </div>
              <div className="text-sm font-semibold text-stone-900">Quality Products</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-2">
                <Truck className="h-5 w-5 text-stone-900" />
              </div>
              <div className="text-sm font-semibold text-stone-900">Fast Delivery</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-stone-900" />
              </div>
              <div className="text-sm font-semibold text-stone-900">Secure Payment</div>
            </div>
          </div>
        </div>
      </section>

      <ProductsClient
        products={productsWithImages}
        categories={categories || []}
      />
    </div>
  );
}
