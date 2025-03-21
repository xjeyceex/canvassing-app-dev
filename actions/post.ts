"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";
import { TicketFormSchema } from "@/utils/zod/schema";

type LoginError = {
  email?: string;
  password?: string;
  form?: string;
};

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function userLogin(
  formData: FormData
): Promise<{ error?: LoginError }> {
  const supabase = await createClient();

  // Validate input data
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = loginSchema.safeParse(data);
  if (!result.success) {
    return {
      error: {
        email: result.error.flatten().fieldErrors.email?.[0],
        password: result.error.flatten().fieldErrors.password?.[0],
      },
    };
  }

  // Attempt login
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    console.error("Login Error:", error.message);
    return {
      error: { form: "Incorrect email or password. Please try again." },
    };
  }

  // Refresh cache and redirect on success
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export const userLogout = async () => {
  const supabase = await createClient();

  const { error: logoutError } = await supabase.auth.signOut();

  if (logoutError) {
    return {
      error: true,
      message: "Failed to logout!",
    };
  }

  revalidatePath("/", "layout");

  // Redirect to the login page
  redirect("/login");
};

export const userRegister = async (formData: FormData) => {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        display_name: data.name,
      },
    },
  });

  if (error) {
    // If error includes "already registered", it means email exists
    if (error.message.toLowerCase().includes("already registered")) {
      return {
        error: true,
        emailError: true,
        message: "Email is already taken",
      };
    }
    return {
      error: true,
      message: error.message,
    };
  }

  revalidatePath("/", "layout");
};

export const updateDisplayName = async (newDisplayName: string) => {
  const supabase = await createClient();

  // Get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return { error: true, message: "Failed to fetch user" };
  }

  const userId = userData.user.id;
  const isGoogleUser = !!userData.user.user_metadata?.provider_id;

  const { error: authError } = await supabase.auth.updateUser({
    data: isGoogleUser
      ? { full_name: newDisplayName, name: newDisplayName }
      : { displayname: newDisplayName },
  });

  if (authError) {
    return { error: true, message: authError.message };
  }

  const { error: dbError } = await supabase
    .from("user_table")
    .update({ user_full_name: newDisplayName })
    .eq("user_id", userId);

  if (dbError) {
    return { error: true, message: dbError.message };
  }

  return { success: true };
};

export const createTicket = async (
  values: z.infer<typeof TicketFormSchema>,
  userId: string
) => {
  const supabase = await createClient();
  const validatedData = TicketFormSchema.parse(values);

  // ✅ Insert ticket first
  const { data: ticket, error: ticketError } = await supabase
    .from("ticket_table")
    .insert({
      ticket_item_name: validatedData.ticketItemName,
      ticket_item_description: validatedData.ticketItemDescription,
      ticket_quantity: validatedData.ticketQuantity,
      ticket_specifications: validatedData.ticketSpecification,
      ticket_notes: validatedData.ticketNotes,
      ticket_created_by: userId,
      ticket_rf_date_received: validatedData.ticketRfDateReceived,
    })
    .select()
    .single();

  if (ticketError) {
    console.log(ticketError);
    return {
      success: false,
      message: "Failed to create ticket",
    };
  }

  const { error: reviewersError } = await supabase
    .from("approval_table")
    .insert(
      validatedData.ticketReviewer.map((reviewerId) => ({
        approval_ticket_id: ticket.ticket_id,
        approval_reviewed_by: reviewerId,
        approval_review_status: "PENDING",
        approval_review_date: new Date(),
      }))
    );

  if (reviewersError) {
    return {
      success: false,
      message: "Failed to assign reviewers",
    };
  }

  // Create notifications for all reviewers
  const { error: notificationError } = await supabase
    .from("notification_table")
    .insert(
      validatedData.ticketReviewer.map((reviewerId) => ({
        notification_user_id: reviewerId,
        notification_message:
          "You've been assigned as a reviewer for this ticket",
        notification_read: false,
        notification_url: `/tickets/${ticket.ticket_id}`,
      }))
    );

  if (notificationError) {
    console.error("Error adding notifications:", notificationError.message);
    return {
      success: false,
      message: "Failed to add notifications",
    };
  }

  return { success: true, ticket_id: ticket.ticket_id };
};

export const updateProfilePicture = async (file: File) => {
  const supabase = await createClient();

  // Get logged-in user
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.user) {
    console.error("Error fetching user:", userError?.message);
    return { error: "User not authenticated." };
  }

  const userId = user.user.id;

  // Fetch current avatar URL
  const { data: userData, error: fetchError } = await supabase
    .from("user_table")
    .select("user_avatar")
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching user avatar:", fetchError.message);
    return { error: fetchError.message };
  }

  // Remove old avatar if it exists
  const oldFilePath = userData?.user_avatar?.replace(
    /^.*\/avatars\//,
    "avatars/"
  );
  if (oldFilePath) await supabase.storage.from("avatars").remove([oldFilePath]);

  // Upload new avatar
  const filePath = `avatars/${userId}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Upload error:", uploadError.message);
    return { error: uploadError.message };
  }

  // Get new public URL
  const publicUrl = supabase.storage.from("avatars").getPublicUrl(filePath)
    .data?.publicUrl;
  if (!publicUrl) return { error: "Failed to retrieve image URL" };

  // Update user profile
  const { error: updateError } = await supabase
    .from("user_table")
    .update({ user_avatar: publicUrl })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Database update error:", updateError.message);
    return { error: updateError.message };
  }

  return { success: true, url: publicUrl };
};

export const shareTicket = async (ticket_id: string, user_id: string) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error fetching user:", userError.message);
    throw new Error("Failed to fetch current user.");
  }

  const { error } = await supabase.rpc("share_ticket", {
    _ticket_id: ticket_id,
    _shared_user_id: user_id,
    _assigned_by: user?.id,
  });

  if (error) {
    console.error("Error sharing ticket:", error.message);
    throw new Error("Failed to share ticket");
  }

  const { error: notificationError } = await supabase
    .from("notification_table")
    .insert({
      notification_user_id: user_id,
      notification_message: `${user?.user_metadata.display_name} has shared ticket with you`,
      notification_read: false,
      notification_url: `/tickets/${ticket_id}`,
    });

  if (notificationError) {
    console.error("Error adding notification:", notificationError.message);
    throw new Error("Failed to add notification");
  }

  return { success: true };
};

export const createCanvass = async ({
  RfDateReceived,
  recommendedSupplier,
  leadTimeDay,
  totalAmount,
  paymentTerms,
  canvassSheet,
  quotations,
  ticketId,
}: {
  RfDateReceived: Date;
  recommendedSupplier: string;
  leadTimeDay: number;
  totalAmount: number;
  paymentTerms: string;
  canvassSheet: File;
  quotations: File[];
  ticketId: string;
}) => {
  try {
    const BUCKET_NAME = "canvass-attachments";
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return {
        error: true,
        message: "User not authenticated.",
      };
    }

    const userId = user.id;

    // Helper function to upload a file and get its URL
    const uploadFile = async (file: File, fileType: string) => {
      const extension = file.name.split(".").pop();
      const fileName = `${fileType}_${uuidv4()}.${extension}`;
      const filePath = `${ticketId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Failed to upload ${fileType}: ${uploadError.message}`);
      }

      const { data: urlData } = await supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        path: filePath,
        publicUrl: urlData?.publicUrl,
      };
    };

    // Upload canvass sheet
    const canvassSheetResult = await uploadFile(canvassSheet, "canvass_sheet");

    // Upload all quotations
    const quotationResults = await Promise.all(
      quotations.map((quotation, index) =>
        uploadFile(quotation, `quotation_${index + 1}`)
      )
    );

    // Store canvass form data using the first quotation as the primary one
    const { error: canvassFormError, data: canvassFormData } = await supabase
      .from("canvass_form_table")
      .insert({
        canvass_form_ticket_id: ticketId,
        canvass_form_rf_date_received: RfDateReceived,
        canvass_form_recommended_supplier: recommendedSupplier,
        canvass_form_lead_time_day: leadTimeDay,
        canvass_form_total_amount: totalAmount,
        canvass_form_payment_terms: paymentTerms,
        canvass_form_submitted_by: userId,
      })
      .select()
      .single();

    if (canvassFormError) {
      throw new Error(
        `Failed to insert canvass form: ${canvassFormError.message}`
      );
    }

    const canvassFormId = canvassFormData?.canvass_form_id;

    // Prepare attachments data
    const attachments = [
      // Add canvass sheet attachment
      {
        canvass_attachment_canvass_form_id: canvassFormId,
        canvass_attachment_type: "CANVASS_SHEET",
        canvass_attachment_url: canvassSheetResult.publicUrl,
      },
      // Add all quotation attachments
      ...quotationResults.map((result, index) => ({
        canvass_attachment_canvass_form_id: canvassFormId,
        canvass_attachment_type: `QUOTATION_${index + 1}`,
        canvass_attachment_url: result.publicUrl,
      })),
    ];

    // Insert all attachments at once
    const { error: attachmentsError } = await supabase
      .from("canvass_attachment_table")
      .insert(attachments);

    if (attachmentsError) {
      throw new Error(
        `Failed to insert attachments: ${attachmentsError.message}`
      );
    }

    // Revalidate paths to reflect changes
    revalidatePath(`/canvass/${canvassFormId}`);
    revalidatePath(`/canvass`);

    return {
      success: true,
      message: "Canvass created successfully",
      canvassFormId,
    };
  } catch (error) {
    console.error("Error creating canvass:", error);
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};

export const addComment = async (
  ticket_id: string,
  content: string,
  user_id: string
) => {
  const supabase = await createClient();

  // Ensure that the ticket_id, content, and user_id are provided
  if (!ticket_id || !content || !user_id) {
    throw new Error("Missing required fields: ticket_id, content, or user_id.");
  }

  try {
    // Start a transaction
    const { data, error } = await supabase.rpc(
      "add_comment_with_notification",
      {
        p_ticket_id: ticket_id,
        p_content: content,
        p_user_id: user_id,
      }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in transaction:", error);
    throw new Error("Failed to add comment and notification.");
  }
};

export const startCanvass = async (
  ticket_id: string,
  user_id: string,
  status: string
) => {
  const supabase = await createClient();

  if (!ticket_id || !user_id) {
    throw new Error("Missing required fields: ticket_id or user_id");
  }

  // Fetch the current ticket status before updating
  const { data: ticketData, error: fetchError } = await supabase
    .from("ticket_table")
    .select("ticket_status")
    .eq("ticket_id", ticket_id)
    .single();

  if (fetchError) {
    console.error("Error fetching ticket status:", fetchError.message);
    throw new Error("Failed to fetch ticket status.");
  }

  const previousStatus = ticketData?.ticket_status || "UNKNOWN";

  // Update ticket status
  const { error: updateError } = await supabase
    .from("ticket_table")
    .update({ ticket_status: status })
    .eq("ticket_id", ticket_id);

  if (updateError) {
    console.error("Error updating ticket status:", updateError.message);
    throw new Error("Failed to update ticket status.");
  }

  // Insert record into ticket_status_history_table
  const { error: historyError } = await supabase
    .from("ticket_status_history_table")
    .insert([
      {
        ticket_status_history_ticket_id: ticket_id,
        ticket_status_history_previous_status: previousStatus,
        ticket_status_history_new_status: status,
        ticket_status_history_changed_by: user_id,
        ticket_status_history_change_date: new Date().toISOString(), // Store as ISO string
      },
    ]);

  if (historyError) {
    console.error("Error inserting into status history:", historyError.message);
    throw new Error("Failed to insert status history.");
  }

  return { success: true, message: "Canvassing started successfully" };
};
