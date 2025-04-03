"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export const deleteUser = async () => {
  const supabase = await createClient();

  // Delete the user's auth account
  const { error: deleteError } = await supabase.rpc("delete_user");

  if (deleteError) {
    throw new Error("Failed to delete user account. Please try again.");
  }

  await supabase.auth.signOut();

  revalidatePath("/");
  redirect("/");
};

export const deleteComment = async (comment_id: string): Promise<void> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("comment_table")
    .delete()
    .eq("comment_id", comment_id);

  if (error) {
    console.error("Error deleting comment:", error.message);
    throw new Error("Failed to delete comment.");
  }
};

export const deleteDraftCanvass = async (draftId: string) => {
  try {
    const supabase = await createClient();

    // First delete attachments
    const { error: attachmentsError } = await supabase
      .from("canvass_attachment_table")
      .delete()
      .eq("canvass_attachment_draft_id", draftId);

    if (attachmentsError) {
      throw new Error(
        `Failed to delete draft attachments: ${attachmentsError.message}`
      );
    }

    // Then delete the draft
    const { error: deleteError } = await supabase
      .from("canvass_draft_table")
      .delete()
      .eq("canvass_draft_id", draftId);

    if (deleteError) {
      throw new Error(`Failed to delete draft: ${deleteError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting canvass draft:", error);
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};
