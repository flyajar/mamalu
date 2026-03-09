import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Learn about Mamalu Kitchen's story, our passion for authentic cooking, and our mission to bring families together through food.",
};

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* About Mamalu Section */}
      <section className="py-8 lg:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* About Mamalu Header with curly arrow doodle */}
          <div className="flex items-start justify-center mb-12">
            <h1 
              className="text-4xl sm:text-5xl text-stone-600"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400 }}
            >
              About Mamalu
            </h1>
            <Image 
              src="/images/arrow-01.png" 
              alt="" 
              width={50} 
              height={50} 
              className="ml-3 -mt-1 opacity-80"
            />
          </div>

          {/* First section - Image left, text right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="relative">
              <Image
                src="/images/founder-lama.jpg"
                alt="Lama - Founder of Mamalu Kitchen"
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
              <p>
                The first concept launched under the Mamalu Kitchen brand in 2016 was all cooking classes for nanny&apos;s and housekeepers. With recipes in their native language from traditional Arabic cuisine to how to cook for the ultimate dinner party!
              </p>
              <p>
                That was shortly followed by cooking classes for mums/children, schools, couples, corporations &amp; even husbands who also wanted to learn how to create delicious all natural food for their families.
              </p>
              <p>
                Mamalu Kitchen is creating a cooking movement under the slogan #feedingfamilies.
              </p>
              <p>
                In line with her cooking movement in 2020 she started Eazy Freezy, it is all natural, easy to cook frozen food products for families on the go. Hassle free yumminess without the bad stuff. The products are available online and across Spinneys &amp; Waitrose outlets all over the UAE.
              </p>
              <p>
                By engaging every single member of the household/family and various members of the community, to be involved and empowered by cooking, Mamalu Kitchen is enabling a lifestyle change in the region. This &apos;cooking movement&apos; is leading families to live a healthier and happier life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feeding Families Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header with icons */}
          <div className="flex items-center justify-center gap-8 mb-4">
            <Image 
              src="/images/girl-01.png" 
              alt="" 
              width={80} 
              height={100} 
              className="h-24 w-auto"
            />
            <h2 
              className="text-4xl sm:text-5xl text-[#FF8C6B]"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400 }}
            >
              &quot;Feeding Families&quot;
            </h2>
            <Image 
              src="/images/noodles-01.png" 
              alt="" 
              width={80} 
              height={80} 
              className="h-20 w-auto"
            />
          </div>
          <p 
            className="text-center text-2xl sm:text-3xl text-[#FF8C6B] mb-16"
            style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400 }}
          >
            &quot;We are creating a cooking movement!&quot;
          </p>

          {/* Second section - Text left, image right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div 
              className="text-stone-600 space-y-6"
              style={{ fontFamily: 'var(--font-mossy), cursive', fontWeight: 400, fontSize: '1.1rem', lineHeight: '1.8' }}
            >
              <p>
                Raised between Lebanon and the UK, Lama has always had a passion for cooking since the age of 4. By shadowing her mother from a young age, she acquired the knowledge of all of the classic Arabic dishes. Her specialty is family food - large, beautiful mouthwatering dishes with a strong Mediterranean influence to be shared amongst friends and family.
              </p>
              <p>
                Her love of cooking lead her to study in Glion Hotel School, Switzerland and earn a Hospitality &amp; Tourism degree and gain experience with some of the top 5 star luxury hotel groups such as Four Seasons, Rocco Forte and Hyatt hotels in London, Paris and Rome.
              </p>
              <p>
                Mamalu Kitchen is not Lama&apos;s first entrepreneurial venture, she has had over a decade of experience in the fashion industry under her independent private label. She has opened two concept stores in Beirut, Lebanon &#123;Ribbon &amp; Lace and Birdcage&#125; She has also been a part of the prestigious London &amp; Paris Fashion weeks for 7 consecutive years and has extensive experience as a designer for high end clothing brand, Mojo World.
              </p>
              <p>
                She is also a proud mother of three boys (at one time all 3 of them were under 2 years old) and they have inspired her to launch Mamalu Kitchen less than 4 months after her twins were born.
              </p>
            </div>
            <div className="relative">
              <Image
                src="/images/Lama_Jammal_pic.jpeg"
                alt="Lama cooking"
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
