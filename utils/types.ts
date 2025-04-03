export type UserType = {
  user_id: string;
  user_role: string;
  user_full_name: string;
  user_email: string;
  user_avatar: string;
};

export type ReviewerType = {
  user_id: string;
  user_full_name: string;
  user_email: string;
};

export type DropdownType = {
  value: string;
  label: string;
};

export type TicketDetailsType = {
  ticket_id: string;
  ticket_item_name: string;
  ticket_item_description: string;
  ticket_status: string;
  ticket_name: string;
  ticket_created_by: string;
  ticket_created_by_avatar: string;
  ticket_quantity: number;
  ticket_specifications: string;
  ticket_revised_by: string;
  ticket_revised_by_avatar: string;
  ticket_revised_by_name: string;
  ticket_rf_date_received: string;
  ticket_notes: string;
  ticket_created_by_name: string;
  reviewers: {
    reviewer_avatar: string;
    reviewer_id: string;
    reviewer_role: string;
    reviewer_name: string;
    approval_status: string;
  }[];
  approval_status: string;
  ticket_date_created: string;
  ticket_last_updated: string;
  shared_users: {
    user_id: string;
    user_avatar: string;
    user_full_name: string;
    user_email: string;
  }[];
};

export type DashboardTicketType = {
  ticket_id: string;
  ticket_status: string;
  ticket_name: string;
  ticket_item_name: string;
  ticket_date_created: string;
  ticket_revised_by: string;
  ticket_item_description: string;
};

export type MyTicketType = {
  ticket_id: string;
  ticket_status: string;
  ticket_name: string;
  ticket_item_name: string;
  ticket_item_description: string;
  ticket_notes: string;
  ticket_specifications: string;
  ticket_created_by: string;
  ticket_date_created: string;
  shared_user_id: string | null;
  approval_status: string | null;
  approval_reviewed_by: string | null;
  reviewers: {
    reviewer_id: string;
    reviewer_name: string;
    approval_status: string;
  }[];
  shared_users: {
    user_id: string;
  }[];
};

export type CanvassAttachment = {
  canvass_attachment_id: string;
  canvass_attachment_type: string | null;
  canvass_attachment_url: string | null;
  canvass_attachment_file_type: string | null;
  canvass_attachment_file_size: number | null;
  canvass_attachment_created_at: string;
};

export type QuotationAttachmentResult = {
  path?: string;
  publicUrl: string;
  fileType: string;
  fileSize: number;
  canvass_attachment_canvass_form_id?: string;
  canvass_attachment_type?: string;
  canvass_attachment_url?: string;
  canvass_attachment_file_type?: string;
  canvass_attachment_file_size?: number;
};

export type CanvassSubmitter = {
  user_id: string;
  user_full_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
};

export type CanvassDetail = {
  canvass_form_id: string;
  canvass_form_ticket_id: string;
  canvass_form_rf_date_received: string;
  canvass_form_recommended_supplier: string;
  canvass_form_lead_time_day: number;
  canvass_form_total_amount: number;
  canvass_form_payment_terms: string | null;
  canvass_form_submitted_by: string;
  canvass_form_date_submitted: string;
  canvass_form_updated_at: string;
  submitted_by: CanvassSubmitter;
  attachments: CanvassAttachment[];
};

export type NotificationType = {
  notification_id: string;
  notification_user_id: string;
  notification_message: string;
  notification_read: boolean;
  notification_ticket_id: string;
  notification_created_at: string;
};

export type CommentType = {
  comment_id: string;
  comment_ticket_id: string;
  comment_content: string;
  comment_date_created: string;
  comment_is_edited: boolean;
  comment_type: string;
  comment_last_updated: string;
  comment_user_id: string;
  comment_user_avatar: string;
  comment_user_full_name: string;
  replies: CommentType[];
};
