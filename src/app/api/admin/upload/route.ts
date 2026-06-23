import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const uploadLimits: Record<string, { maxSize: number; contentTypes: string[] }> = {
  images: {
    maxSize: 5 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  },
  videos: {
    maxSize: 50 * 1024 * 1024,
    contentTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  documents: {
    maxSize: 20 * 1024 * 1024,
    contentTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string;
    const userId = formData.get("userId") as string;

    if (!file || !bucket || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const limit = uploadLimits[bucket];
    if (limit) {
      if (!limit.contentTypes.includes(file.type)) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }

      if (file.size > limit.maxSize) {
        return NextResponse.json({ error: "File is too large" }, { status: 413 });
      }
    }

    // Create a unique filename
    const ext = file.name.split(".").pop();
    const filename = `${userId}-${Date.now()}.${ext}`;
    const path = `${filename}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    if (bucket === "documents") {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((item) => item.id === bucket);

      if (!bucketExists) {
        const { error: createBucketError } = await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: uploadLimits.documents.maxSize,
          allowedMimeTypes: uploadLimits.documents.contentTypes,
        });

        if (createBucketError) {
          console.error("Bucket creation error:", createBucketError);
          return NextResponse.json({ error: createBucketError.message }, { status: 500 });
        }
      }
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({ 
      url: publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
