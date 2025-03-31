-- ENUM TYPES
CREATE TYPE ticket_status_enum AS ENUM (
    'FOR CANVASS', 'WORK IN PROGRESS', 'FOR APPROVAL', 'DONE', 'CANCELED', 'FOR REVIEW OF SUBMISSIONS', 'DECLINED'
);

create policy "Allow authenticated users to insert" 
on storage.objects 
for insert 
to authenticated 
with check (auth.uid() is not null);

create policy "Allow authenticated users to delete" 
on storage.objects 
for delete 
to authenticated 
using (auth.uid() is not null);

create policy "Allow authenticated users to select" 
on storage.objects 
for select 
to authenticated 
using (auth.uid() is not null);

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (auth.uid() = owner);

CREATE POLICY "Allow public read access to avatars"
ON storage.objects
FOR SELECT
USING (TRUE);

CREATE TYPE approval_status_enum AS ENUM ('APPROVED', 'REJECTED', 'PENDING', 'AWAITING ACTION');
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'PURCHASER', 'REVIEWER', 'MANAGER');

-- USER TABLE (Manages User Roles)
DROP TABLE IF EXISTS user_table CASCADE;
CREATE TABLE user_table (
    user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    user_role user_role_enum DEFAULT 'PURCHASER' NOT NULL,
    user_avatar TEXT,
    user_full_name TEXT,
    user_email TEXT
);

-- Enable Row-Level Security
ALTER TABLE public.user_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT
DROP POLICY IF EXISTS select_users ON public.user_table;
CREATE POLICY select_users 
ON public.user_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT
DROP POLICY IF EXISTS insert_users ON public.user_table;
CREATE POLICY insert_users 
ON public.user_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE
DROP POLICY IF EXISTS update_users ON public.user_table;
CREATE POLICY update_users 
ON public.user_table 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to DELETE
DROP POLICY IF EXISTS delete_users ON public.user_table;
CREATE POLICY delete_users 
ON public.user_table 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- TICKET TABLE (Tracks Canvassing Requests)
DROP TABLE IF EXISTS ticket_table CASCADE;
CREATE TABLE public.ticket_table (
  ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_item_name TEXT NOT NULL,
  ticket_item_description TEXT NOT NULL,
  ticket_quantity INT NOT NULL CHECK (ticket_quantity > 0), 
  ticket_specifications TEXT,
  ticket_notes TEXT,
  ticket_name TEXT NOT NULL UNIQUE,  -- ticket_name is now UNIQUE
  ticket_status ticket_status_enum NOT NULL DEFAULT 'FOR CANVASS', 
  ticket_created_by UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE CASCADE,
  ticket_rf_date_received TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL,
  ticket_date_created TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()),
  ticket_last_updated TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) 
);

CREATE OR REPLACE FUNCTION get_next_ticket_sequence(date_prefix TEXT)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    SELECT nextval('public.ticket_name_seq') INTO next_val;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE SEQUENCE IF NOT EXISTS public.ticket_name_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 99999
    START WITH 1
    CACHE 1;

-- Index for ticket name for faster lookup
CREATE INDEX idx_ticket_name ON public.ticket_table(ticket_name);

-- Enable RLS
ALTER TABLE public.ticket_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT
DROP POLICY IF EXISTS select_tickets ON public.ticket_table;
CREATE POLICY select_tickets 
ON public.ticket_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT
DROP POLICY IF EXISTS insert_tickets ON public.ticket_table;
CREATE POLICY insert_tickets 
ON public.ticket_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE
DROP POLICY IF EXISTS update_tickets ON public.ticket_table;
CREATE POLICY update_tickets 
ON public.ticket_table 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to DELETE
DROP POLICY IF EXISTS delete_tickets ON public.ticket_table;
CREATE POLICY delete_tickets 
ON public.ticket_table 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- create comment_table
DROP TABLE IF EXISTS comment_table CASCADE;
CREATE TABLE comment_table (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_ticket_id UUID NOT NULL,
  comment_content TEXT NOT NULL,
  comment_date_created TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL,
  comment_is_edited BOOLEAN DEFAULT FALSE,
  comment_is_disabled BOOLEAN DEFAULT FALSE,
  comment_type TEXT NOT NULL,
  comment_last_updated TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL,
  comment_user_id UUID NOT NULL,  
  FOREIGN KEY (comment_user_id) REFERENCES user_table(user_id), 
  FOREIGN KEY (comment_ticket_id) REFERENCES ticket_table(ticket_id) ON DELETE CASCADE 
);

-- Enable RLS
ALTER TABLE public.comment_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT comments
DROP POLICY IF EXISTS select_comments ON public.comment_table;
CREATE POLICY select_comments 
ON public.comment_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT comments
DROP POLICY IF EXISTS insert_comments ON public.comment_table;
CREATE POLICY insert_comments 
ON public.comment_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE their own comments
DROP POLICY IF EXISTS update_comments ON public.comment_table;
CREATE POLICY update_comments 
ON public.comment_table 
FOR UPDATE 
USING (auth.uid() = comment_user_id) -- Users can only update their own comments

-- Allow all authenticated users to DELETE their own comments
DROP POLICY IF EXISTS delete_comments ON public.comment_table;
CREATE POLICY "Users can delete their own comments, Admins & Managers can delete any"
ON public.comment_table
FOR DELETE
USING (
  auth.uid() = comment_user_id
  OR (SELECT user_role FROM public.user_table WHERE user_id = auth.uid()) IN ('ADMIN', 'MANAGER')
);

--comment reply table
DROP TABLE IF EXISTS comment_reply_table CASCADE;
CREATE TABLE comment_reply_table (
  reply_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_parent_comment_id UUID NOT NULL,
  reply_child_comment_id UUID NOT NULL,
  FOREIGN KEY (reply_parent_comment_id) REFERENCES comment_table(comment_id),
  FOREIGN KEY (reply_child_comment_id) REFERENCES comment_table(comment_id)
);

ALTER TABLE public.comment_reply_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view replies
DROP POLICY IF EXISTS select_comment_replies ON public.comment_reply_table;
CREATE POLICY select_comment_replies 
ON public.comment_reply_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert replies
DROP POLICY IF EXISTS insert_comment_replies ON public.comment_reply_table;
CREATE POLICY insert_comment_replies 
ON public.comment_reply_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to delete only their own replies
DROP POLICY IF EXISTS delete_comment_replies ON public.comment_reply_table;
CREATE POLICY delete_comment_replies 
ON public.comment_reply_table 
FOR DELETE 
USING (
  auth.uid() IN (
    SELECT c.comment_user_id 
    FROM public.comment_table c 
    WHERE c.comment_id = comment_reply_table.reply_child_comment_id
  ) 
  OR (SELECT user_role FROM public.user_table WHERE user_id = auth.uid()) IN ('ADMIN', 'MANAGER') 
  -- Admins & Managers can delete any comment reply
);

-- Allow users to update only their own replies
DROP POLICY IF EXISTS update_comment_replies ON public.comment_reply_table;
CREATE POLICY update_comment_replies 
ON public.comment_reply_table 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT c.comment_user_id 
    FROM public.comment_table c 
    WHERE c.comment_id = comment_reply_table.reply_child_comment_id
  ) -- Only the user who created the reply can update it
);

-- DROP TABLE IF EXISTS
DROP TABLE IF EXISTS ticket_shared_with_table cascade;
CREATE TABLE public.ticket_shared_with_table (
    ticket_id UUID NOT NULL REFERENCES public.ticket_table(ticket_id) ON DELETE CASCADE,
    shared_user_id UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()), 
    assigned_by UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, shared_user_id)
);

-- Enable RLS
ALTER TABLE public.ticket_shared_with_table ENABLE ROW LEVEL SECURITY;

-- Allow shared users to SELECT their shared tickets
DROP POLICY IF EXISTS select_shared_tickets ON public.ticket_shared_with_table;
CREATE POLICY select_shared_tickets
ON public.ticket_shared_with_table
FOR SELECT
USING (
  auth.uid() = shared_user_id
  OR (SELECT user_role FROM public.user_table WHERE user_id = auth.uid()) IN ('ADMIN', 'MANAGER')
);

-- Allow ticket owners & admins/managers to share tickets (INSERT)
DROP POLICY IF EXISTS insert_shared_tickets ON public.ticket_shared_with_table;
CREATE POLICY insert_shared_tickets
ON public.ticket_shared_with_table
FOR INSERT
WITH CHECK (
  auth.uid() = assigned_by
  OR (SELECT user_role FROM public.user_table WHERE user_id = auth.uid()) IN ('ADMIN', 'MANAGER')
);

-- Allow ticket owners & admins/managers to remove shared users (DELETE)
DROP POLICY IF EXISTS delete_shared_tickets ON public.ticket_shared_with_table;
CREATE POLICY delete_shared_tickets
ON public.ticket_shared_with_table
FOR DELETE
USING (
  auth.uid() = assigned_by
  OR (SELECT user_role FROM public.user_table WHERE user_id = auth.uid()) IN ('ADMIN', 'MANAGER')
);

-- CANVASS FORM TABLE (Stores Supplier Quotes & Submissions)
DROP TABLE IF EXISTS canvass_form_table CASCADE;
CREATE TABLE public.canvass_form_table (
    canvass_form_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvass_form_ticket_id UUID NOT NULL REFERENCES public.ticket_table(ticket_id) ON DELETE CASCADE,
    canvass_form_rf_date_received TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL,
    canvass_form_recommended_supplier TEXT NOT NULL,
    canvass_form_lead_time_day INT NOT NULL CHECK (canvass_form_lead_time_day > 0),
    canvass_form_total_amount DECIMAL(10,2) NOT NULL CHECK (canvass_form_total_amount > 0), 
    canvass_form_payment_terms TEXT,
    canvass_form_submitted_by UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE SET NULL,
    canvass_form_date_submitted TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.canvass_form_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT canvass forms
DROP POLICY IF EXISTS select_canvass_forms ON public.canvass_form_table;
CREATE POLICY select_canvass_forms 
ON public.canvass_form_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT new canvass forms
DROP POLICY IF EXISTS insert_canvass_forms ON public.canvass_form_table;
CREATE POLICY insert_canvass_forms 
ON public.canvass_form_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE any canvass form
DROP POLICY IF EXISTS update_canvass_forms ON public.canvass_form_table;
CREATE POLICY update_canvass_forms 
ON public.canvass_form_table 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to DELETE any canvass form
DROP POLICY IF EXISTS delete_canvass_forms ON public.canvass_form_table;
CREATE POLICY delete_canvass_forms 
ON public.canvass_form_table 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- CANVASS ATTACHMENT TABLE (Stores Canvass Attachments)
DROP TABLE IF EXISTS canvass_attachment_table CASCADE;
CREATE TABLE public.canvass_attachment_table (
    canvass_attachment_id UUID NOT NULL DEFAULT gen_random_uuid(),
    canvass_attachment_canvass_form_id UUID NULL DEFAULT gen_random_uuid(),
    canvass_attachment_type TEXT NULL,
    canvass_attachment_url TEXT NULL,
    canvass_attachment_created_at TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL,
    CONSTRAINT canvass_attachment_table_pkey PRIMARY KEY (canvass_attachment_id),
    CONSTRAINT canvass_attachment_table_canvass_attachment_canvass_form_id_fkey
        FOREIGN KEY (canvass_attachment_canvass_form_id)
        REFERENCES canvass_form_table (canvass_form_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) TABLESPACE pg_default;
-- Enable RLS
ALTER TABLE public.canvass_attachment_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT canvass attachments
DROP POLICY IF EXISTS select_canvass_attachments ON public.canvass_attachment_table;
CREATE POLICY select_canvass_attachments 
ON public.canvass_attachment_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT canvass attachments
DROP POLICY IF EXISTS insert_canvass_attachments ON public.canvass_attachment_table;
CREATE POLICY insert_canvass_attachments 
ON public.canvass_attachment_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE their own attachments
DROP POLICY IF EXISTS update_canvass_attachments ON public.canvass_attachment_table;
CREATE POLICY update_canvass_attachments 
ON public.canvass_attachment_table 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to DELETE their own attachments
DROP POLICY IF EXISTS delete_canvass_attachments ON public.canvass_attachment_table;
CREATE POLICY delete_canvass_attachments 
ON public.canvass_attachment_table 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- APPROVAL TABLE (Tracks Review & Approvals)
DROP TABLE IF EXISTS approval_table CASCADE;
CREATE TABLE public.approval_table (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_ticket_id UUID NOT NULL REFERENCES public.ticket_table(ticket_id) ON DELETE CASCADE,
    approval_reviewed_by UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE CASCADE,
    approval_review_status approval_status_enum NOT NULL, 
    approval_review_date TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.approval_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT approvals
DROP POLICY IF EXISTS select_approvals ON public.approval_table;
CREATE POLICY select_approvals 
ON public.approval_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT approvals
DROP POLICY IF EXISTS insert_approvals ON public.approval_table;
CREATE POLICY insert_approvals 
ON public.approval_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE approvals
DROP POLICY IF EXISTS update_approvals ON public.approval_table;
CREATE POLICY update_approvals 
ON public.approval_table 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to DELETE approvals
DROP POLICY IF EXISTS delete_approvals ON public.approval_table;
CREATE POLICY delete_approvals 
ON public.approval_table 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- TICKET STATUS HISTORY TABLE (Tracks Status Changes for Workflow)
DROP TABLE IF EXISTS ticket_status_history_table CASCADE;
CREATE TABLE public.ticket_status_history_table (
    ticket_status_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_status_history_ticket_id UUID NOT NULL REFERENCES public.ticket_table(ticket_id) ON DELETE CASCADE,
    ticket_status_history_previous_status ticket_status_enum NOT NULL, 
    ticket_status_history_new_status ticket_status_enum NOT NULL, 
    ticket_status_history_changed_by UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE CASCADE,
    ticket_status_history_change_date TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ticket_status_history_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT ticket status history
DROP POLICY IF EXISTS select_ticket_status_history ON public.ticket_status_history_table;
CREATE POLICY select_ticket_status_history 
ON public.ticket_status_history_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT ticket status history
DROP POLICY IF EXISTS insert_ticket_status_history ON public.ticket_status_history_table;
CREATE POLICY insert_ticket_status_history 
ON public.ticket_status_history_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE ticket status history
DROP POLICY IF EXISTS update_ticket_status_history ON public.ticket_status_history_table;
CREATE POLICY update_ticket_status_history 
ON public.ticket_status_history_table 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to DELETE ticket status history
DROP POLICY IF EXISTS delete_ticket_status_history ON public.ticket_status_history_table;
CREATE POLICY delete_ticket_status_history 
ON public.ticket_status_history_table 
FOR DELETE 
USING (auth.role() = 'authenticated');

DROP TABLE IF EXISTS notification_table CASCADE;
CREATE TABLE notification_table (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_user_id UUID NOT NULL REFERENCES public.user_table(user_id) ON DELETE CASCADE,
  notification_message TEXT NOT NULL,
  notification_read BOOLEAN DEFAULT FALSE,
  notification_url TEXT NULL,
  notification_created_at TIMESTAMPTZ DEFAULT timezone('Asia/Manila', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_table ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT notifications
DROP POLICY IF EXISTS select_notifications ON public.notification_table;
CREATE POLICY select_notifications 
ON public.notification_table 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to INSERT notifications
DROP POLICY IF EXISTS insert_notifications ON public.notification_table;
CREATE POLICY insert_notifications 
ON public.notification_table 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to UPDATE their own notifications
DROP POLICY IF EXISTS update_notifications ON public.notification_table;
CREATE POLICY update_notifications 
ON public.notification_table 
FOR UPDATE 
USING (auth.uid() = notification_user_id);

-- Allow all authenticated users to DELETE their own notifications
DROP POLICY IF EXISTS delete_notifications ON public.notification_table;
CREATE POLICY delete_notifications 
ON public.notification_table 
FOR DELETE 
USING (auth.uid() = notification_user_id);

-- Enable Supabase Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE notification_table;

-- GRANT Permissions (Ensure Permissions Are Set)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvass_form_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_status_history_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_shared_with_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvass_attachment_table TO authenticated;

CREATE OR REPLACE FUNCTION public.create_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_table (
    user_id, 
    user_full_name, 
    user_email,
    user_avatar
  )
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      NEW.raw_user_meta_data->>'full_name', 
      'Unnamed User'
    ), 
    COALESCE(NEW.email, ''), -- Prevent NULL email issues
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (user_id) DO NOTHING; -- Avoid duplicate inserts

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS after_user_signup ON auth.users;
CREATE TRIGGER after_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user();

DROP FUNCTION IF EXISTS get_dashboard_tickets(UUID);
CREATE OR REPLACE FUNCTION get_dashboard_tickets(_user_id UUID)
RETURNS TABLE (
  ticket_id UUID,
  ticket_name TEXT,
  ticket_item_name TEXT,
  ticket_status TEXT,
  ticket_item_description TEXT,
  ticket_date_created TIMESTAMPTZ
)
LANGUAGE SQL
SET search_path TO public  -- Ensures function runs in the correct schema
AS $$
  SELECT 
    t.ticket_id,
    t.ticket_name, 
    t.ticket_item_name,
    t.ticket_status,
    t.ticket_item_description,
    t.ticket_date_created  -- No timezone conversion
  FROM 
    public.ticket_table t
  WHERE 
    _user_id IS NULL 
    OR t.ticket_created_by = _user_id
    OR EXISTS (
      SELECT 1 FROM public.ticket_shared_with_table s
      WHERE s.ticket_id = t.ticket_id AND s.shared_user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.approval_table a
      WHERE a.approval_ticket_id = t.ticket_id 
      AND a.approval_reviewed_by = _user_id
    )
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_all_my_tickets(UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION get_all_my_tickets(
  user_id UUID, 
  ticket_status TEXT DEFAULT NULL, 
  ticket_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  ticket_id UUID,
  ticket_name TEXT, 
  ticket_item_name TEXT,
  ticket_status TEXT,
  ticket_item_description TEXT,
  ticket_created_by UUID,
  ticket_date_created TIMESTAMPTZ,
  shared_users JSON,
  reviewers JSON
)
LANGUAGE sql
SET search_path TO public  -- Ensures function runs in the correct schema
AS $$  
  SELECT
    t.ticket_id,
    t.ticket_name, 
    t.ticket_item_name,
    t.ticket_status,
    t.ticket_item_description,
    t.ticket_created_by,
    t.ticket_date_created, -- No timezone conversion

    -- Aggregate shared users
    COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'user_id', u2.user_id,
          'user_full_name', u2.user_full_name,
          'user_email', u2.user_email,
          'user_avatar', u2.user_avatar
        )
      ) FROM public.ticket_shared_with_table ts
      LEFT JOIN public.user_table u2 ON ts.shared_user_id = u2.user_id
      WHERE ts.ticket_id = t.ticket_id), '[]'::JSON
    ) AS shared_users,

    -- Aggregate reviewers
    COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'reviewer_id', a.approval_reviewed_by,
          'reviewer_name', u3.user_full_name,
          'approval_status', a.approval_review_status
        )
      ) FROM public.approval_table a
      LEFT JOIN public.user_table u3 ON u3.user_id = a.approval_reviewed_by
      WHERE a.approval_ticket_id = t.ticket_id), '[]'::JSON
    ) AS reviewers

  FROM
    public.ticket_table t -- No need to sort before JOIN

  WHERE
    user_id IN (t.ticket_created_by)
    OR EXISTS (SELECT 1 FROM public.ticket_shared_with_table ts WHERE ts.ticket_id = t.ticket_id AND ts.shared_user_id = user_id)
    OR EXISTS (SELECT 1 FROM public.approval_table a WHERE a.approval_ticket_id = t.ticket_id AND a.approval_reviewed_by = user_id)
    AND (ticket_status IS NULL OR t.ticket_status = ticket_status)
    AND (ticket_uuid IS NULL OR t.ticket_id = ticket_uuid)

  ORDER BY
    t.ticket_date_created DESC
$$;

--view for realtime comment
create view public.comment_with_avatar_view with (security_invoker = on) as
 SELECT c.comment_id,
    c.comment_ticket_id,
    c.comment_content,
    c.comment_date_created,
    c.comment_is_edited,
    c.comment_is_disabled,
    c.comment_type,
    c.comment_last_updated,
    c.comment_user_id,
    u.user_full_name AS comment_user_full_name,
    u.user_avatar AS comment_user_avatar
   FROM comment_table c
   LEFT JOIN user_table u ON c.comment_user_id = u.user_id;

-- Function for fetching comments with avatars
DROP FUNCTION IF EXISTS get_comments_with_avatars(UUID);
CREATE OR REPLACE FUNCTION get_comments_with_avatars(ticket_id UUID)
RETURNS TABLE(
  comment_id UUID,
  comment_ticket_id UUID,
  comment_content TEXT,
  comment_date_created TIMESTAMPTZ,
  comment_is_edited BOOLEAN,
  comment_is_disabled BOOLEAN,
  comment_type TEXT,
  comment_last_updated TIMESTAMPTZ,
  comment_user_id UUID,
  comment_user_avatar TEXT,
  comment_user_full_name TEXT -- Add full name column
) 
LANGUAGE sql
SET search_path TO public  -- Ensures function runs in the correct schema
AS $$

  SELECT
    c.comment_id,
    c.comment_ticket_id,
    c.comment_content,
    c.comment_date_created, -- No timezone conversion
    c.comment_is_edited,
    c.comment_is_disabled,
    c.comment_type,
    c.comment_last_updated, -- No timezone conversion
    c.comment_user_id,
    u.user_avatar AS comment_user_avatar,
    u.user_full_name AS comment_user_full_name
  FROM
    public.comment_table c
  LEFT JOIN
    public.user_table u ON c.comment_user_id = u.user_id
  WHERE
    c.comment_ticket_id = ticket_id
    AND c.comment_type = 'COMMENT'
  ORDER BY c.comment_date_created ASC; -- No timezone conversion in ORDER BY
$$;

-- Function for getting specific ticket
DROP FUNCTION IF EXISTS get_ticket_details(UUID); 
CREATE OR REPLACE FUNCTION get_ticket_details(ticket_uuid UUID) 
RETURNS TABLE (   
  ticket_id UUID,   
  ticket_name TEXT,    
  ticket_item_name TEXT,    
  ticket_item_description TEXT,   
  ticket_status TEXT,   
  ticket_created_by UUID,   
  ticket_created_by_name TEXT,    
  ticket_created_by_avatar TEXT,    
  ticket_quantity INTEGER,   
  ticket_specifications TEXT,   
  approval_status TEXT,   
  ticket_date_created TIMESTAMPTZ,   
  ticket_last_updated TIMESTAMPTZ,   
  ticket_notes TEXT,   
  ticket_rf_date_received TIMESTAMPTZ,    
  shared_users JSON,   
  reviewers JSON 
) 
LANGUAGE SQL 
SET search_path TO public  -- Ensures function runs in the correct schema
AS $$    
SELECT     
  t.ticket_id,    
  t.ticket_name,    
  t.ticket_item_name,     
  t.ticket_item_description,    
  t.ticket_status,    
  t.ticket_created_by,     
  u.user_full_name AS ticket_created_by_name,    
  u.user_avatar AS ticket_created_by_avatar,       
  t.ticket_quantity,    
  t.ticket_specifications,     

  -- Get the most recent approval status (or fallback to 'PENDING')
  COALESCE(      
    (        
      SELECT a.approval_review_status        
      FROM public.approval_table a        
      WHERE a.approval_ticket_id = t.ticket_id        
      ORDER BY a.approval_review_date DESC  
      LIMIT 1      
    ), 
    'PENDING'    
  ) AS approval_status,     

  -- Keep timestamps in UTC and format them in the frontend
  t.ticket_date_created,    
  t.ticket_last_updated,    
  t.ticket_notes,    
  t.ticket_rf_date_received,     

  -- Shared Users JSON
  (
    SELECT COALESCE(        
      JSON_AGG(          
        JSON_BUILD_OBJECT(            
          'user_id', u2.user_id,            
          'user_full_name', u2.user_full_name,            
          'user_email', u2.user_email,            
          'user_avatar', u2.user_avatar           
        )        
      ), '[]'      
    )      
    FROM public.ticket_shared_with_table ts      
    LEFT JOIN public.user_table u2 ON u2.user_id = ts.shared_user_id      
    WHERE ts.ticket_id = t.ticket_id    
  )::JSON AS shared_users,     

  -- Reviewers JSON (now includes user_role)
  (      
    SELECT COALESCE(        
      JSON_AGG(          
        JSON_BUILD_OBJECT(            
          'reviewer_id', a.approval_reviewed_by,            
          'reviewer_name', u3.user_full_name,            
          'reviewer_avatar', u3.user_avatar,             
          'reviewer_role', u3.user_role,  
          'approval_status', a.approval_review_status          
        )        
      ), '[]'      
    )      
    FROM public.approval_table a      
    LEFT JOIN public.user_table u3 ON u3.user_id = a.approval_reviewed_by      
    WHERE a.approval_ticket_id = t.ticket_id    
  )::JSON AS reviewers   

FROM     
  public.ticket_table t   
LEFT JOIN public.user_table u ON u.user_id = t.ticket_created_by   
WHERE t.ticket_id = ticket_uuid;  
$$;

-- share ticket function
DROP FUNCTION IF EXISTS public.share_ticket(uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.share_ticket(
  _ticket_id uuid,
  _shared_user_id uuid,
  _assigned_by uuid
)
RETURNS void
LANGUAGE sql
SET search_path TO public
AS $$
  INSERT INTO public.ticket_shared_with_table (
    ticket_id,
    shared_user_id,
    assigned_by
  )
  SELECT 
    _ticket_id,
    _shared_user_id,
    _assigned_by
  FROM public.ticket_table
  WHERE ticket_id = _ticket_id
  AND ticket_created_by != _shared_user_id;
$$;

CREATE OR REPLACE FUNCTION public.add_comment_with_notification(
  p_ticket_id UUID,
  p_content TEXT,
  p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_comment_id UUID;
  v_commenter_role user_role_enum;
  v_target_user_id UUID;
  v_commenter_name TEXT;
  v_ticket_creator_id UUID;
BEGIN
  -- Get the role and name of the user who is commenting
  SELECT user_role, user_full_name
  INTO v_commenter_role, v_commenter_name
  FROM user_table
  WHERE user_id = p_user_id;

  -- Get the ticket creator's ID
  SELECT ticket_created_by
  INTO v_ticket_creator_id
  FROM ticket_table
  WHERE ticket_id = p_ticket_id;

  -- Insert the comment
  INSERT INTO comment_table (
    comment_ticket_id,
    comment_content,
    comment_type,
    comment_date_created,
    comment_is_edited,
    comment_user_id
  ) VALUES (
    p_ticket_id,
    p_content,
    'COMMENT',
    now(),  -- Store timestamps in UTC
    false,
    p_user_id
  ) RETURNING comment_id INTO v_comment_id;

  -- Determine the target user for notification based on commenter's role
  IF v_commenter_role = 'REVIEWER' THEN
    -- If commenter is REVIEWER, notify the ticket creator (PURCHASER)
    v_target_user_id := v_ticket_creator_id;
  ELSE
    -- If commenter is PURCHASER, notify a REVIEWER
    SELECT user_id INTO v_target_user_id
    FROM user_table
    WHERE user_role = 'REVIEWER'
    LIMIT 1;
  END IF;

  -- Insert the notification
  INSERT INTO notification_table (
    notification_user_id,
    notification_message,
    notification_url,
    notification_read
  ) VALUES (
    v_target_user_id,
    v_commenter_name || ' has added a new comment on ticket ' || p_ticket_id,
    '/tickets/' || p_ticket_id,
    false
  );

  RETURN v_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_password_exists(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO public, auth  -- Ensures access to both schemas
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = user_id 
      AND encrypted_password IS NOT NULL 
      AND encrypted_password <> ''
  );
END;
$$;