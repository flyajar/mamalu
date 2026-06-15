/**
 * Sync Eazy Freezy product categories to match the live Wix shop filters.
 *
 * Run with: npx tsx scripts/sync-eazy-freezy-categories.ts
 */

import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN in .env.local");
}

const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  token,
  apiVersion: "2024-01-01",
});

const categories = [
  { title: "Italian", slug: "italian", order: 10 },
  { title: "Arabic", slug: "arabic", order: 20 },
  { title: "Kids", slug: "kids", order: 30 },
  { title: "Dinner Party", slug: "dinner-party", order: 40 },
  { title: "Asian", slug: "asian", order: 50 },
];

const staleCategorySlugs = [
  "bundles",
  "desserts",
  "mains",
  "pasta",
  "sauces",
  "savory",
];

const productCategories: Record<string, string[]> = {
  "truffle-sauce": ["italian"],
  "rigatoni-pasta": ["italian"],
  "gnocchi-potato": ["italian"],
  "orecchiete-pasta": ["italian"],
  "bolognese-sauce-with-hidden-vegetables": ["italian"],
  "spinach-fatayer": ["arabic"],
  "cheese-rolls": ["arabic", "kids"],
  "mini-cheese-rolls": ["arabic"],
  "musakhan-rolls": ["arabic", "dinner-party"],
  "cheese-sambousek": ["arabic"],
  "falafel": ["arabic"],
  "stuffed-zucchini": ["arabic"],
  "stuffed-cabbage-rolls": ["arabic"],
  "beef-sambousek": ["arabic", "dinner-party"],
  "mini-zataar-croissant": ["arabic", "kids"],
  "manti-spinach-filling": ["arabic"],
  "mini-meat-kibbe": ["arabic", "dinner-party"],
  "mini-pumpkin-kibbe": ["arabic"],
  "ouzi": ["arabic", "dinner-party"],
  "shish-barak-meat-dumplings": ["arabic", "dinner-party"],
  "kid-lunch-box-bundle": [],
  "quinoa-crusted-chicken-tenders": ["kids"],
  "smiley-face-pizza": ["kids"],
  "churros": ["dinner-party"],
  "mini-cheese-croissant": ["dinner-party", "kids"],
  "vegetable-gyoza": ["asian"],
  "prawn-gyoza": ["asian"],
};

async function syncCategories() {
  const categoryRefs: Record<string, string> = {};

  for (const category of categories) {
    const existing = await client.fetch(
      `*[_type == "productCategory" && slug.current == $slug][0]{_id}`,
      { slug: category.slug },
    );

    if (existing?._id) {
      categoryRefs[category.slug] = existing._id;
      await client
        .patch(existing._id)
        .set({ title: category.title, order: category.order })
        .commit();
      continue;
    }

    const created = await client.create({
      _type: "productCategory",
      title: category.title,
      slug: { _type: "slug", current: category.slug },
      order: category.order,
    });
    categoryRefs[category.slug] = created._id;
  }

  const transaction = client.transaction();
  let patched = 0;
  const missing: string[] = [];

  for (const [productSlug, categorySlugs] of Object.entries(productCategories)) {
    const product = await client.fetch(
      `*[_type == "product" && slug.current == $slug][0]{_id, title}`,
      { slug: productSlug },
    );

    if (!product?._id) {
      missing.push(productSlug);
      continue;
    }

    transaction.patch(product._id, {
      set: {
        categories: categorySlugs.map((categorySlug) => ({
            _type: "reference",
            _ref: categoryRefs[categorySlug],
            _key: categorySlug,
          })),
      },
    });
    patched += 1;
  }

  if (patched > 0) {
    await transaction.commit();
  }

  const staleCategories = await client.fetch<Array<{ _id: string; title: string; slug: string }>>(
    `*[_type == "productCategory" && slug.current in $slugs] {
      _id,
      title,
      "slug": slug.current
    }`,
    { slugs: staleCategorySlugs },
  );

  if (staleCategories.length > 0) {
    const staleTransaction = client.transaction();

    for (const category of staleCategories) {
      staleTransaction.delete(category._id);
    }

    await staleTransaction.commit();
  }

  console.log(`Synced ${categories.length} categories.`);
  console.log(`Updated ${patched} products.`);
  console.log(`Removed ${staleCategories.length} stale categories.`);
  if (missing.length > 0) {
    console.log(`Missing products: ${missing.join(", ")}`);
  }
}

syncCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
