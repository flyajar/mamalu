export const BOOKING_SLOT_CATEGORIES = [
  { id: "birthday", name: "Kids Birthday", group: "Mini Chef" },
  { id: "packages", name: "Packages", group: "Mini Chef" },
  { id: "classics_mini", name: "Our Classics (Mini Chef)", group: "Mini Chef" },
  { id: "monthly_mini", name: "Monthly Specials (Mini Chef)", group: "Mini Chef" },
  { id: "mommy_me", name: "Mommy & Me", group: "Mini Chef" },
  { id: "corporate", name: "Corporate / Private", group: "Big Chef" },
  { id: "classics_big", name: "Our Classics (Big Chef)", group: "Big Chef" },
  { id: "monthly_big", name: "Monthly Specials (Big Chef)", group: "Big Chef" },
  { id: "teenagers", name: "Teenager Course", group: "Big Chef" },
  { id: "nanny", name: "Nanny Class", group: "Big Chef" },
] as const;

export type BookingSlotCategoryId = typeof BOOKING_SLOT_CATEGORIES[number]["id"];

export const BOOKING_SLOT_CATEGORY_IDS = BOOKING_SLOT_CATEGORIES.map((category) => category.id);

export const DEFAULT_BOOKING_TIME_SLOTS = [
  { start: "11:00", end: "12:30", duration: 90, label: "11:00 AM - 12:30 PM", days: [0, 1, 2, 3, 4, 5, 6] },
  { start: "13:30", end: "15:00", duration: 90, label: "1:30 PM - 3:00 PM", days: [0, 1, 2, 3, 4, 5, 6] },
  { start: "16:00", end: "17:30", duration: 90, label: "4:00 PM - 5:30 PM", days: [0, 1, 2, 3, 4, 5, 6] },
  { start: "18:30", end: "20:00", duration: 90, label: "6:30 PM - 8:00 PM", days: [0, 1, 2, 3, 4, 5, 6] },
  { start: "21:00", end: "22:30", duration: 90, label: "9:00 PM - 10:30 PM", days: [4, 5] },
] as const;

export const DAY_OPTIONS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
] as const;
