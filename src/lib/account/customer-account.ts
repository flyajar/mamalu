import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCustomerAccountAccessEmail } from "@/lib/email/customer-account-access";

type AccountReason = "booking" | "order" | "voucher";

interface EnsureCustomerAccountParams {
  supabase: SupabaseClient;
  email: string;
  name?: string | null;
  phone?: string | null;
  reason: AccountReason;
}

export async function ensureCustomerAccountAndSendAccess({
  supabase,
  email,
  name,
  phone,
  reason,
}: EnsureCustomerAccountParams): Promise<{ userId?: string; created: boolean; emailSent: boolean; error?: string }> {
  const customerEmail = email.trim().toLowerCase();
  if (!customerEmail) {
    return { created: false, emailSent: false, error: "Customer email is required" };
  }

  try {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", customerEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      await updateProfileDetails(supabase, existingProfile.id, {
        fullName: existingProfile.full_name || name || null,
        phone: phone || null,
      });

      const { success, error } = await sendCustomerAccountAccessEmail({
        customerName: existingProfile.full_name || name || "Customer",
        customerEmail,
        reason,
      });

      return {
        userId: existingProfile.id,
        created: false,
        emailSent: success,
        error,
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name || "",
        phone: phone || "",
      },
    });

    if (authError || !authData.user) {
      console.error("Create customer auth user failed:", authError);
      return { created: false, emailSent: false, error: authError?.message || "Failed to create customer account" };
    }

    await supabase
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: customerEmail,
        full_name: name || customerEmail,
        phone: phone || null,
        role: "customer",
      });

    const { success, error } = await sendCustomerAccountAccessEmail({
      customerName: name || "Customer",
      customerEmail,
      temporaryPassword,
      reason,
    });

    return {
      userId: authData.user.id,
      created: true,
      emailSent: success,
      error,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to prepare customer account";
    console.error("Ensure customer account failed:", error);
    return { created: false, emailSent: false, error: message };
  }
}

async function updateProfileDetails(
  supabase: SupabaseClient,
  id: string,
  details: { fullName?: string | null; phone?: string | null }
) {
  const updates: Record<string, string> = {};
  if (details.fullName) updates.full_name = details.fullName;
  if (details.phone) updates.phone = details.phone;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Update customer profile failed:", error);
  }
}

function generateTemporaryPassword(): string {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `Mamalu-${random}`;
}
