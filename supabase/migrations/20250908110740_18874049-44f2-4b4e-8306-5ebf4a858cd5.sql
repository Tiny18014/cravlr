-- First, let's delete the existing test accounts that don't have proper authentication
DELETE FROM auth.users WHERE email IN (
  'owner@joes-pizza.com', 
  'manager@mamas-kitchen.com', 
  'chef@the-golden-spoon.com'
);

-- Create a function to properly create test users with authentication
CREATE OR REPLACE FUNCTION create_test_business_user(
  user_email TEXT,
  user_password TEXT,
  user_display_name TEXT,
  restaurant_name TEXT,
  phone_number TEXT
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user through auth system
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'display_name', user_display_name,
      'user_type', 'business'
    ),
    false,
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Create business claim for the user
  INSERT INTO public.business_claims (
    id,
    user_id,
    restaurant_name,
    business_email,
    business_phone,
    phone_verified,
    email_verified,
    status,
    verification_step,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    restaurant_name,
    user_email,
    phone_number,
    true,
    true,
    'verified',
    'complete',
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$;

-- Create the test business accounts with proper authentication
SELECT create_test_business_user(
  'owner@joes-pizza.com',
  'password123', 
  'Joe Martinez',
  'Joe''s Pizza Palace',
  '+1-555-0101'
);

SELECT create_test_business_user(
  'manager@mamas-kitchen.com',
  'password123',
  'Maria Rodriguez', 
  'Mama''s Kitchen',
  '+1-555-0102'
);

SELECT create_test_business_user(
  'chef@the-golden-spoon.com',
  'password123',
  'David Chen',
  'The Golden Spoon', 
  '+1-555-0103'
);