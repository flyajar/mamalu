import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProducts } from "@/lib/products/catalog";
import { fetchProductCartSettings } from "@/lib/products/settings";

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

const FREE_SHIPPING_THRESHOLD = 200;

function metadataValue(value: unknown) {
  return String(value || "").slice(0, 500);
}

function customerValue(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerDetails, successUrl, cancelUrl } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const requiredCustomerFields = [
      "firstName",
      "lastName",
      "email",
      "countryCode",
      "phone",
      "streetAddress",
      "area",
      "city",
      "country",
    ];
    const hasCustomerDetails =
      customerDetails &&
      requiredCustomerFields.every((field) => String(customerDetails[field] || "").trim());

    if (!hasCustomerDetails) {
      return NextResponse.json(
        { error: "Billing information is required" },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mamalu.vercel.app";
    const finalSuccessUrl = successUrl || `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${siteUrl}/cart`;

    const cartItems = items as CartItem[];
    const productIds = cartItems.map((item) => item.id).filter(Boolean);

    if (productIds.length !== cartItems.length) {
      return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const [products, settings] = await Promise.all([
      fetchProducts(supabase, { ids: productIds }),
      fetchProductCartSettings(supabase),
    ]);
    const productsById = new Map(products.map((product) => [product.id, product]));

    const validatedItems = cartItems.map((item) => {
      const product = productsById.get(item.id);
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));

      if (!product || product.is_active === false || product.in_stock === false) {
        throw new Error(`${item.title || "A product"} is no longer available`);
      }

      if (typeof product.stock_quantity === "number" && product.stock_quantity < quantity) {
        throw new Error(`${product.title || item.title} only has ${product.stock_quantity} in stock`);
      }

      return {
        id: item.id,
        title: product.title || item.title,
        price: Number(product.price || 0),
        quantity,
        imageUrl: product.image_url || item.imageUrl,
      };
    });

    // Create line items for Stripe
    const lineItems = validatedItems.map((item) => ({
      price_data: {
        currency: "aed",
        product_data: {
          name: item.title,
          ...(item.imageUrl && { images: [item.imageUrl] }),
        },
        unit_amount: Math.round(item.price * 100), // Convert to fils
      },
      quantity: item.quantity,
    }));

    // Calculate if free shipping applies.
    const subtotal = validatedItems.reduce((sum: number, item) => sum + item.price * item.quantity, 0);
    if (subtotal < settings.minimumOrderValue) {
      return NextResponse.json(
        { error: `Minimum order value is AED ${settings.minimumOrderValue.toFixed(2)}` },
        { status: 400 }
      );
    }

    const shippingCost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : settings.deliveryFee;

    // Add shipping as a line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "aed",
          product_data: {
            name: "Shipping",
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const customerName = `${customerValue(customerDetails.firstName)} ${customerValue(customerDetails.lastName)}`.trim();
    const customerPhone = `${customerValue(customerDetails.countryCode)}${customerValue(customerDetails.phone)}`.trim();
    const checkoutCustomer = await stripe.customers.create({
      email: customerValue(customerDetails.email),
      name: customerName,
      phone: customerPhone,
      address: {
        line1: customerValue(customerDetails.streetAddress),
        line2: customerValue(customerDetails.area),
        city: customerValue(customerDetails.city),
        country: "AE",
      },
      shipping: {
        name: customerName,
        phone: customerPhone,
        address: {
          line1: customerValue(customerDetails.streetAddress),
          line2: customerValue(customerDetails.area),
          city: customerValue(customerDetails.city),
          country: "AE",
        },
      },
      metadata: {
        source: "mamalu_product_checkout",
      },
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer: checkoutCustomer.id,
      customer_update: {
        address: "auto",
        name: "auto",
        shipping: "auto",
      },
      line_items: lineItems,
      metadata: {
        order_type: "product_purchase",
        items_count: validatedItems.length.toString(),
        items_json: JSON.stringify(validatedItems.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        }))),
        subtotal: subtotal.toString(),
        shipping_cost: shippingCost.toString(),
        customer_first_name: metadataValue(customerDetails.firstName),
        customer_last_name: metadataValue(customerDetails.lastName),
        customer_email: metadataValue(customerDetails.email),
        customer_country_code: metadataValue(customerDetails.countryCode),
        customer_phone: metadataValue(customerDetails.phone),
        customer_street_address: metadataValue(customerDetails.streetAddress),
        customer_area: metadataValue(customerDetails.area),
        customer_city: metadataValue(customerDetails.city),
        customer_country: metadataValue(customerDetails.country),
      },
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      shipping_address_collection: {
        allowed_countries: ["AE"],
      },
      phone_number_collection: {
        enabled: true,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
