import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { defaultPressContent, PressArticle, PressContent } from "@/types/press";
import { PressMediaPreview } from "@/components/press/PressMediaPreview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Press | Mamalu Kitchen",
  description:
    "Just a few highlights about our story, cooking classes and more!",
};

async function getPressContent(): Promise<PressContent> {
  const supabase = await createClient();
  if (!supabase) return defaultPressContent;

  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("id", "press")
    .single();

  if (error || !data?.content) return defaultPressContent;

  const content = data.content as PressContent;
  return {
    articles: Array.isArray(content.articles) ? content.articles : [],
  };
}

export default async function PressPage() {
  const pressContent = await getPressContent();
  const pressArticles = pressContent.articles
    .filter((article) => article.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section with Doodle Icons */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header with doodle icons */}
          <div className="flex items-center justify-center gap-8 md:gap-16 mb-12 md:mb-20">
            {/* Left doodle - utensils */}
            <div className="hidden md:flex items-center gap-2">
              <Image
                src="/images/spoon big-01.png"
                alt="Spoon"
                width={60}
                height={80}
                className="w-auto h-16 md:h-20 object-contain"
              />
              <Image
                src="/images/whisk-01.png"
                alt="Whisk"
                width={60}
                height={80}
                className="w-auto h-16 md:h-20 object-contain"
              />
            </div>

            {/* Title - PRESS in coral color */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-mossy), cursive", color: "#FF8C6B" }}
            >
              PRESS
            </h1>

            {/* Right doodle - notepad */}
            <div className="hidden md:block">
              <Image
                src="/images/notepad.png"
                alt="Notepad"
                width={100}
                height={100}
                className="w-auto h-20 md:h-24 object-contain"
              />
            </div>
          </div>

          {pressArticles.length > 0 ? (
            <div className="space-y-16 md:space-y-24">
              {pressArticles.map((article: PressArticle, index: number) => (
                <article
                  key={article.id}
                  className={`flex flex-col ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-8 md:gap-16 items-center`}
                >
                  <div className="w-full md:w-[54%] flex-shrink-0">
                    <div className="aspect-[4/3] relative overflow-hidden rounded-lg shadow-lg bg-white">
                      <PressMediaPreview article={article} />
                    </div>
                  </div>

                  <div className="flex-1 max-w-xl space-y-3">
                    <h2
                      className="text-2xl md:text-3xl font-bold"
                      style={{ fontFamily: "var(--font-mossy), cursive", color: "#1c1917" }}
                    >
                      {article.title}
                    </h2>
                    <p
                      className="font-bold text-lg"
                      style={{ fontFamily: "var(--font-mossy), cursive", color: "#FF8C6B" }}
                    >
                      {article.date}
                    </p>
                    <p
                      className="text-stone-700 font-bold leading-relaxed"
                      style={{ fontFamily: "var(--font-mossy), cursive" }}
                    >
                      {article.description}
                    </p>
                    {article.url && article.mediaType === "article" && !article.isVideo && (
                      <div className="flex justify-center md:justify-start">
                      <Link
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Read ${article.title} press article`}
                        className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-[#FF8C6B] bg-[#FF8C6B] px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white hover:text-[#FF8C6B] focus:outline-none focus:ring-2 focus:ring-[#FF8C6B] focus:ring-offset-2"
                        style={{ fontFamily: "var(--font-mossy), cursive" }}
                      >
                        Read feature
                        <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={2.5} />
                      </Link>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-lg border border-stone-200 bg-stone-50 px-6 py-10 text-center">
              <p
                className="text-xl font-bold text-stone-700"
                style={{ fontFamily: "var(--font-mossy), cursive" }}
              >
                Press articles will be available soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Media Inquiries */}
      <section className="py-16 bg-[#fff5eb]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#FF8C6B] mb-4"
            style={{ fontFamily: "var(--font-mossy), cursive" }}
          >
            Media Inquiries
          </h2>
          <p
            className="text-stone-700 font-bold mb-6"
            style={{ fontFamily: "var(--font-mossy), cursive" }}
          >
            For press inquiries, interview requests, or media kit access, please contact our communications team.
          </p>
          <a
            href="mailto:info@mamalukitchen.com"
            className="inline-flex items-center text-[#FF8C6B] font-bold hover:underline text-lg"
            style={{ fontFamily: "var(--font-mossy), cursive" }}
          >
            info@mamalukitchen.com
          </a>
        </div>
      </section>
    </div>
  );
}
