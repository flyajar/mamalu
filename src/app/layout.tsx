import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import localFont from "next/font/local";
import { Header, Footer } from "@/components/layout";
import { WalkInButton } from "@/components/layout/WalkInButton";
import LoadingScreen from "@/components/layout/LoadingScreen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const mossy = localFont({
  src: "../../public/fonts/Mossy.ttf",
  variable: "--font-mossy",
  display: "swap",
});

const springtimeBlues = localFont({
  src: "../../public/fonts/Springtime Blues.ttf",
  variable: "--font-springtime-blues",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mamalu Kitchen",
    template: "%s | Mamalu Kitchen",
  },
  description:
    "Discover authentic recipes, artisan products, cooking classes, and culinary services. Join Mamalu Kitchen on a journey of flavor.",
  keywords: [
    "cooking",
    "recipes",
    "cooking classes",
    "food products",
    "culinary",
    "events",
    "food consultancy",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if we're on an admin or studio page
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAdminOrStudio = pathname.startsWith("/admin") || pathname.startsWith("/studio");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${mossy.variable} ${poppins.variable} ${springtimeBlues.variable} antialiased min-h-screen flex flex-col`}
      >
        {!isAdminOrStudio && <LoadingScreen />}
        {!isAdminOrStudio && <Header />}
        <main className={`flex-1 ${!isAdminOrStudio ? "pt-4" : ""}`}>{children}</main>
        {!isAdminOrStudio && <Footer />}
        {!isAdminOrStudio && <WalkInButton />}
      </body>
    </html>
  );
}
