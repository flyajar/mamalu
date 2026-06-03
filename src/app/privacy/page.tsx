import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Mamalu Kitchen privacy policy and data protection practices.",
};

export default function PrivacyPage() {
  return (
    <div className="py-20 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-stone max-w-none">
          <p className="text-stone-600 mb-6">
            Last updated: January 2024
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-stone-600">
              Mamalu Kitchen (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy
              and is committed to protecting your personal data. This privacy
              policy explains how we collect, use, and safeguard your
              information when you visit our website or use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">
              2. Information We Collect
            </h2>
            <p className="text-stone-600 mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Name and contact information</li>
              <li>Account credentials</li>
              <li>Payment information</li>
              <li>Order history and preferences</li>
              <li>Communications with us</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-stone-600 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Process and fulfill your orders</li>
              <li>Manage your account and bookings</li>
              <li>Send you updates and marketing communications</li>
              <li>Improve our products and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">
              4. Data Security
            </h2>
            <p className="text-stone-600">
              We implement appropriate security measures to protect your
              personal data against unauthorized access, alteration, disclosure,
              or destruction. Payment information is processed securely through
              our payment partner, Stripe.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">
              5. Your Rights
            </h2>
            <p className="text-stone-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">
              6. Contact Us
            </h2>
            <p className="text-stone-600">
              If you have questions about this privacy policy or our data
              practices, please contact us at{" "}
              <a
                href="mailto:info@mamalukitchen.com"
                className="text-amber-600 hover:text-amber-700"
              >
                info@mamalukitchen.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
