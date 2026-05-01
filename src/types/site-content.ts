export interface ServiceButton {
  id: string;
  title: string;
  href: string;
  backgroundImage: string;
  textColor?: string;
}

export interface SiteContent {
  // Hero slider images
  heroImages: string[];
  
  // Service buttons (Mini Chef, Big Chef, Rentals, Eazy Freezy)
  serviceButtons: ServiceButton[];
  
  // Gallery images (Life at Mamalu section)
  galleryImages: string[];
  
  // Section titles and texts
  lifeAtMamaluTitle: string;
  ourStoryTitle: string;
  ourStoryParagraph1: string;
  ourStoryParagraph2: string;
  ourStoryButtonText: string;
  
  // Founder section
  founderImage: string;
  founderName: string;
  
  // Stats
  stats: {
    value: string;
    label: string;
  }[];
  
  // Video - stored in Supabase storage, this is just a reference name
  videoFileName?: string;
}

// About Page Content
export interface AboutPageContent {
  pageTitle: string;
  founderImage1: string;
  founderImage1Alt: string;
  founderImage2: string;
  founderImage2Alt: string;
  section1Paragraphs: string[];
  feedingFamiliesTitle: string;
  feedingFamiliesSubtitle: string;
  section2Paragraphs: string[];
}

// Mini Chef Page Content
export interface MiniChefPageContent {
  pageTitle: string;
  pageSubtitle: string;
  headerImage: string;
  headerIcon: string;
  categoryIcons: {
    classics: string;
    monthly: string;
    mommy_me: string;
    birthdays: string;
    packages: string;
  };
}

// Big Chef Page Content
export interface BigChefPageContent {
  pageTitle: string;
  pageSubtitle: string;
  headerImage: string;
  headerIcon: string;
  categoryIcons: {
    corporate: string;
    classics: string;
    monthly: string;
    teenagers: string;
    nanny: string;
  };
}

// Rentals Page Content
export interface RentalOption {
  id: string;
  name: string;
  duration: string;
  price: number;
  description: string;
  icon: string;
}

export interface RentalAddOn {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
}

export interface RentalsPageContent {
  pageTitle: string;
  pageSubtitle: string;
  heroImage: string;
  headerIcon: string;
  rentalOptions: RentalOption[];
  addOns: RentalAddOn[];
  galleryImages: string[];
  features: string[];
}

// Footer Content
export interface FooterLink {
  id: string;
  label: string;
  href: string;
}

export interface FooterSocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
}

export interface FooterContent {
  logo: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  navigationLinks: FooterLink[];
  socialLinks: FooterSocialLink[];
  copyrightText: string;
  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterDescription: string;
}

// All Pages Content
export interface AllPagesContent {
  homepage: SiteContent;
  about: AboutPageContent;
  minichef: MiniChefPageContent;
  bigchef: BigChefPageContent;
  rentals: RentalsPageContent;
  footer: FooterContent;
}

export const defaultSiteContent: SiteContent = {
  heroImages: [
    "/images/1-2.jpg",
    "/images/File_010.jpeg",
    "/images/PHOTO-2025-12-02-18-26-42 (5).jpg",
    "/images/Mamalou Kitchen - 165.jpg",
    "/images/File_001.jpeg",
    "/images/Mamalou Kitchen - 67.jpg",
    "/images/Mamalou Kitchen - 78.jpg",
    "/images/Mamalou Kitchen - 103.jpg",
    "/images/Mamalou Kitchen - 193.jpg",
    "/images/Mamalou Kitchen - 220.jpg",
    "/shared-files/Kids high res pics/_C3A5778 (1).jpg",
    "/shared-files/Kids high res pics/_C3A5818.jpg",
    "/shared-files/Kids high res pics/_C3A5906 (1).jpg",
  ],
  serviceButtons: [
    {
      id: "mini-chef",
      title: "Mini Chef",
      href: "/minichef",
      backgroundImage: "/images/taco tuesday.jpg",
      textColor: "#1c1917",
    },
    {
      id: "big-chef",
      title: "Big Chef",
      href: "/bigchef",
      backgroundImage: "/images/_C3A5493.jpg",
      textColor: "#1c1917",
    },
    {
      id: "rentals",
      title: "Rentals",
      href: "/book/rentals",
      backgroundImage: "/images/_C3A0998.JPG",
      textColor: "#1c1917",
    },
    {
      id: "eazy-freezy",
      title: "Eazy Freezy",
      href: "/products",
      backgroundImage: "/images/chicken-alfredo-lasagna-roll-ups-recipe-4.jpg",
      textColor: "#ff7f5c",
    },
  ],
  galleryImages: [
    "/images/PHOTO-2025-12-02-18-26-42.jpg",
    "/images/deep dish pizza.jpg",
    "/images/File_017.jpeg.jpg",
  ],
  lifeAtMamaluTitle: "Life at Mamalu",
  ourStoryTitle: "OUR STORY",
  ourStoryParagraph1: "Mamalu Kitchen was inspired by her 3 boys and the need to help fellow mums and families simplify their day-to-day lives without having to worry about feeding their family fuss-free healthy food.",
  ourStoryParagraph2: "Mamalu Kitchen is creating a cooking movement under the slogan #feedingfamilies.",
  ourStoryButtonText: "Our Story",
  founderImage: "/images/IMG_4756_edited.jpg",
  founderName: "Lama - Founder of Mamalu Kitchen",
  stats: [
    { value: "2000+", label: "Happy Kids" },
    { value: "500+", label: "Classes Held" },
    { value: "4.9", label: "Star Rating" },
    { value: "5+", label: "Years Experience" },
  ],
};

export const defaultAboutContent: AboutPageContent = {
  pageTitle: "About Mamalu",
  founderImage1: "/images/founder-lama.jpg",
  founderImage1Alt: "Lama - Founder of Mamalu Kitchen",
  founderImage2: "/images/Lama_Jammal_pic.jpeg",
  founderImage2Alt: "Lama cooking",
  section1Paragraphs: [
    "The first concept launched under the Mamalu Kitchen brand in 2016 was all cooking classes for nanny's and housekeepers. With recipes in their native language from traditional Arabic cuisine to how to cook for the ultimate dinner party!",
    "That was shortly followed by cooking classes for mums/children, schools, couples, corporations & even husbands who also wanted to learn how to create delicious all natural food for their families.",
    "Mamalu Kitchen is creating a cooking movement under the slogan #feedingfamilies.",
    "In line with her cooking movement in 2020 she started Eazy Freezy, it is all natural, easy to cook frozen food products for families on the go. Hassle free yumminess without the bad stuff. The products are available online and across Spinneys & Waitrose outlets all over the UAE.",
    "By engaging every single member of the household/family and various members of the community, to be involved and empowered by cooking, Mamalu Kitchen is enabling a lifestyle change in the region. This 'cooking movement' is leading families to live a healthier and happier life.",
  ],
  feedingFamiliesTitle: '"Feeding Families"',
  feedingFamiliesSubtitle: '"We are creating a cooking movement!"',
  section2Paragraphs: [
    "Raised between Lebanon and the UK, Lama has always had a passion for cooking since the age of 4. By shadowing her mother from a young age, she acquired the knowledge of all of the classic Arabic dishes. Her specialty is family food - large, beautiful mouthwatering dishes with a strong Mediterranean influence to be shared amongst friends and family.",
    "Her love of cooking lead her to study in Glion Hotel School, Switzerland and earn a Hospitality & Tourism degree and gain experience with some of the top 5 star luxury hotel groups such as Four Seasons, Rocco Forte and Hyatt hotels in London, Paris and Rome.",
    "Mamalu Kitchen is not Lama's first entrepreneurial venture, she has had over a decade of experience in the fashion industry under her independent private label. She has opened two concept stores in Beirut, Lebanon {Ribbon & Lace and Birdcage} She has also been a part of the prestigious London & Paris Fashion weeks for 7 consecutive years and has extensive experience as a designer for high end clothing brand, Mojo World.",
    "She is also a proud mother of three boys (at one time all 3 of them were under 2 years old) and they have inspired her to launch Mamalu Kitchen less than 4 months after her twins were born.",
  ],
};

export const defaultMiniChefContent: MiniChefPageContent = {
  pageTitle: "MINI CHEF",
  pageSubtitle: "Fun cooking experiences for little chefs",
  headerImage: "/images/apron.png",
  headerIcon: "/images/girl-01.png",
  categoryIcons: {
    classics: "/icons/boy.png",
    monthly: "/icons/girl.png",
    mommy_me: "/icons/boy.png",
    birthdays: "/icons/girl.png",
    packages: "/icons/boy.png",
  },
};

export const defaultBigChefContent: BigChefPageContent = {
  pageTitle: "BIG CHEF",
  pageSubtitle: "Professional cooking experiences for adults",
  headerImage: "/images/whisk-01.png",
  headerIcon: "/images/knives-01.png",
  categoryIcons: {
    corporate: "/icons/knives.png",
    classics: "/icons/whisk.png",
    monthly: "/icons/knives.png",
    teenagers: "/icons/whisk.png",
    nanny: "/icons/knives.png",
  },
};

export const defaultRentalsContent: RentalsPageContent = {
  pageTitle: "KITCHEN STUDIO RENTAL",
  pageSubtitle: "Rent our fully-equipped professional kitchen for your cooking sessions, content creation, private events, or corporate team building.",
  heroImage: "/images/_C3A0998.JPG",
  headerIcon: "/image-updates/kitchen-03.png",
  rentalOptions: [
    {
      id: "full-day",
      name: "Full Day Rental",
      duration: "8 hours",
      price: 5000,
      description: "Complete access to our professional kitchen studio for a full day of cooking, filming, or events.",
      icon: "/image-updates/kitchen-01.png",
    },
    {
      id: "half-day",
      name: "Half Day Rental",
      duration: "4 hours",
      price: 2500,
      description: "Perfect for shorter sessions, workshops, or intimate cooking events.",
      icon: "/image-updates/kitchen-02.png",
    },
  ],
  addOns: [
    {
      id: "cleaning",
      name: "Cleaning Service",
      price: 300,
      description: "Professional deep cleaning after your session",
      icon: "🧹",
    },
  ],
  galleryImages: [
    "/kitchen-photos/WhatsApp Image 2022-08-01 at 11.23.42 AM.jpeg",
    "/kitchen-photos/WhatsApp Image 2022-08-01 at 11.23.44 AM-2.jpeg",
    "/kitchen-photos/WhatsApp Image 2022-08-01 at 11.23.44 AM.jpeg",
    "/kitchen-photos/WhatsApp Image 2022-08-01 at 11.23.45 AM.jpeg",
    "/kitchen-photos/_C3A0991.JPG",
    "/kitchen-photos/_C3A0993.JPG",
    "/kitchen-photos/_C3A0995.JPG",
    "/kitchen-photos/_C3A0997.JPG",
    "/kitchen-photos/_C3A0998.JPG",
    "/kitchen-photos/_C3A1001.JPG",
  ],
  features: [
    "Professional kitchen equipment",
    "Multiple cooking stations",
    "Air-conditioned space",
    "WiFi access",
    "Parking available",
  ],
};

export const defaultFooterContent: FooterContent = {
  logo: "/images/mamalu-logo.png",
  tagline: "Feeding Families",
  description: "Mamalu Kitchen is creating a cooking movement to help families eat healthier and live happier lives.",
  contactEmail: "info@mamalukitchen.com",
  contactPhone: "+971 50 123 4567",
  address: "Dubai, United Arab Emirates",
  navigationLinks: [
    { id: "home", label: "Home", href: "/" },
    { id: "about", label: "About", href: "/about" },
    { id: "minichef", label: "Mini Chef", href: "/minichef" },
    { id: "bigchef", label: "Big Chef", href: "/bigchef" },
    { id: "rentals", label: "Rentals", href: "/book/rentals" },
    { id: "products", label: "Eazy Freezy", href: "/products" },
  ],
  socialLinks: [
    { id: "instagram", platform: "Instagram", url: "https://instagram.com/mamalukitchen", icon: "instagram" },
    { id: "facebook", platform: "Facebook", url: "https://facebook.com/mamalukitchen", icon: "facebook" },
    { id: "whatsapp", platform: "WhatsApp", url: "https://wa.me/971501234567", icon: "message-circle" },
  ],
  copyrightText: "© 2026 Mamalu Kitchen. All rights reserved.",
  newsletterEnabled: true,
  newsletterTitle: "Join Our Community",
  newsletterDescription: "Get the latest recipes, cooking tips, and class updates delivered to your inbox.",
};
