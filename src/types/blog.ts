export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  authorName: string | null;
  category: string | null;
  readTime: number | null;
  publishedAt: string | null;
  featured: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  image_alt: string | null;
  author_name: string | null;
  category: string | null;
  read_time: number | null;
  published_at: string | null;
  featured: boolean | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}
