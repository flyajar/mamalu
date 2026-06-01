import { Metadata } from "next";
import Image from "next/image";
import { AboutPageContent, defaultAboutContent } from "@/types/site-content";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Learn about Mamalu Kitchen's story, our passion for authentic cooking, and our mission to bring families together through food.",
};

async function getAboutContent(): Promise<AboutPageContent> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/site-content?page=about`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("Error fetching about content:", error);
  }
  return defaultAboutContent;
}

export default async function AboutPage() {
  const content = await getAboutContent();

  return (
    <div className="bg-white">
      {/* About Mamalu Section */}
      <section className="py-8 lg:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* About Mamalu Header with curly arrow doodle */}
          <div className="flex items-center justify-center mb-12">
            <h1
              className="text-4xl sm:text-5xl text-stone-600"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400 }}
            >
              {content.pageTitle}
            </h1>
            <Image
              src="/images/arrow-01.png"
              alt=""
              width={150}
              height={150}
              className="about-arrow opacity-80 w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] md:w-[150px] md:h-[150px]"
              style={{ transform: "translateX(0px) translateY(0px) scaleX(1) scaleY(1) rotate(90deg) skewX(0deg) skewY(0deg)" }}
            />
          </div>

          {/* First section - Image left, text right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="relative">
              <Image
                src={content.founderImage1}
                alt={content.founderImage1Alt}
                width={450}
                height={600}
                className="w-full h-auto"
                quality={100}
              />
            </div>
            <div 
              className="text-stone-600 space-y-6"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400, fontSize: '1.1rem', lineHeight: '1.8' }}
            >
              {content.section1Paragraphs.map((para, index) => (
                <p key={index}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feeding Families Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header with icons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-4">
            <Image 
              src="/images/girl-01.png" 
              alt="" 
              width={80} 
              height={100} 
              className="h-16 sm:h-24 w-auto hidden sm:block"
            />
            <h2 
              className="text-3xl sm:text-4xl md:text-5xl text-center"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400, color: '#FF8C6B' }}
            >
              {content.feedingFamiliesTitle}
            </h2>
            <Image 
              src="/images/noodles-01.png" 
              alt="" 
              width={80} 
              height={80} 
              className="h-16 sm:h-20 w-auto hidden sm:block"
            />
          </div>
          <p 
            className="text-center text-xl sm:text-2xl md:text-3xl mb-8 sm:mb-16 px-4"
            style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400, color: '#FF8C6B' }}
          >
            {content.feedingFamiliesSubtitle}
          </p>

          {/* Second section - Text left, image right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div 
              className="text-stone-600 space-y-6"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400, fontSize: '1.1rem', lineHeight: '1.8' }}
            >
              {content.section2Paragraphs.map((para, index) => (
                <p key={index}>{para}</p>
              ))}
            </div>
            <div className="relative">
              <Image
                src={content.founderImage2}
                alt={content.founderImage2Alt}
                width={450}
                height={600}
                className="w-full h-auto"
                quality={100}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
