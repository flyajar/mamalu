import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getPublishedBlogPostBySlug } from "@/lib/blogs";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getPublishedBlogPostBySlug(slug);

  if (!blog) {
    return { title: "Blog Not Found" };
  }

  return {
    title: blog.title,
    description: blog.excerpt,
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const blog = await getPublishedBlogPostBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-amber-50 to-stone-100 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/blogs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900">
            {blog.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-stone-600">
            {blog.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(blog.publishedAt)}
              </div>
            )}
            {blog.authorName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {blog.authorName}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="aspect-video bg-gradient-to-br from-amber-100 to-[#FF8C6B]/20 rounded-xl flex items-center justify-center mb-8 overflow-hidden relative">
            {blog.imageUrl ? (
              <Image
                src={blog.imageUrl}
                alt={blog.imageAlt || blog.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <BookOpen className="h-20 w-20 text-amber-600/30" />
            )}
          </div>

          <article className="prose prose-stone prose-lg max-w-none">
            {(blog.body || blog.excerpt).split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>
        </div>
      </section>
    </div>
  );
}
