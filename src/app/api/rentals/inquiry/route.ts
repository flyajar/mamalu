import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { getEmailFrom } from "@/lib/email/config";

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

    // Send email notification to info@mamalukitchen.com
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🏠 New Kitchen Studio Rental Request</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Customer Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Name:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email:</td>
              <td style="padding: 8px 0; color: #1f2937;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
              <td style="padding: 8px 0; color: #1f2937;"><a href="tel:${phone}">${phone}</a></td>
            </tr>
          </table>
          
          <h2 style="color: #1f2937; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-top: 30px;">Rental Details</h2>
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
              <td style="padding: 8px 0; color: #6b7280;">Number of Guests:</td>
              <td style="padding: 8px 0; color: #1f2937;">${guests || "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Purpose:</td>
              <td style="padding: 8px 0; color: #1f2937;">${purpose || "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Add-ons:</td>
              <td style="padding: 8px 0; color: #1f2937;">${addOns?.length > 0 ? addOns.join(", ") : "None"}</td>
            </tr>
          </table>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: bold;">
              Total Amount: AED ${totalAmount?.toLocaleString()}
            </p>
          </div>
          
          ${message ? `
          <h2 style="color: #1f2937; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-top: 30px;">Additional Notes</h2>
          <p style="color: #4b5563; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            ${message}
          </p>
          ` : ""}
          
          <div style="margin-top: 30px; padding: 20px; background: #ecfdf5; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #065f46; font-weight: bold;">
              ⏰ Please respond to this inquiry within 24 hours
            </p>
          </div>
        </div>
        
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            This is an automated notification from Mamalu Kitchen booking system.
          </p>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: getEmailFrom(),
        to: ["info@mamalukitchen.com"],
        subject: `🏠 New Kitchen Studio Rental Request - ${name}`,
        html: emailHtml,
        replyTo: email,
      });
    } catch (emailError) {
      console.error("Error sending email notification:", emailError);
      // Don't fail the request if email fails
    }

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
