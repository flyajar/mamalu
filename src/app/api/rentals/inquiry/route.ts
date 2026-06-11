import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";
import { sendAdminNotification } from "@/lib/email/admin-notification";

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const supabase = createServiceClient();
    if (!supabase) throw new Error("Failed to create Supabase client");
    
    const body = await request.json();
    const {
      name,
      email,
      phone,
      date,
      guests,
      timeSlot,
      purpose,
      message,
      rentalOption,
      rentalPrice,
      addOns,
      totalAmount,
    } = body;

    // Create lead in CRM
    const leadData = {
      name,
      email,
      phone,
      source: "website",
      status: "new",
      lead_type: "renter",
      interests: [`Kitchen Studio Rental - ${rentalOption}`],
      notes: `
Rental Type: ${rentalOption}
Rental Price: AED ${rentalPrice}
Preferred Date: ${date}
Time Slot: ${timeSlot || "Not specified"}
Number of Guests: ${guests || "Not specified"}
Purpose: ${purpose || "Not specified"}
Add-ons: ${addOns?.length > 0 ? addOns.join(", ") : "None"}
Total Amount: AED ${totalAmount}
Additional Notes: ${message || "None"}
      `.trim(),
      company: null,
    };

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert(leadData)
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      // Continue even if lead creation fails - we still want to send the email
    }

    await sendAdminNotification(supabase, {
      eventType: "rental_inquiry",
      sourceId: lead?.id,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      title: rentalOption || "Kitchen Studio Rental",
      amount: Number(totalAmount || 0),
      eventDate: date,
      eventTime: timeSlot,
      guestCount: guests ? Number(guests) : null,
      items: Array.isArray(addOns)
        ? addOns.map((addOn: string) => ({ name: addOn }))
        : undefined,
    });

    // Also send confirmation email to customer
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Thank You for Your Inquiry!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #1f2937; font-size: 16px;">Dear ${name},</p>
          
          <p style="color: #4b5563;">
            Thank you for your interest in renting our kitchen studio at Mamalu Kitchen! 
            We have received your inquiry and our team will contact you within 24 hours 
            to confirm availability and finalize your booking.
          </p>
          
          <h2 style="color: #1f2937; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Your Request Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Rental Type:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${rentalOption}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Preferred Date:</td>
              <td style="padding: 8px 0; color: #1f2937;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Time Slot:</td>
              <td style="padding: 8px 0; color: #1f2937;">${timeSlot || "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Estimated Total:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">AED ${totalAmount?.toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Questions?</strong> Feel free to reach out to us via WhatsApp at 
              <a href="https://wa.me/971527479512" style="color: #059669;">+971 52 747 9512</a>
            </p>
          </div>
        </div>
        
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Mamalu Kitchen | Dubai, UAE<br>
            <a href="https://mamalukitchen.com" style="color: #f59e0b;">www.mamalukitchen.com</a>
          </p>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: getEmailFrom(),
        to: [email],
        subject: "Your Kitchen Studio Rental Inquiry - Mamalu Kitchen",
        html: customerEmailHtml,
      });
    } catch (emailError) {
      console.error("Error sending customer confirmation email:", emailError);
    }

    return NextResponse.json({ 
      success: true,
      leadId: lead?.id,
      message: "Rental inquiry submitted successfully" 
    });
  } catch (error) {
    console.error("Error processing rental inquiry:", error);
    return NextResponse.json(
      { error: "Failed to process rental inquiry" },
      { status: 500 }
    );
  }
}
