"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Calendar, CheckCircle2, Clock, AlertCircle, 
  MessageSquare, GitCommit, Mail, Video, 
  ChevronDown, ChevronRight, FileText, Users,
  Package, CreditCard, Database, Globe,
  Smartphone, Image as ImageIcon, Palette, Settings
} from "lucide-react";

// Type Definitions
interface DeliverableItem {
  name: string;
  status: string;
  completion: number;
  note?: string;
}

interface DeliverableCategory {
  category: string;
  items: DeliverableItem[];
}

// Timeline Events Data
const timelineEvents = [
  // December 2025 - Project Inception
  {
    date: "2025-12-05",
    type: "git",
    title: "Project Inception",
    description: "Initial commit - Mamalu Kitchen Platform setup with Sanity CMS, Supabase, Admin Portal",
    commits: ["02db302", "9732bbc"],
    category: "foundation"
  },
  {
    date: "2025-12-08",
    type: "git",
    title: "Booking System Core",
    description: "Complete booking system with Stripe payments, cash payments, receipts, invoicing, group booking",
    commits: ["9c31b32", "2b1ab2d", "cbc9f90", "5419eba", "e805c48", "3a7d5d8", "1c28d1b"],
    category: "booking"
  },
  {
    date: "2025-12-09",
    type: "git",
    title: "Payment Links System",
    description: "Custom payment links system with technical documentation",
    commits: ["22ce88a"],
    category: "payments"
  },
  {
    date: "2025-12-10",
    type: "git",
    title: "Payment & PDF Features",
    description: "PDF export, Stripe verification, digital waiver signing, payment tracking",
    commits: ["83f6b26", "19cc026", "72232f8", "c3e08de", "39fd424", "4be5b69", "8eee140", "b5575b3"],
    category: "payments"
  },
  {
    date: "2025-12-11",
    type: "email",
    title: "📧 Website Pictures Email",
    description: "Client (Ishika) sent Google Drive link with website images",
    source: "info@mamalukitchen.com",
    category: "assets"
  },
  {
    date: "2025-12-17",
    type: "git",
    title: "WhatsApp Monitoring System",
    description: "Secure payment links API and WhatsApp cash monitoring implementation",
    commits: ["042be64"],
    category: "automation"
  },
  {
    date: "2025-12-18",
    type: "git",
    title: "Marketing System & Email Builder",
    description: "Full marketing system with email campaigns, discounts, referrals, Unlayer drag-and-drop email builder",
    commits: ["b246a24", "16a5069", "8902812"],
    category: "marketing"
  },
  {
    date: "2025-12-19",
    type: "git",
    title: "Major UI/UX Overhaul",
    description: "Homepage redesign, shop UI, peach color scheme, Sanity integration, video player, mobile improvements",
    commits: ["f25aeeb", "0755b6f", "78e75c8", "30857c3", "e3cdfad", "b7c1c16", "5426267", "ccf4d18", "7cf3e52", "c3a53be", "1e37bde"],
    category: "design"
  },
  
  // January 2026 - WhatsApp Group Created
  {
    date: "2026-01-01",
    type: "whatsapp",
    title: "📱 WhatsApp Group Created",
    description: "Lama created 'MamaLu automation' group, added Wilson and team",
    category: "communication"
  },
  {
    date: "2026-01-12",
    type: "git",
    title: "Glass Morphism UI Redesign",
    description: "Modern glass morphism design, mega menu, global search, multi-person payment links, QR codes",
    commits: ["49106f1", "fc26305", "ce4722e", "a5461a5", "74cf064", "5803a65"],
    category: "design"
  },
  {
    date: "2026-01-14",
    type: "whatsapp",
    title: "📱 Payment Link Feedback",
    description: "Robby reported difficulty adding extras to payment links. Need total pricing with extras and more than 10 pax support.",
    hasMedia: true,
    mediaFile: "IMG-20260114-WA0014.jpg",
    category: "feedback"
  },
  {
    date: "2026-01-20",
    type: "whatsapp",
    title: "📱 Lama Requests Progress Update",
    description: "Lama asked for timeline on readiness. Wilson confirmed fixes were done.",
    category: "communication"
  },
  {
    date: "2026-01-21",
    type: "whatsapp",
    title: "📱 Phone Contacts Migration",
    description: "Helped Robby migrate contacts from old iPhone to new phone using Easy Backup app",
    hasMedia: true,
    mediaFile: "IMG-20260121-WA0001.jpg",
    category: "support"
  },
  {
    date: "2026-01-27",
    type: "whatsapp",
    title: "📱 Urgency on Booking System",
    description: "Lama: 'Guys pls we're very late on booking system. We really need this and WhatsApp asap'",
    category: "communication"
  },
  {
    date: "2026-01-29",
    type: "email",
    title: "📧 Inquiry for Automation",
    description: "Robert sent 12 attachments: Nanny Course, Birthday, Corporate decks, Walk-in Menus, Management Reports, Sales Records",
    source: "robert@mamalukitchen.com",
    attachments: ["Nanny Course.pdf", "Birthday New.pdf", "Corporate Deck New.pdf", "Walk in Menus-2.pdf", "MANAGEMENT REPORT.pdf"],
    category: "requirements"
  },
  {
    date: "2026-01-29",
    type: "whatsapp",
    title: "📱 System Requirements Discussed",
    description: "Lama outlined: Kids/Adults categories, Reports (Depachika, Bestsellers, Monthly), CRM by client categories, Cashless solution",
    category: "requirements"
  },
  
  // February 2026
  {
    date: "2026-02-02",
    type: "email",
    title: "📧 Customer Database Shared",
    description: "Roberto sent Customer Database.xlsx with contact details link",
    source: "robert@mamalukitchen.com",
    attachments: ["Customer Database.xlsx"],
    category: "data"
  },
  {
    date: "2026-02-02",
    type: "whatsapp",
    title: "📱 Booking System Demo",
    description: "Wilson shared booking page for review. Robby asked about time allocation for prep/setup between classes.",
    category: "development"
  },
  {
    date: "2026-02-03",
    type: "git",
    title: "Booking Prep Time Implementation",
    description: "Added 1-hour buffer time between events, visual time slot grid, availability checking",
    commits: ["Multiple booking system updates"],
    category: "booking"
  },
  {
    date: "2026-02-06",
    type: "whatsapp",
    title: "📱 System Demo Ready",
    description: "Wilson: 'The system is done. We can set a time to meet for the demo and training.' 700+ leads uploaded.",
    category: "milestone"
  },
  {
    date: "2026-02-06",
    type: "git",
    title: "Lead Management System",
    description: "Excel upload, bulk import, lead tracking, 3136 leads uploaded with duplicates merged",
    commits: ["6a8d29e", "6180435", "f725577", "0350b76"],
    hasMedia: true,
    mediaFile: "IMG-20260209-WA0000.jpg",
    category: "crm"
  },
  {
    date: "2026-02-10",
    type: "whatsapp",
    title: "📱 Booking System Notes Received",
    description: "Robby sent Booking System Notes.xlsx. Pending: FAQs, Waiver, Walk-in Final Menu",
    category: "requirements"
  },
  {
    date: "2026-02-13",
    type: "whatsapp",
    title: "📱 All Changes Implemented",
    description: "Wilson: 'All Booking System Notes changes implemented and deployed. 4822 total leads after matching duplicates.'",
    category: "milestone"
  },
  {
    date: "2026-02-13",
    type: "git",
    title: "Menu Data Verified",
    description: "12 Mini Chef birthday menus, 7 Corporate/Private menus, 18 Nanny Class menus, all extras verified",
    commits: ["Menu verification"],
    category: "content"
  },
  {
    date: "2026-02-26",
    type: "email",
    title: "📧 Graphics Assets Sent",
    description: "Robert sent 20 graphic attachments: arrows, flames, gloves, knives, pots, recipe icons, turkey, whisk",
    source: "robert@mamalukitchen.com",
    attachments: ["arrow 2-01.png", "flames.png", "gloves-01.png", "knives-01-01.png", "pot-01.png", "recipe-01.png", "whisk-01.png"],
    category: "assets"
  },
  {
    date: "2026-02-27",
    type: "email",
    title: "📧 Graphics Design Files",
    description: "Robert sent wall artwork PDF files for missing graphics extraction",
    source: "robert@mamalukitchen.com",
    attachments: ["extras-mamalu wall.pdf", "wall artwork-mamalu.pdf"],
    category: "assets"
  },
  {
    date: "2026-02-28",
    type: "email",
    title: "📧 Data Allocation Sources",
    description: "Robert sent contact lists from Wix and Mailchimp for database consolidation",
    source: "robert@mamalukitchen.com",
    attachments: ["contacts-2.csv", "subscribed_email_audience.csv", "unsubscribed_email_audience.csv"],
    category: "data"
  },
  
  // March 2026
  {
    date: "2026-03-01",
    type: "whatsapp",
    title: "📱 Icons & Database Updated",
    description: "Wilson: 'Icons updated, database updated.' Robby shared updated regular clients database.",
    category: "development"
  },
  {
    date: "2026-03-02",
    type: "whatsapp",
    title: "📱 Website Review Meeting",
    description: "Google Meet held. 11 change items listed: fonts, alignment, category organization, Eazy Freezy button, vouchers, press page",
    category: "meeting"
  },
  {
    date: "2026-03-04",
    type: "email",
    title: "📧 Adobe Illustrator Newsletters",
    description: "Robert sent 6 newsletter AI files for icon extraction",
    source: "robert@mamalukitchen.com",
    attachments: ["March schedule 2023.ai", "January 2026 Newsletter.ai", "July newsletter 2022.ai"],
    category: "assets"
  },
  {
    date: "2026-03-06",
    type: "whatsapp",
    title: "📱 Final Adjustments Request",
    description: "Robby requested zoom call for final website adjustments. Wilson confirmed completion within one week.",
    category: "communication"
  },
  {
    date: "2026-03-09",
    type: "meeting",
    title: "🎥 Major Revision Meeting",
    description: "Key decisions: Menu hide on scroll, 4 circles on homepage, pink highlights, hide order summary, animated icons, Packages group",
    category: "meeting",
    decisions: [
      "Menu disappears on scroll down, appears on scroll up",
      "Homepage circles: 3 → 4 items (add Eazy Freezy)",
      "Clicked links highlight in pink",
      "Hide order summary at checkout",
      "Animated icons: boy/girl for Mini Chef, knife/whisk for Big Chef",
      "Add Teenager course and Packages group to Big Chef",
      "One-week deadline for all changes"
    ]
  },
  {
    date: "2026-03-10",
    type: "whatsapp",
    title: "📱 Changes Implemented",
    description: "Wilson: 'Hi everyone i have made the requested changes apart from the items that need pending assets'",
    category: "development"
  },
  {
    date: "2026-03-10",
    type: "git",
    title: "March 9 Meeting Changes",
    description: "Scroll-based menu, 4 homepage circles, pink highlights, order summary hidden, animated icons",
    commits: ["Header scroll behavior", "Homepage layout", "Pink highlights", "Order summary hidden", "Animated icons"],
    category: "design"
  },
  {
    date: "2026-03-16",
    type: "email",
    title: "📧 Updated Photos Shared",
    description: "Robert sent 5 Google Drive folders with updated website photos organized by category",
    source: "robert@mamalukitchen.com",
    category: "assets"
  },
  {
    date: "2026-03-17",
    type: "whatsapp",
    title: "📱 Asset Gathering Follow-up",
    description: "Corrine followed up on requirements. Robby confirmed images were sent, would finalize remaining items.",
    category: "communication"
  },
  {
    date: "2026-03-23",
    type: "whatsapp",
    title: "📱 Post-Eid Check-in",
    description: "Outstanding items: Press images, Icons, Videos, April Newsletter. WhatsApp Business pending 4 months.",
    category: "communication"
  },
  {
    date: "2026-03-29",
    type: "whatsapp",
    title: "📱 Final Training Request",
    description: "Robby: 'Please are we good to go with the changes and discuss it to have the final training'",
    category: "communication"
  },
  {
    date: "2026-03-30",
    type: "whatsapp",
    title: "📱 Additional Images Shared",
    description: "Robby shared another Google Drive folder with images. Training scheduled for following week.",
    category: "assets"
  },
  
  // April 2026
  {
    date: "2026-04-01",
    type: "whatsapp",
    title: "📱 Missing Assets Identified",
    description: "Corrine listed missing assets. Robby confirmed would resend Adobe Illustrator files and videos.",
    category: "communication"
  },
  {
    date: "2026-04-02",
    type: "git",
    title: "WhatsApp Server Improvements",
    description: "Railway-compatible WhatsApp server with Dockerfile, Puppeteer support",
    commits: ["ffcba72"],
    category: "automation"
  },
  {
    date: "2026-04-03",
    type: "git",
    title: "Sales Reporting System",
    description: "Management Report tab, Depachika Report, Daily breakdown, Top sellers, Excel export",
    commits: ["3446128"],
    category: "reporting"
  },
  {
    date: "2026-04-14",
    type: "whatsapp",
    title: "⚠️ Client Escalation",
    description: "Lama: 'This is unacceptable. We are more 3 months overdue. If you cannot do this by end of week I would like a refund'",
    category: "escalation"
  },
  {
    date: "2026-04-14",
    type: "whatsapp",
    title: "📱 Clarification & Status",
    description: "Wilson: 'We have finished all requested changes. The booking system is fully functional.' Training offered any afternoon.",
    category: "communication"
  },
  {
    date: "2026-04-15",
    type: "whatsapp",
    title: "📱 Newsletter Section Removed",
    description: "Robby: 'This section we will not need anymore as we dont have the newsletter anymore'",
    hasMedia: true,
    mediaFile: "IMG-20260415-WA0005.jpg",
    category: "requirements"
  },
  {
    date: "2026-04-15",
    type: "git",
    title: "Newsletter Section Removed",
    description: "Section removed per client request, images updated",
    commits: ["Newsletter removal"],
    category: "design"
  },
  {
    date: "2026-04-16",
    type: "whatsapp",
    title: "📱 Website Layout Feedback",
    description: "Robby: 'The overall look of our current website is much better than what we are developing.' Request to match old site layout.",
    category: "feedback"
  },
  {
    date: "2026-04-16",
    type: "git",
    title: "Layout Adjustments",
    description: "Packages moved to Mini Chef, video placement fixed, address updated to Palm Jumeirah Mall",
    commits: ["Layout fixes"],
    category: "design"
  },
  {
    date: "2026-04-21",
    type: "whatsapp",
    title: "📱 Alignment Meeting",
    description: "Corrine met with Robby. 15 change items documented including photos, videos, icons, packages, monthly specials.",
    category: "meeting",
    decisions: [
      "Big chef photo change",
      "Photos/videos seamless play",
      "Packages follow Excel",
      "Top buttons peach color",
      "Mini chef: boy/girl alternating icons",
      "Big chef: knife/whisk alternating",
      "Human images centered",
      "Monthly specials removed per client request"
    ]
  },
  {
    date: "2026-04-27",
    type: "whatsapp",
    title: "📱 Final Polishing",
    description: "Corrine: 'We're just polishing a few other requested changes left.'",
    category: "development"
  },
  {
    date: "2026-04-27",
    type: "git",
    title: "Voucher System Implementation",
    description: "Full voucher system with purchase flow, admin management, confirmation emails",
    commits: ["Voucher system"],
    category: "ecommerce"
  },
  {
    date: "2026-04-28",
    type: "git",
    title: "Site Content Management",
    description: "Dynamic site content system, image slider, video gallery components",
    commits: ["Site content"],
    category: "cms"
  },
  {
    date: "2026-04-30",
    type: "whatsapp",
    title: "📱 Training Scheduled",
    description: "Meeting confirmed for May 1st at 2 PM for final walkthrough and training.",
    category: "communication"
  },
  
  // May 2026
  {
    date: "2026-05-06",
    type: "git",
    title: "Hero Slider & Eazy Freezy Update",
    description: "Updated Eazy Freezy image, expanded hero slider with 13 professional photos",
    commits: ["9fc0f07"],
    category: "design"
  },
  {
    date: "2026-05-06",
    type: "whatsapp",
    title: "📱 Monthly Specials Removed",
    description: "Client requested removal of monthly specials feature from the website scope.",
    category: "requirements"
  }
];

// SOW Deliverables
const sowDeliverables: DeliverableCategory[] = [
  {
    category: "Website Development",
    items: [
      { name: "Modern responsive website design", status: "completed", completion: 100 },
      { name: "Homepage with hero slider", status: "completed", completion: 100 },
      { name: "Mini Chef booking page", status: "completed", completion: 100 },
      { name: "Big Chef booking page", status: "completed", completion: 100 },
      { name: "Kitchen Rentals page", status: "completed", completion: 100 },
      { name: "Eazy Freezy Shop (E-commerce)", status: "completed", completion: 100 },
      { name: "Blog/Recipes section", status: "completed", completion: 100 },
      { name: "Press page", status: "completed", completion: 100 },
      { name: "Contact page", status: "completed", completion: 100 },
      { name: "About/Our Story page", status: "completed", completion: 100 },
    ]
  },
  {
    category: "Booking System",
    items: [
      { name: "Time slot management", status: "completed", completion: 100 },
      { name: "Buffer time between events (1 hour)", status: "completed", completion: 100 },
      { name: "Multi-guest booking support", status: "completed", completion: 100 },
      { name: "Digital waiver signing", status: "completed", completion: 100 },
      { name: "QR code tickets", status: "completed", completion: 100 },
      { name: "Email confirmations", status: "completed", completion: 100 },
      { name: "Calendar integration", status: "completed", completion: 100 },
    ]
  },
  {
    category: "Payment System",
    items: [
      { name: "Stripe integration", status: "completed", completion: 100 },
      { name: "Custom payment links", status: "completed", completion: 100 },
      { name: "Per-person pricing", status: "completed", completion: 100 },
      { name: "Invoice generation", status: "completed", completion: 100 },
      { name: "PDF export", status: "completed", completion: 100 },
      { name: "Payment tracking", status: "completed", completion: 100 },
    ]
  },
  {
    category: "CRM & Lead Management",
    items: [
      { name: "Lead database (4800+ leads imported)", status: "completed", completion: 100 },
      { name: "Excel/CSV import", status: "completed", completion: 100 },
      { name: "Lead categorization", status: "completed", completion: 100 },
      { name: "Lead tracking & notes", status: "completed", completion: 100 },
      { name: "Duplicate merging", status: "completed", completion: 100 },
    ]
  },
  {
    category: "Reporting & Analytics",
    items: [
      { name: "Management reports", status: "completed", completion: 100 },
      { name: "Depachika reports", status: "completed", completion: 100 },
      { name: "Daily sales breakdown", status: "completed", completion: 100 },
      { name: "Top sellers report", status: "completed", completion: 100 },
      { name: "Excel export", status: "completed", completion: 100 },
    ]
  },
  {
    category: "Admin Portal",
    items: [
      { name: "User management", status: "completed", completion: 100 },
      { name: "Booking management", status: "completed", completion: 100 },
      { name: "Payment links management", status: "completed", completion: 100 },
      { name: "Content management (Sanity CMS)", status: "completed", completion: 100 },
      { name: "Email builder (Unlayer)", status: "completed", completion: 100 },
    ]
  },
  {
    category: "March 9 Meeting Requirements",
    items: [
      { name: "Menu hide on scroll down/show on scroll up", status: "completed", completion: 100 },
      { name: "Homepage 4 circles (Mini Chef, Big Chef, Rentals, Eazy Freezy)", status: "completed", completion: 100 },
      { name: "Pink highlight on clicked links", status: "completed", completion: 100 },
      { name: "Hide order summary at checkout", status: "completed", completion: 100 },
      { name: "Animated icons (boy/girl for Mini Chef)", status: "completed", completion: 100 },
      { name: "Animated icons (knife/whisk for Big Chef)", status: "completed", completion: 100 },
      { name: "Teenager course added", status: "completed", completion: 100 },
      { name: "Packages group added to Big Chef", status: "completed", completion: 100 },
    ]
  },
  {
    category: "April 21 Meeting Requirements",
    items: [
      { name: "Photos/videos seamless play", status: "completed", completion: 100 },
      { name: "Packages follow Excel structure", status: "completed", completion: 100 },
      { name: "Top buttons peach color", status: "completed", completion: 100 },
      { name: "Alternating boy/girl icons Mini Chef", status: "completed", completion: 100 },
      { name: "Alternating knife/whisk icons Big Chef", status: "completed", completion: 100 },
      { name: "Newsletter section removed", status: "completed", completion: 100 },
      { name: "Address updated to Palm Jumeirah Mall", status: "completed", completion: 100 },
      { name: "TikTok link integrated", status: "completed", completion: 100 },
    ]
  },
  {
    category: "Pending/Awaiting Client",
    items: [
      { name: "WhatsApp Business integration", status: "blocked", completion: 0, note: "Client needs 4 months to process" },
      { name: "Final training session", status: "in_progress", completion: 80, note: "Scheduled" },
    ]
  }
];

// Calculate overall completion
const calculateCompletion = () => {
  let totalItems = 0;
  let completedItems = 0;
  let totalCompletion = 0;
  
  sowDeliverables.forEach(category => {
    category.items.forEach(item => {
      totalItems++;
      totalCompletion += item.completion;
      if (item.status === "completed") completedItems++;
    });
  });
  
  return {
    totalItems,
    completedItems,
    percentage: Math.round(totalCompletion / totalItems),
    blockedItems: sowDeliverables.flatMap(c => c.items).filter(i => i.status === "blocked").length,
    pendingItems: sowDeliverables.flatMap(c => c.items).filter(i => i.status === "pending" || i.status === "in_progress").length
  };
};

// Git Statistics
const gitStats = {
  totalCommits: 223,
  firstCommit: "2025-12-05",
  lastCommit: "2026-05-06",
  majorFeatures: [
    "Booking System with Stripe",
    "CRM & Lead Management",
    "Payment Links System",
    "Admin Portal",
    "Email Builder",
    "WhatsApp Monitoring",
    "Voucher System",
    "Sales Reporting"
  ]
};

// Email Timeline
const emailTimeline = [
  { date: "2025-12-11", subject: "WEBSITE PICTURES", from: "Ishika", type: "assets" },
  { date: "2026-01-29", subject: "INQUIRY FOR AUTOMATION", from: "Robert", type: "requirements", attachments: 12 },
  { date: "2026-02-02", subject: "DATA BASE", from: "Roberto", type: "data", attachments: 3 },
  { date: "2026-02-26", subject: "GRAPHICS", from: "Robert", type: "assets", attachments: 20 },
  { date: "2026-02-27", subject: "Graphics design", from: "Robert", type: "assets", attachments: 2 },
  { date: "2026-02-28", subject: "data base", from: "Robert", type: "data", attachments: 5 },
  { date: "2026-03-04", subject: "Adobe Illustrator of the Newsletters", from: "Robert", type: "assets", attachments: 6 },
  { date: "2026-03-16", subject: "(No Subject)", from: "Robert", type: "assets", links: 5 },
];

export default function RequestHistoryPage() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Website Development", "March 9 Meeting Requirements"]);
  const [activeTab, setActiveTab] = useState<"timeline" | "deliverables" | "stats">("timeline");
  const [filterType, setFilterType] = useState<string>("all");
  
  const completion = calculateCompletion();
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const filteredEvents = filterType === "all" 
    ? timelineEvents 
    : timelineEvents.filter(e => e.type === filterType);
  
  const getTypeIcon = (type: string) => {
    switch(type) {
      case "git": return <GitCommit className="h-5 w-5 text-gray-500" />;
      case "whatsapp": return <MessageSquare className="h-5 w-5 text-gray-500" />;
      case "email": return <Mail className="h-5 w-5 text-gray-500" />;
      case "meeting": return <Video className="h-5 w-5 text-gray-500" />;
      default: return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "completed":
        return <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-full">✓ Completed</span>;
      case "in_progress":
        return <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-full">⏳ In Progress</span>;
      case "pending":
        return <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-full">⏸ Pending</span>;
      case "blocked":
        return <span className="px-2 py-1 text-xs font-bold bg-gray-200 text-gray-500 rounded-full">🚫 Blocked</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/graphics/mamalu-logo-transparent.png" alt="Mamalu" width={80} height={80} />
              <span className="font-bold text-xl" style={{ fontFamily: 'var(--font-mossy)' }}>Mamalu Kitchen</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mossy)' }}>
              Project Request History
            </h1>
          </div>
        </div>
      </header>
      
      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-8 w-8 text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">{completion.percentage}%</span>
            </div>
            <p className="text-gray-600 font-medium">Overall Completion</p>
            <p className="text-sm text-gray-500">{completion.completedItems}/{completion.totalItems} items</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <GitCommit className="h-8 w-8 text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">{gitStats.totalCommits}</span>
            </div>
            <p className="text-gray-600 font-medium">Git Commits</p>
            <p className="text-sm text-gray-500">Dec 5 - May 6</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-8 w-8 text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">401</span>
            </div>
            <p className="text-gray-600 font-medium">WhatsApp Messages</p>
            <p className="text-sm text-gray-500">Jan 1 - Apr 30</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-8 w-8 text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">{emailTimeline.length}</span>
            </div>
            <p className="text-gray-600 font-medium">Key Emails</p>
            <p className="text-sm text-gray-500">Assets & Requirements</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold mb-4">Project Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div 
              className="bg-gray-800 h-full rounded-full transition-all duration-1000 flex items-center justify-center"
              style={{ width: `${completion.percentage}%` }}
            >
              <span className="text-white text-sm font-bold">{completion.percentage}%</span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>✓ {completion.completedItems} Completed</span>
            <span>⏳ {completion.pendingItems} Pending</span>
            <span>🚫 {completion.blockedItems} Blocked (Client dependency)</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab("timeline")}
            className={`px-6 py-3 rounded-xl font-bold transition-all border ${activeTab === "timeline" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
          >
            📅 Timeline
          </button>
          <button 
            onClick={() => setActiveTab("deliverables")}
            className={`px-6 py-3 rounded-xl font-bold transition-all border ${activeTab === "deliverables" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
          >
            ✅ Deliverables
          </button>
          <button 
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-3 rounded-xl font-bold transition-all border ${activeTab === "stats" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
          >
            📊 Statistics
          </button>
        </div>
        
        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div>
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["all", "git", "whatsapp", "email", "meeting"].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all border ${filterType === type ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                >
                  {type === "all" && "All Events"}
                  {type === "git" && "🔀 Git Commits"}
                  {type === "whatsapp" && "📱 WhatsApp"}
                  {type === "email" && "📧 Emails"}
                  {type === "meeting" && "🎥 Meetings"}
                </button>
              ))}
            </div>
            
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {filteredEvents.map((event, idx) => (
                <div key={idx} className="relative pl-20 pb-8">
                  <div className="absolute left-6 w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                    {getTypeIcon(event.type)}
                  </div>
                  
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-500">{event.date}</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        event.type === "git" ? "bg-gray-100 text-gray-700" :
                        event.type === "whatsapp" ? "bg-gray-100 text-gray-700" :
                        event.type === "email" ? "bg-gray-100 text-gray-700" :
                        event.type === "meeting" ? "bg-gray-100 text-gray-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {event.type.toUpperCase()}
                      </span>
                      {event.category && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {event.category}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                    <p className="text-gray-600">{event.description}</p>
                    
                    {event.commits && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {event.commits.slice(0, 5).map((commit, i) => (
                          <code key={i} className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                            {commit}
                          </code>
                        ))}
                        {event.commits.length > 5 && (
                          <span className="text-xs text-gray-500">+{event.commits.length - 5} more</span>
                        )}
                      </div>
                    )}
                    
                    {event.decisions && (
                      <ul className="mt-3 space-y-1">
                        {event.decisions.map((decision, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            {decision}
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {event.hasMedia && event.mediaFile && (
                      <div className="mt-3">
                        <Image 
                          src={`/request-history/${event.mediaFile}`}
                          alt="Media"
                          width={200}
                          height={150}
                          className="rounded-lg border"
                        />
                      </div>
                    )}
                    
                    {event.source && (
                      <p className="mt-2 text-sm text-gray-500">From: {event.source}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Deliverables Tab */}
        {activeTab === "deliverables" && (
          <div className="space-y-4">
            {sowDeliverables.map((category, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-md overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {expandedCategories.includes(category.category) ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    )}
                    <span className="text-lg font-bold text-gray-900">{category.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      {category.items.filter(i => i.status === "completed").length}/{category.items.length}
                    </span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-600 h-2 rounded-full"
                        style={{ width: `${(category.items.filter(i => i.status === "completed").length / category.items.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </button>
                
                {expandedCategories.includes(category.category) && (
                  <div className="px-6 py-4 border-t">
                    <div className="space-y-3">
                      {category.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            {item.status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-gray-600" />
                            ) : item.status === "blocked" ? (
                              <AlertCircle className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                            <span className={`font-medium ${item.status === "completed" ? "text-gray-900" : "text-gray-600"}`}>
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {"note" in item && item.note && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {item.note}
                              </span>
                            )}
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Statistics Tab */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Git Stats */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <GitCommit className="h-6 w-6 text-gray-600" />
                Development Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-gray-900">Total Commits</span>
                  <span className="font-bold text-lg">{gitStats.totalCommits}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-gray-900">Project Duration</span>
                  <span className="font-bold">5 months</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-gray-900">First Commit</span>
                  <span className="font-mono text-sm font-bold text-gray-900">{gitStats.firstCommit}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-gray-900">Last Commit</span>
                  <span className="font-mono text-sm font-bold text-gray-900">{gitStats.lastCommit}</span>
                </div>
              </div>
              
              <h4 className="font-bold mt-6 mb-3">Major Features Delivered</h4>
              <div className="flex flex-wrap gap-2">
                {gitStats.majorFeatures.map((feature, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-200 text-gray-900 rounded-full text-sm font-bold">
                    ✓ {feature}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Communication Stats */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-gray-600" />
                Communication Timeline
              </h3>
              <div className="space-y-3">
                {emailTimeline.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{email.subject}</p>
                      <p className="text-sm font-semibold text-gray-700">From: {email.from} • {email.date}</p>
                    </div>
                    {email.attachments && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded text-xs font-bold">
                        {email.attachments} files
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Key Milestones */}
            <div className="bg-white rounded-xl p-6 shadow-md md:col-span-2">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-gray-600" />
                Key Project Milestones
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-700 font-bold">Dec 5, 2025</p>
                  <p className="font-bold text-gray-900">Project Kickoff</p>
                  <p className="text-sm text-gray-800 font-medium">Initial platform setup</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-700 font-bold">Feb 6, 2026</p>
                  <p className="font-bold text-gray-900">System Demo Ready</p>
                  <p className="text-sm text-gray-800 font-medium">4822 leads imported</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-700 font-bold">Mar 9, 2026</p>
                  <p className="font-bold text-gray-900">Major Revision Meeting</p>
                  <p className="text-sm text-gray-800 font-medium">Final UI requirements set</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-700 font-bold">Apr 21, 2026</p>
                  <p className="font-bold text-gray-900">Alignment Meeting</p>
                  <p className="text-sm text-gray-800 font-medium">15 final adjustments</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-700 font-bold">Apr 27, 2026</p>
                  <p className="font-bold text-gray-900">Voucher System Live</p>
                  <p className="text-sm text-gray-800 font-medium">E-commerce complete</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-700 font-bold">May 1, 2026</p>
                  <p className="font-bold text-gray-900">Training Scheduled</p>
                  <p className="text-sm text-gray-800 font-medium">Final handover</p>
                </div>
              </div>
            </div>
            
            {/* Media Gallery */}
            <div className="bg-white rounded-xl p-6 shadow-md md:col-span-2">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-gray-600" />
                WhatsApp Media Evidence
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image 
                    src="/request-history/IMG-20260114-WA0014.jpg" 
                    alt="Payment Link UI"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                    Jan 14 - Payment Link UI
                  </div>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image 
                    src="/request-history/IMG-20260121-WA0001.jpg" 
                    alt="Easy Backup"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                    Jan 21 - Phone Migration
                  </div>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image 
                    src="/request-history/IMG-20260209-WA0000.jpg" 
                    alt="Lead Management"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                    Feb 9 - 3136 Leads
                  </div>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image 
                    src="/request-history/IMG-20260415-WA0005.jpg" 
                    alt="Newsletter Section"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                    Apr 15 - Newsletter Removed
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Summary Box */}
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">📋 Project Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">✅ Delivered</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Full website with 10+ pages</li>
                <li>• Booking system with Stripe</li>
                <li>• CRM with 4800+ leads</li>
                <li>• Admin portal & reports</li>
                <li>• Email builder system</li>
                <li>• Voucher/E-commerce</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">⏳ Pending</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Final training session (scheduled)</li>
                <li>• WhatsApp Business (4-month client process)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">📊 Metrics</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• {completion.percentage}% completion rate</li>
                <li>• {gitStats.totalCommits} commits over 5 months</li>
                <li>• 401 WhatsApp messages</li>
                <li>• 8 major email exchanges</li>
                <li>• 2 revision meetings</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Documents Section */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6 text-gray-500" />
            Reference Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/request-history/web_dev_SOW_Mamalu Kitchen.pdf" 
              target="_blank"
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-gray-500" />
              <div>
                <p className="font-bold text-gray-900">Statement of Work</p>
                <p className="text-sm text-gray-500">web_dev_SOW_Mamalu Kitchen.pdf</p>
              </div>
            </a>
            <a 
              href="/request-history/Mutant x MamaluKitchen_MOA.pdf" 
              target="_blank"
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-gray-500" />
              <div>
                <p className="font-bold text-gray-900">Memorandum of Agreement</p>
                <p className="text-sm text-gray-500">Mutant x MamaluKitchen_MOA.pdf</p>
              </div>
            </a>
            <a 
              href="/request-history/WhatsApp Chat with MamaLu automation.txt" 
              target="_blank"
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="h-8 w-8 text-gray-500" />
              <div>
                <p className="font-bold text-gray-900">WhatsApp Chat Log</p>
                <p className="text-sm text-gray-500">401 messages (Jan-Apr 2026)</p>
              </div>
            </a>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Generated on {new Date().toLocaleDateString()} • Data sourced from Git commits, WhatsApp chats, and email correspondence
          </p>
        </div>
      </footer>
    </div>
  );
}
