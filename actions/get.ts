"use server";

import { createClient } from "@/utils/supabase/server";
import {
  CanvassDetail,
  CommentType,
  DashboardTicketType,
  DropdownType,
  NotificationType,
  ReviewerType,
  TicketStatusCount,
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
  page = 1,
  page_size = 10,
  search_query = "",
  status_filter = "", // Added ticket_status parameter
}: {
  user_id: string;
  page?: number;
  page_size?: number;
  search_query?: string;
  status_filter?: string; // Accept ticket status as a string
}) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_all_my_tickets", {
    user_id,
    page,
    page_size,
    search_query,
    status_filter, // Pass ticket status to the RPC function
  });

  // Error handling
  if (error) {
    console.error("Supabase Error:", error.message);
    return { tickets: [], total_count: 0 };
  }

  // Safely returning the tickets and total_count, or default values if not present
  const tickets = data?.[0]?.tickets || [];
  const total_count = data?.[0]?.total_count || 0;

  return { tickets, total_count };
};
export const getTicketStatusCounts = async (
  user_id: string
): Promise<{ status_counts: TicketStatusCount[]; total_count: number }> => {
  const supabase = await createClient();

  // 1. Fetch tickets created by user
  const { data: createdTickets, error: createdError } = await supabase
    .from("ticket_table")
    .select("ticket_id, ticket_status")
    .eq("ticket_created_by", user_id);

  if (createdError) {
    console.error("Error fetching created tickets:", createdError.message);
    return { status_counts: [], total_count: 0 };
  }

  // 2. Fetch tickets where user is a reviewer
  const { data: reviewedApprovals, error: approvalError } = await supabase
    .from("approval_table")
    .select("approval_ticket_id")
    .eq("approval_reviewed_by", user_id);

  if (approvalError) {
    console.error("Error fetching reviewed approvals:", approvalError.message);
    return { status_counts: [], total_count: 0 };
  }

  // 3. Combine created + reviewed ticket IDs
  const reviewedIds = reviewedApprovals?.map((a) => a.approval_ticket_id) || [];
  const createdMap = new Map(
    createdTickets?.map((t) => [t.ticket_id, t.ticket_status])
  );
  const reviewedOnlyIds = reviewedIds.filter((id) => !createdMap.has(id));

  // 4. Fetch statuses of reviewed tickets (not created by user)
  const { data: reviewedTickets, error: reviewedTicketsError } = await supabase
    .from("ticket_table")
    .select("ticket_id, ticket_status")
    .in("ticket_id", reviewedOnlyIds);

  if (reviewedTicketsError) {
    console.error(
      "Error fetching reviewed ticket statuses:",
      reviewedTicketsError.message
    );
    return { status_counts: [], total_count: 0 };
  }

  const allTickets = [...(createdTickets || []), ...(reviewedTickets || [])];
  const allTicketIds = allTickets.map((t) => t.ticket_id);

  // 5. Fetch canvass info
  const { data: canvassData, error: canvassError } = await supabase
    .from("canvass_form_table")
    .select("canvass_form_ticket_id, canvass_form_revised_by")
    .in("canvass_form_ticket_id", allTicketIds);

  if (canvassError) {
    console.error("Error fetching canvass data:", canvassError.message);
    return { status_counts: [], total_count: 0 };
  }

  // 6. Count ticket statuses with revised double-counted
  const ticketCounts = allTickets.reduce(
    (acc: { [key: string]: number }, ticket) => {
      const { ticket_id, ticket_status } = ticket;

      // Always count by ticket_status
      acc[ticket_status] = (acc[ticket_status] || 0) + 1;

      // Also count as REVISED if it's revised
      const revised = canvassData?.find(
        (form) => form.canvass_form_ticket_id === ticket_id
      )?.canvass_form_revised_by;

      if (revised) {
        acc["REVISED"] = (acc["REVISED"] || 0) + 1;
      }

      return acc;
    },
    {}
  );

  // 7. Convert to array format
  const statusCounts = Object.entries(ticketCounts).map(
    ([ticket_status, ticket_count]) => ({
      ticket_status,
      ticket_count,
    })
  );

  // 8. Sum all counts
  // 8. Unique total count (no duplicates)
  const uniqueTicketIds = new Set(allTickets.map((t) => t.ticket_id));
  const totalCount = uniqueTicketIds.size;

  return { status_counts: statusCounts, total_count: totalCount };
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

  const { data, error } = await supabase.rpc("get_reviewers");

  if (error) {
    return {
      error: true,
      message: "An unexpected error occurred while fetching user data.",
    };
  }

  return data as ReviewerType[];
};

export const getManagers = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_managers");

  if (error) {
    return {
      error: true,
      message: "An unexpected error occurred while fetching user data.",
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

  const { data: canvassDetails, error } = await supabase.rpc(
    "get_canvass_details",
    { ticket_uuid: ticketId }
  );

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
    const { data, error } = await supabase.rpc("get_user_data_by_id", {
      p_user_id: user_id,
    });

    if (error) {
      throw new Error(error.message || "Error calling RPC function");
    }

    return data;
  } catch (err) {
    return {
      error: true,
      success: false,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
};

export const getUsers = async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("get_all_users_with_stats");

    if (error) {
      throw new Error(error.message || "Error fetching users with stats");
    }

    return {
      error: false,
      success: true,
      users: data,
    };
  } catch (err) {
    return {
      error: true,
      success: false,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
};
