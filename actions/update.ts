"use server";

import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";

export const markNotificationAsRead = async ({
  notification_id,
}: {
  notification_id: string;
}) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_table")
    .update({ notification_read: true })
    .eq("notification_id", notification_id);

  if (error) {
    console.error("Error marking notification as read:", error.message);
    return { error: true, message: "Failed to mark notification as read." };
  }

  return { success: true };
};

export const markAllUserNotificationsAsRead = async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated.");
  }

  const { error } = await supabase
    .from("notification_table")
    .update({ notification_read: true })
    .eq("notification_user_id", user?.id);

  if (error) {
    console.error("Error marking notification as read:", error.message);
    return { success: false, message: "Failed to mark notification as read." };
  }

  return { success: true };
};

export const editComment = async (
  comment_id: string,
  newContent: string
): Promise<void> => {
  const supabase = await createClient();

  // Update the comment content and mark it as edited
  const { error } = await supabase
    .from("comment_table")
    .update({
      comment_content: newContent,
      comment_is_edited: true,
      comment_last_updated: new Date(),
    })
    .eq("comment_id", comment_id); // Ensure we update the correct comment

  if (error) {
    console.error("Error updating comment:", error.message);
    throw new Error("Failed to update comment.");
  }
};

export const changePassword = async (
  oldPassword: string,
  newPassword: string
) => {
  const supabase = await createClient();

  // Get the currently logged-in user
  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error fetching user:", userError?.message);
    return { error: true, message: "User not authenticated." };
  }

  const userEmail = user?.user?.email;
  if (!userEmail) {
    return { error: true, message: "User email not found." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: oldPassword,
  });

  if (signInError) {
    console.error("Reauthentication failed:", signInError.message);
    return {
      error: true,
      OldPasswordErrorMessage: "Old password is incorrect.",
    };
  }

  // Update the password after successful reauthentication
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    console.error("Error changing password:", error.message);
    return { error: true, message: error.message };
  }

  return { success: true };
};

export const setUserPassword = async (password: string) => {
  const supabase = await createClient();

  // Get the currently logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: true, message: "User not authenticated." };
  }

  // Update the user's password
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: true, message: error.message };
  }

  return { success: true, message: "Password updated successfully." };
};

export const updateApprovalStatus = async ({
  approval_ticket_id,
  approval_review_status,
  approval_reviewed_by,
}: {
  approval_ticket_id: string;
  approval_review_status: string;
  approval_reviewed_by: string;
}) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("approval_table")
    .update({
      approval_review_status,
      approval_review_date: new Date(),
    })
    .eq("approval_ticket_id", approval_ticket_id)
    .eq("approval_reviewed_by", approval_reviewed_by);

  if (error) {
    console.error("Error updating approval status:", error.message);
    return { success: false, message: "Failed to update approval status." };
  }

  return { success: true };
};

export const revertApprovalStatus = async (approval_ticket_id: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("approval_table")
    .update({
      approval_review_status: "PENDING",
      approval_review_date: new Date(),
    })
    .eq("approval_ticket_id", approval_ticket_id);

  if (error) {
    console.error("Error reverting approval status:", error.message);
    return { success: false, message: "Failed to revert approval status." };
  }

  return { success: true };
};

type FileUploadResult = {
  path: string;
  publicUrl: string;
  fileType: string;
  fileSize: number;
};

type ExistingQuotationResult = {
  canvass_attachment_canvass_form_id: string;
  canvass_attachment_type: string;
  canvass_attachment_url: string;
  canvass_attachment_file_type: string;
  canvass_attachment_file_size: number;
};

type QuotationResult = FileUploadResult | ExistingQuotationResult | null;

export const updateCanvass = async ({
  RfDateReceived,
  recommendedSupplier,
  leadTimeDay,
  totalAmount,
  paymentTerms,
  canvassSheet,
  updatedAt,
  quotations,
  ticketId,
  currentCanvassFormId,
}: {
  RfDateReceived: Date;
  recommendedSupplier: string;
  leadTimeDay: number;
  totalAmount: number;
  updatedAt: Date;
  paymentTerms: string;
  canvassSheet: File | null; // null if unchanged
  quotations: (File | null)[]; // null for unchanged files
  ticketId: string;
  currentCanvassFormId: string;
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

    // Get existing attachments for comparison
    const { data: existingAttachments, error: fetchError } = await supabase
      .from("canvass_attachment_table")
      .select("*")
      .eq("canvass_attachment_canvass_form_id", currentCanvassFormId);

    if (fetchError) {
      throw new Error(
        `Failed to fetch existing attachments: ${fetchError.message}`
      );
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

    // Handle canvass sheet update
    let canvassSheetData = null;
    const existingCanvassSheet = existingAttachments?.find(
      (a) => a.canvass_attachment_type === "CANVASS_SHEET"
    );

    if (canvassSheet) {
      // Delete old canvass sheet if it exists
      if (existingCanvassSheet) {
        const oldFilePath = new URL(
          existingCanvassSheet.canvass_attachment_url
        ).pathname
          .split("/")
          .pop();

        if (oldFilePath) {
          await supabase.storage
            .from(BUCKET_NAME)
            .remove([`${ticketId}/${oldFilePath}`]);
        }
      }

      // Upload new canvass sheet
      canvassSheetData = await uploadFile(canvassSheet, "canvass_sheet");
    }

    // Handle quotations updates
    const quotationResults = await Promise.all(
      quotations.map(async (quotation, index) => {
        const existingQuotation = existingAttachments?.find(
          (a) => a.canvass_attachment_type === `QUOTATION_${index + 1}`
        );

        if (!quotation) {
          // Keep existing quotation
          return existingQuotation
            ? {
                canvass_attachment_canvass_form_id: currentCanvassFormId,
                canvass_attachment_type: `QUOTATION_${index + 1}`,
                canvass_attachment_url:
                  existingQuotation.canvass_attachment_url,
                canvass_attachment_file_type:
                  existingQuotation.canvass_attachment_file_type,
                canvass_attachment_file_size:
                  existingQuotation.canvass_attachment_file_size,
              }
            : null;
        }

        // Delete old quotation if it exists
        if (existingQuotation) {
          const oldFilePath = new URL(
            existingQuotation.canvass_attachment_url
          ).pathname
            .split("/")
            .pop();

          if (oldFilePath) {
            await supabase.storage
              .from(BUCKET_NAME)
              .remove([`${ticketId}/${oldFilePath}`]);
          }
        }

        // Upload new quotation
        return uploadFile(quotation, `quotation_${index + 1}`);
      })
    );

    // Update canvass form data
    const { error: updateError } = await supabase
      .from("canvass_form_table")
      .update({
        canvass_form_rf_date_received: RfDateReceived,
        canvass_form_recommended_supplier: recommendedSupplier,
        canvass_form_lead_time_day: leadTimeDay,
        canvass_form_total_amount: totalAmount,
        canvass_form_payment_terms: paymentTerms,
        canvass_form_updated_at: updatedAt,
      })
      .eq("canvass_form_id", currentCanvassFormId);

    if (updateError) {
      throw new Error(`Failed to update canvass form: ${updateError.message}`);
    }

    // Delete all existing attachments from database
    await supabase
      .from("canvass_attachment_table")
      .delete()
      .eq("canvass_attachment_canvass_form_id", currentCanvassFormId);

    // Prepare new attachments data
    const attachments = [
      // Add canvass sheet attachment if updated
      ...(canvassSheetData
        ? [
            {
              canvass_attachment_canvass_form_id: currentCanvassFormId,
              canvass_attachment_type: "CANVASS_SHEET",
              canvass_attachment_url: canvassSheetData.publicUrl,
              canvass_attachment_file_type: canvassSheetData.fileType,
              canvass_attachment_file_size: canvassSheetData.fileSize,
            },
          ]
        : [
            {
              canvass_attachment_canvass_form_id: currentCanvassFormId,
              canvass_attachment_type: "CANVASS_SHEET",
              canvass_attachment_url:
                existingCanvassSheet?.canvass_attachment_url,
              canvass_attachment_file_type:
                existingCanvassSheet?.canvass_attachment_file_type,
              canvass_attachment_file_size:
                existingCanvassSheet?.canvass_attachment_file_size,
            },
          ]),
      // Add all quotation attachments
      ...quotationResults
        .filter(
          (result): result is NonNullable<QuotationResult> => result !== null
        )
        .map((result, index) => {
          if ("publicUrl" in result) {
            // This is a FileUploadResult
            return {
              canvass_attachment_canvass_form_id: currentCanvassFormId,
              canvass_attachment_type: `QUOTATION_${index + 1}`,
              canvass_attachment_url: result.publicUrl,
              canvass_attachment_file_type: result.fileType,
              canvass_attachment_file_size: result.fileSize,
            };
          } else {
            // This is an ExistingQuotationResult
            return {
              canvass_attachment_canvass_form_id: currentCanvassFormId,
              canvass_attachment_type: `QUOTATION_${index + 1}`,
              canvass_attachment_url: result.canvass_attachment_url,
              canvass_attachment_file_type: result.canvass_attachment_file_type,
              canvass_attachment_file_size: result.canvass_attachment_file_size,
            };
          }
        }),
    ];

    // Insert updated attachments
    const { error: attachmentsError } = await supabase
      .from("canvass_attachment_table")
      .insert(attachments);

    if (attachmentsError) {
      throw new Error(
        `Failed to insert attachments: ${attachmentsError.message}`
      );
    }

    return {
      success: true,
      message: "Canvass updated successfully",
      canvassFormId: currentCanvassFormId,
    };
  } catch (error) {
    console.error("Error updating canvass:", error);
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};
