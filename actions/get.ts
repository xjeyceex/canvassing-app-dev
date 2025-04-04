"use server";

import { createClient } from "@/utils/supabase/server";
import {
  CanvassDetail,
  CommentType,
  DashboardTicketType,
  DropdownType,
  NotificationType,
  ReviewerType,
  UserType,
} from "@/utils/types";

export const getCurrentUser = async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: true,
      success: false,
      message: error?.message || "No user found.",
    };
  }

  const { data: userData, error: userError } = await supabase
    .from("user_table")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (userError) {
    return {
      error: true,
      message: "An unexpected error occurred while fetching user data.",
      success: false,
    };
  }

  return {
    success: true,
    data: userData as UserType,
  };
};

export const getDashboardTickets = async (user_id?: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_dashboard_tickets", {
    _user_id: user_id || null,
  });

  if (error) {
    console.error("Supabase Error:", error.message);
    return [];
  }

  return data as DashboardTicketType[];
};

export const getTicketDetails = async (ticket_id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_ticket_details", {
    ticket_uuid: ticket_id,
  });

  if (error) {
    console.error(" Supabase Error:", error.message);
    return null;
  }

  return data;
};

export const checkReviewerResponse = async (
  ticket_id: string,
  user_id: string
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_table")
    .select("approval_review_status")
    .eq("approval_ticket_id", ticket_id)
    .eq("approval_reviewed_by", user_id)
    .single();

  if (error) {
    console.error("Supabase Error:", error.message);
    return null; // Return null if there's an error or no record found
  }

  return data.approval_review_status; // Directly return the status
};

export const getAllMyTickets = async ({
  user_id,
}: {
  user_id: string;
  ticket_status?: string;
}) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_all_my_tickets", {
    user_id,
  });

  if (error) {
    console.error("Supabase Error:", error.message);
    return [];
  }

  return data || [];
};

type SharedUser = { ticket_shared_user_id: string };
type Reviewer = { approval_reviewed_by: string };

export const getAllUsers = async (ticket_id: string) => {
  const supabase = await createClient();

  // Fetch current user
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData?.user) {
    console.error("Error fetching current user:", userError?.message);
    return { error: true, message: "Failed to fetch current user." };
  }
  const currentUserId = authData.user.id;

  // Fetch ticket creator, shared users, and reviewers in parallel
  const [ticketResponse, sharedUsersResponse, reviewersResponse] =
    await Promise.all([
      supabase
        .from("ticket_table")
        .select("ticket_created_by")
        .eq("ticket_id", ticket_id)
        .maybeSingle(),
      supabase
        .from("ticket_shared_with_table")
        .select("ticket_shared_user_id")
        .eq("ticket_shared_ticket_id", ticket_id),
      supabase
        .from("approval_table")
        .select("approval_reviewed_by")
        .eq("approval_ticket_id", ticket_id),
    ]);

  if (!ticketResponse.data?.ticket_created_by) {
    return { error: true, message: "Ticket not found." };
  }

  if (sharedUsersResponse.error || reviewersResponse.error) {
    console.error(
      "Error fetching related users:",
      sharedUsersResponse.error?.message,
      reviewersResponse.error?.message
    );
    return { error: true, message: "Failed to fetch related users." };
  }

  const ticketCreatorId = ticketResponse.data.ticket_created_by;
  const sharedUserIds = sharedUsersResponse.data.map(
    (u: SharedUser) => u.ticket_shared_user_id
  );
  const reviewerIds = reviewersResponse.data.map(
    (r: Reviewer) => r.approval_reviewed_by
  );

  // Collect all users to exclude
  const idsToExclude = new Set([
    currentUserId,
    ticketCreatorId,
    ...sharedUserIds,
    ...reviewerIds,
  ]);

  // Fetch all users except excluded ones
  const { data: users, error: usersError } = await supabase
    .from("user_table")
    .select("user_id, user_full_name, user_email")
    .not("user_id", "in", `(${[...idsToExclude].join(",")})`);

  if (usersError) {
    console.error("Error fetching users:", usersError.message);
    return { error: true, message: "Failed to fetch users." };
  }

  return users.map((user: ReviewerType) => ({
    value: user.user_id,
    label: user.user_full_name,
  })) as DropdownType[];
};

export const getReviewers = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_table")
    .select("user_id, user_full_name, user_email")
    .eq("user_role", "REVIEWER");

  if (error) {
    return {
      error: true,
      message: "An unexpected error occurred whiel fetching user data.",
    };
  }

  return data as ReviewerType[];
};

export const getCanvassDetails = async ({
  ticketId,
}: {
  ticketId: string;
}): Promise<CanvassDetail[]> => {
  const supabase = await createClient();

  const { data: canvassDetails, error } = await supabase
    .from("canvass_form_table")
    .select(
      `*, 
      submitted_by:user_table!canvass_form_table_canvass_form_submitted_by_fkey (
        user_id, 
        user_full_name,
        user_email,
        user_avatar
      ),
      attachments:canvass_attachment_table (
        canvass_attachment_id,
        canvass_attachment_type,
        canvass_attachment_url,
        canvass_attachment_file_type,
        canvass_attachment_file_size,
        canvass_attachment_created_at
      )`
    )
    .eq("canvass_form_ticket_id", ticketId);

  if (error) {
    throw new Error(`Error fetching canvass details: ${error.message}`);
  }

  return canvassDetails || [];
};

export const getCurrentUserNotification = async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: true,
      success: false,
      message: error?.message || "No user found.",
    };
  }

  const currentUserId = user.id;

  const { data, error: notificationError } = await supabase
    .from("notification_table")
    .select("*")
    .eq("notification_user_id", currentUserId);

  if (notificationError) {
    return {
      error: true,
      message: "An unexpected error occurred while fetching user data.",
      success: false,
    };
  }

  return {
    success: true,
    data: data as NotificationType[],
  };
};

export const getComments = async (
  ticket_id: string
): Promise<CommentType[]> => {
  const supabase = await createClient();

  const { data: comments, error: commentsError } = await supabase.rpc(
    "get_comments_with_avatars",
    { ticket_id }
  );

  if (commentsError) {
    console.error("Error fetching comments:", commentsError.message);
    throw new Error(`Failed to fetch comments: ${commentsError.message}`);
  }

  // Transform the data to match the CommentType
  const formattedComments = comments.map((comment: CommentType) => ({
    comment_id: comment.comment_id,
    comment_ticket_id: comment.comment_ticket_id,
    comment_content: comment.comment_content,
    comment_date_created: comment.comment_date_created,
    comment_is_edited: comment.comment_is_edited,
    comment_type: comment.comment_type,
    comment_last_updated: comment.comment_last_updated,
    comment_user_id: comment.comment_user_id,
    comment_user_full_name: comment.comment_user_full_name,
    comment_user_avatar: comment.comment_user_avatar,
    replies: [], // Assuming you would populate the replies later
  }));

  return formattedComments;
};

export const checkIfUserPasswordExists = async (user_id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_user_password_exists", {
    user_id,
  });

  if (error) {
    console.error("Error checking user password:", error.message);
    return false;
  }

  return data as boolean;
};

export const getDraftCanvass = async (ticketId: string, userId: string) => {
  try {
    const supabase = await createClient();

    // Get draft data
    const { data: draftData, error: draftError } = await supabase
      .from("canvass_draft_table")
      .select("*")
      .eq("canvass_draft_ticket_id", ticketId)
      .eq("canvass_draft_user_id", userId)
      .single();

    if (draftError && draftError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" error
      throw new Error(`Failed to fetch draft: ${draftError.message}`);
    }

    if (!draftData) {
      return { data: null };
    }

    // Get draft attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from("canvass_attachment_table")
      .select("*")
      .eq("canvass_attachment_draft_id", draftData.canvass_draft_id)
      .eq("canvass_attachment_is_draft", true);

    if (attachmentsError) {
      throw new Error(
        `Failed to fetch draft attachments: ${attachmentsError.message}`
      );
    }

    return {
      data: {
        ...draftData,
        attachments: attachments || [],
      },
    };
  } catch (error) {
    console.error("Error fetching canvass draft:", error);
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};

export const getUserDataById = async (user_id: string) => {
  const supabase = await createClient();

  try {
    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from("user_table")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (userError) {
      throw new Error(userError?.message || "Error fetching user data");
    }

    // Fetch ticket count
    const { data: tickets, error: ticketError } = await supabase
      .from("ticket_table")
      .select("*", { count: "exact" })
      .eq("ticket_created_by", user_id);

    if (ticketError) {
      throw new Error(ticketError?.message || "Error fetching ticket count");
    }

    // Fetch revised ticket count
    const { data: revisedTickets, error: revisedTicketError } = await supabase
      .from("ticket_table")
      .select("*", { count: "exact" })
      .eq("ticket_created_by", user_id)
      .not("ticket_revised_by", "is", null);

    if (revisedTicketError) {
      throw new Error(
        revisedTicketError?.message || "Error fetching revised ticket count"
      );
    }

    return {
      error: false,
      success: true,
      user: userData,
      ticketCount: tickets?.length || 0,
      revisedTicketCount: revisedTickets?.length || 0,
    };
  } catch (error) {
    return {
      error: true,
      success: false,
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};
