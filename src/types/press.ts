export interface PressArticle {
  id: string;
  title: string;
  date: string;
  description: string;
  mediaType?: "article" | "video" | "photo";
  videoSource?: "youtube" | "upload";
  videoUrl?: string | null;
  url: string | null;
  image: string;
  isVideo?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface PressContent {
  articles: PressArticle[];
}

export const defaultPressContent: PressContent = {
  articles: [],
};
