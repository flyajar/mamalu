import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Press | Mamalu Kitchen",
  description:
    "Just a few highlights about our story, cooking classes and more!",
};

// Press articles data from mamalukitchen.com/press
const pressArticles = [
  {
    id: 1,
    title: "Time out Dubai",
    date: "December 2023",
    description: "Featured by Time out Dubai -Dubai Bling filming locations: All the places to visit for certified bougie vibes",
    url: "https://www.timeoutdubai.com/news/dubai-bling-locations",
    image: "/images/Mamalou Kitchen - 101.jpg",
  },
  {
    id: 2,
    title: "What's on",
    date: "March 2023",
    description: "Featured by What's on Dubai -6 delicious foodie workshops you need to try in Dubai.",
    url: "https://whatson.ae/2023/03/food-workshops-and-cooking-classes-in-dubai/",
    image: "/images/Mamalou Kitchen - 102.jpg",
  },
  {
    id: 3,
    title: "Spinneys",
    date: "March 2023",
    description: "Women in food: Lama Jammal, founder, Mamalu Kitchen & Eazy Freezy",
    url: "https://www.spinneys.com/en-ae/lifestyle/international-womens-day-lama-jammal-founder-mamalu-kitchen--eazy-freezy/",
    image: "/images/Lama_Jammal_pic.jpeg",
  },
  {
    id: 4,
    title: "Harper's Bazaar Arabia",
    date: "December 2023",
    description: "Dubai Bling Season 2 Locations: 13 Places Spotted In The New Release",
    url: "https://www.harpersbazaararabia.com/culture/entertainment/dubai-bling-season-2-locations",
    image: "/images/Mamalou Kitchen - 103.jpg",
  },
  {
    id: 5,
    title: "Arabian Diaries",
    date: "December 2023",
    description: "Featured by Arabian Diaries Dubai - Culinary Excellence: Mamalu Kitchen Delights and Recipes",
    url: "https://arabiandiaries.com/culinary-excellence-mamalu-kitchen-delights-and-recipes/",
    image: "/images/Mamalou Kitchen - 104.jpg",
  },
  {
    id: 6,
    title: "Brand Collaboration for Puck on Shahid",
    date: "May 2022",
    description: "A Brand collaboration with puck for Ramadan to do easy and delicious Iftar recipe",
    url: null,
    image: "/images/Mamalou Kitchen - 105.jpg",
  },
  {
    id: 7,
    title: "Meet The Founders",
    date: "April 2022",
    description: "An interview with Helen farmer & Nakheel Mall to talk about Mamalus entrepreneurial journey.",
    url: null,
    image: "/images/Mamalou Kitchen - 110.jpg",
  },
  {
    id: 8,
    title: "Bosch",
    date: "March 2022",
    description: "Special mothers day class at the Bosch kitchen",
    url: null,
    image: "/images/Mamalou Kitchen - 151.jpg",
  },
  {
    id: 9,
    title: "Facebook",
    date: "February 2022",
    description: "A little about the world of Mamalu Kitchen and Eazy Freezy",
    url: null,
    image: "/images/Mamalou Kitchen - 164.jpg",
  },
  {
    id: 10,
    title: "Expo 2020",
    date: "December 2021",
    description: "Women's panel session at the EXPO2020 women's pavilion",
    url: null,
    image: "/images/Mamalou Kitchen - 165.jpg",
  },
  {
    id: 11,
    title: "Timeout Dubai",
    date: "June 2021",
    description: "9 Creative things to try out this summer",
    url: null,
    image: "/images/Mamalou Kitchen - 175.jpg",
  },
  {
    id: 12,
    title: "Lovin' Dubai",
    date: "June 2021",
    description: "6 Places to visit perfect for foodies",
    url: null,
    image: "/images/Mamalou Kitchen - 180.jpg",
  },
  {
    id: 13,
    title: "Marie Claire Arabia",
    date: "May 2021",
    description: "Ramadan Special",
    url: null,
    image: "/images/Mamalou Kitchen - 183.jpg",
  },
  {
    id: 14,
    title: "What's On Dubai",
    date: "July 2020",
    description: "Summer special for kids",
    url: null,
    image: "/images/Mamalou Kitchen - 193.jpg",
  },
  {
    id: 15,
    title: "The National",
    date: "June 2020",
    description: "Tips to keep children entertained indoors.",
    url: null,
    image: "/images/Mamalou Kitchen - 199.jpg",
  },
  {
    id: 16,
    title: "Elle Arabia",
    date: "May 2020",
    description: "Favorite dish to cook while in quarantine, using pantry staples. Staying home and staying healthy.",
    url: null,
    image: "/images/Mamalou Kitchen - 200.jpg",
  },
  {
    id: 17,
    title: "Al Arabiya",
    date: "January 2022",
    description: "Morning show with Al Arabiya for a healthy meal",
    url: "https://www.youtube.com/watch?v=CTG9pX9EM84",
    image: "/images/Mamalou Kitchen - 201.jpg",
  },
  {
    id: 18,
    title: "WhatsOn Dubai",
    date: "December 2022",
    description: "Featured by Whatson Dubai - fun Christmas presents to buy your friends and family. 6 best kitchen tools for cooking with kids this summer in UAE, for 2023",
    url: null,
    image: "/images/Mamalou Kitchen - 218.jpg",
  },
];

export default function PressPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section with Doodle Icons */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
            
            {/* Title */}
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#FF8C6B] tracking-[0.3em] uppercase"
              style={{ fontFamily: 'var(--font-mossy), cursive' }}
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

          {/* Press Articles */}
          <div className="space-y-16 md:space-y-24">
            {pressArticles.map((article, index) => (
              <article 
                key={article.id}
                className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-12 items-start`}
              >
                {/* Image */}
                <div className="w-full md:w-2/5 flex-shrink-0">
                  <div className="aspect-[4/3] relative overflow-hidden rounded-lg shadow-lg">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 space-y-3">
                  <h2 
                    className="text-2xl md:text-3xl font-bold text-stone-900"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {article.title}
                  </h2>
                  <p 
                    className="text-[#FF8C6B] font-bold text-lg"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {article.date}
                  </p>
                  <p 
                    className="text-stone-700 font-bold leading-relaxed"
                    style={{ fontFamily: 'var(--font-mossy), cursive' }}
                  >
                    {article.description}
                  </p>
                  {article.url && (
                    <Link
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-stone-600 font-bold hover:text-[#FF8C6B] transition-colors break-all"
                      style={{ fontFamily: 'var(--font-mossy), cursive' }}
                    >
                      {article.url}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Media Inquiries */}
      <section className="py-16 bg-[#fff5eb]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 
            className="text-2xl md:text-3xl font-bold text-stone-900 mb-4"
            style={{ fontFamily: 'var(--font-mossy), cursive' }}
          >
            Media Inquiries
          </h2>
          <p 
            className="text-stone-700 font-bold mb-6"
            style={{ fontFamily: 'var(--font-mossy), cursive' }}
          >
            For press inquiries, interview requests, or media kit access, please contact our communications team.
          </p>
          <a
            href="mailto:info@mamalukitchen.com"
            className="inline-flex items-center text-[#FF8C6B] font-bold hover:underline text-lg"
            style={{ fontFamily: 'var(--font-mossy), cursive' }}
          >
            info@mamalukitchen.com
          </a>
        </div>
      </section>
    </div>
  );
}
