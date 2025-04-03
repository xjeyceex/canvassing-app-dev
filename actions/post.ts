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

  try {
    // 1. Format the date
    const formattedDate = new Date(validatedData.ticketRfDateReceived)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "")
      .toUpperCase();

    const { data: sequenceData, error: sequenceError } = await supabase.rpc(
      "get_next_ticket_sequence",
      { date_prefix: formattedDate }
    );

    if (sequenceError) {
      console.error("Error fetching sequence value:", sequenceError);
      return { success: false, message: "Failed to generate ticket name." };
    }

    const nextSequenceValue = sequenceData;

    const newTicketName = `${String(nextSequenceValue).padStart(
      5,
      "0"
    )}-${formattedDate}`;

    // 4. Insert the new ticket with the generated ticket name
    const { data: ticket, error: ticketError } = await supabase
      .from("ticket_table")
      .insert({
        ticket_name: newTicketName, // Use the generated name
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
      console.error("Error creating ticket:", ticketError);
      return { success: false, message: "Failed to create ticket" };
    }

    // 5. Fetch all MANAGERS from user_table
    const { data: managers, error: managerError } = await supabase
      .from("user_table")
      .select("user_id")
      .eq("user_role", "MANAGER");

    if (managerError) {
      console.error("Error fetching managers:", managerError.message);
      return { success: false, message: "Failed to fetch managers" };
    }

    // 6. Merge manually selected reviewers with managers
    const allReviewers = [
      ...new Set([
        ...validatedData.ticketReviewer,
        ...managers.map((m) => m.user_id),
      ]),
    ];

    // 7. Insert all reviewers into the approval_table
    const { error: reviewersError } = await supabase
      .from("approval_table")
      .insert(
        allReviewers.map((reviewerId) => ({
          approval_ticket_id: ticket.ticket_id,
          approval_reviewed_by: reviewerId,
          approval_review_status: "PENDING",
          approval_review_date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
          }),
        }))
      );

    if (reviewersError) {
      console.error("Error assigning reviewers:", reviewersError);
      return { success: false, message: "Failed to assign reviewers" };
    }

    return { success: true, ticket_id: ticket.ticket_id };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
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
      notification_ticket_id: ticket_id,
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
  ticketName,
  paymentTerms,
  canvassSheet,
  quotations,
  ticketId,
}: {
  RfDateReceived: Date;
  recommendedSupplier: string;
  leadTimeDay: number;
  totalAmount: number;
  ticketName: string;
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

    // First, delete the entire drafts folder for this ticket
    const draftFolderPath = `${ticketId}/drafts/`;

    // List all files in the drafts folder
    const { data: filesList } = await supabase.storage
      .from(BUCKET_NAME)
      .list(draftFolderPath);

    if (filesList && filesList.length > 0) {
      // Create an array of file paths to delete
      const filesToDelete = filesList.map(
        (file) => `${draftFolderPath}${file.name}`
      );

      // Delete all files in the drafts folder
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete);

      if (deleteError) {
        console.error("Error deleting draft files:", deleteError);
      }
    }

    // Delete draft attachments from the database
    const { data: draftData } = await supabase
      .from("canvass_draft_table")
      .select("canvass_draft_id")
      .eq("canvass_draft_ticket_id", ticketId)
      .single();

    if (draftData?.canvass_draft_id) {
      // Delete attachment records
      await supabase
        .from("canvass_attachment_table")
        .delete()
        .eq("canvass_attachment_draft_id", draftData.canvass_draft_id);

      // Delete the draft record itself
      await supabase
        .from("canvass_draft_table")
        .delete()
        .eq("canvass_draft_id", draftData.canvass_draft_id);
    }

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
        fileType: file.type,
        fileSize: file.size,
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
        canvass_attachment_file_type: canvassSheetResult.fileType,
        canvass_attachment_file_size: canvassSheetResult.fileSize,
      },
      // Add all quotation attachments
      ...quotationResults.map((result, index) => ({
        canvass_attachment_canvass_form_id: canvassFormId,
        canvass_attachment_type: `QUOTATION_${index + 1}`,
        canvass_attachment_url: result.publicUrl,
        canvass_attachment_file_type: result.fileType,
        canvass_attachment_file_size: result.fileSize,
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

    // Fetch all the reviewer approval data for the ticket
    const { data: approvalData, error: approvalError } = await supabase
      .from("approval_table")
      .select("approval_reviewed_by")
      .eq("approval_ticket_id", ticketId);

    if (approvalError) {
      throw new Error(
        `Failed to fetch approval data: ${approvalError.message}`
      );
    }

    // If there's no reviewer, return error
    if (!approvalData || approvalData.length === 0) {
      throw new Error("No reviewer found for this ticket.");
    }

    // Iterate through each reviewer and check their role
    for (const approval of approvalData) {
      const { data: userRoleData, error: roleError } = await supabase
        .from("user_table")
        .select("user_role")
        .eq("user_id", approval.approval_reviewed_by)
        .single();

      if (roleError) {
        throw new Error(`Failed to fetch user role: ${roleError.message}`);
      }

      // Only update if the user is a REVIEWER
      if (userRoleData?.user_role === "REVIEWER") {
        const { error: updateApprovalError } = await supabase
          .from("approval_table")
          .update({
            approval_review_status: "AWAITING ACTION",
          })
          .eq("approval_ticket_id", ticketId)
          .eq("approval_reviewed_by", approval.approval_reviewed_by); // Update for each reviewer individually

        if (updateApprovalError) {
          throw new Error(
            `Failed to update approval status for reviewer: ${updateApprovalError.message}`
          );
        }

        // Notify the reviewer
        const notificationMessage = `A new canvass form has been submitted for ticket ${ticketName}. Please review the submission.`;
        await supabase.from("notification_table").insert({
          notification_user_id: approval.approval_reviewed_by,
          notification_message: notificationMessage,
          notification_read: false,
          notification_ticket_id: ticketId,
          notification_created_at: new Date().toISOString(),
          notification_comment_id: null,
        });
      }
    }

    return {
      success: true,
      message: "Canvass created and reviewer notified successfully",
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

export const saveCanvassDraft = async ({
  RfDateReceived,
  recommendedSupplier,
  leadTimeDay,
  totalAmount,
  paymentTerms,
  canvassSheet,
  quotations,
  ticketId,
  userId,
}: {
  RfDateReceived: Date;
  recommendedSupplier?: string;
  leadTimeDay?: number;
  totalAmount?: number;
  paymentTerms?: string;
  canvassSheet?: File | null;
  quotations?: (File | null)[];
  ticketId: string;
  userId: string;
}) => {
  try {
    const BUCKET_NAME = "canvass-attachments";
    const supabase = await createClient();

    // Check if a draft already exists for this user and ticket
    const { data: existingDraft } = await supabase
      .from("canvass_draft_table")
      .select("canvass_draft_id")
      .eq("canvass_draft_ticket_id", ticketId)
      .eq("canvass_draft_user_id", userId)
      .single();

    // Helper function to upload a file and get its URL
    const uploadFile = async (file: File, fileType: string) => {
      const extension = file.name.split(".").pop();
      const fileName = `draft_${fileType}_${uuidv4()}.${extension}`;
      const filePath = `${ticketId}/drafts/${fileName}`;

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
        fileType: file.type,
        fileSize: file.size,
      };
    };

    let draftId: string;

    if (existingDraft) {
      // Update existing draft
      draftId = existingDraft.canvass_draft_id;

      const { error: updateError } = await supabase
        .from("canvass_draft_table")
        .update({
          canvass_draft_rf_date_received: RfDateReceived,
          canvass_draft_recommended_supplier: recommendedSupplier || null,
          canvass_draft_lead_time_day: leadTimeDay || null,
          canvass_draft_total_amount: totalAmount || null,
          canvass_draft_payment_terms: paymentTerms || null,
          canvass_draft_updated_at: new Date().toISOString(),
        })
        .eq("canvass_draft_id", draftId);

      if (updateError) {
        throw new Error(`Failed to update draft: ${updateError.message}`);
      }
    } else {
      // Create new draft
      const { data: newDraft, error: insertError } = await supabase
        .from("canvass_draft_table")
        .insert({
          canvass_draft_ticket_id: ticketId,
          canvass_draft_user_id: userId,
          canvass_draft_rf_date_received: RfDateReceived,
          canvass_draft_recommended_supplier: recommendedSupplier || null,
          canvass_draft_lead_time_day: leadTimeDay || null,
          canvass_draft_total_amount: totalAmount || null,
          canvass_draft_payment_terms: paymentTerms || null,
        })
        .select()
        .single();

      if (insertError || !newDraft) {
        throw new Error(
          `Failed to create draft: ${insertError?.message || "Unknown error"}`
        );
      }

      draftId = newDraft.canvass_draft_id;
    }

    // Handle file uploads if provided
    if (
      canvassSheet instanceof File ||
      quotations?.some((q) => q instanceof File)
    ) {
      // First, delete any existing attachments for this draft
      await supabase
        .from("canvass_attachment_table")
        .delete()
        .eq("canvass_attachment_draft_id", draftId);

      // Now add new attachments
      const attachments = [];

      // Upload canvass sheet if provided
      if (canvassSheet instanceof File) {
        const canvassSheetResult = await uploadFile(
          canvassSheet,
          "canvass_sheet"
        );
        attachments.push({
          canvass_attachment_draft_id: draftId,
          canvass_attachment_type: "CANVASS_SHEET",
          canvass_attachment_url: canvassSheetResult.publicUrl,
          canvass_attachment_file_type: canvassSheetResult.fileType,
          canvass_attachment_file_size: canvassSheetResult.fileSize,
          canvass_attachment_is_draft: true,
        });
      }

      // Upload quotations if provided
      if (quotations && quotations.length > 0) {
        for (let i = 0; i < quotations.length; i++) {
          const quotation = quotations[i];
          if (quotation instanceof File) {
            const quotationResult = await uploadFile(
              quotation,
              `quotation_${i + 1}`
            );
            attachments.push({
              canvass_attachment_draft_id: draftId,
              canvass_attachment_type: `QUOTATION_${i + 1}`,
              canvass_attachment_url: quotationResult.publicUrl,
              canvass_attachment_file_type: quotationResult.fileType,
              canvass_attachment_file_size: quotationResult.fileSize,
              canvass_attachment_is_draft: true,
            });
          }
        }
      }

      // Insert all attachments if any
      if (attachments.length > 0) {
        const { error: attachmentsError } = await supabase
          .from("canvass_attachment_table")
          .insert(attachments);

        if (attachmentsError) {
          throw new Error(
            `Failed to insert draft attachments: ${attachmentsError.message}`
          );
        }
      }
    }

    return {
      success: true,
      message: "Draft saved successfully",
      draftId,
    };
  } catch (error) {
    console.error("Error saving canvass draft:", error);
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

export const canvassAction = async (
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
    .select("ticket_status, ticket_created_by, ticket_is_revised")
    .eq("ticket_id", ticket_id)
    .single();

  if (fetchError) {
    console.error("Error fetching ticket status:", fetchError.message);
    throw new Error("Failed to fetch ticket status.");
  }

  const previousStatus = ticketData?.ticket_status || "UNKNOWN";
  const isAlreadyRevised = ticketData?.ticket_is_revised;

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
        ticket_status_history_change_date: new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
        ).toISOString(),
      },
    ]);

  if (historyError) {
    console.error("Error inserting into status history:", historyError.message);
    throw new Error("Failed to insert status history.");
  }

  // If the status is "FOR REVISION" and the ticket was created by the user, update the revised ticket flag
  if (status === "FOR REVISION" && !isAlreadyRevised) {
    const { error: revisionError } = await supabase
      .from("ticket_table")
      .update({ ticket_is_revised: true })
      .eq("ticket_id", ticket_id);

    if (revisionError) {
      console.error(
        "Error updating ticket revision flag:",
        revisionError.message
      );
      throw new Error("Failed to mark ticket as revised.");
    }
  }

  return { success: true, message: "Canvassing started successfully" };
};

export const updateUserRole = async (user_id: string, user_role: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_table")
    .update({ user_role }) // Update only the user_role column
    .eq("user_id", user_id);

  if (error) {
    console.error("Error updating user role:", error.message);
    return false; // Indicate failure
  }

  return true; // Indicate success
};
