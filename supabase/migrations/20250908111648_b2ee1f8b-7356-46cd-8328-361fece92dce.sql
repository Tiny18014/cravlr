-- Manually confirm the test email
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'test@joes-pizza.com';