-- Seeder for auth.users table
CREATE OR REPLACE FUNCTION create_seed_users()
RETURNS void AS $$
DECLARE
  user_id1 UUID;
  user_id2 UUID;
  user_id3 UUID;
  user_id4 UUID;
BEGIN
  -- Insert into auth.users
  
  -- User 1: Admin
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('password', gen_salt('bf')), 
    NOW(),
    NOW(),
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User", "full_name":"Admin User"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    '',
    ''
  ) RETURNING id INTO user_id1;

  -- User 2: Purchaser
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'purchaser@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Purchaser User", "full_name":"Purchaser User"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    '',
    ''
  ) RETURNING id INTO user_id2;

  -- User 3: Reviewer
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'reviewer@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Reviewer User", "full_name":"Reviewer User"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    '',
    ''
  ) RETURNING id INTO user_id3;

  -- User 4: Manager
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'manager@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Manager User", "full_name":"Manager User"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    '',
    ''
  ) RETURNING id INTO user_id4;
  
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create users
SELECT create_seed_users();

-- Clean up (optional - remove the function after running)
DROP FUNCTION create_seed_users();