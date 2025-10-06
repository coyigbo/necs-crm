-- Database trigger to automatically create organizations when users sign up
-- This replaces the need for Auth Hooks

-- Create a function that calls the org-link edge function
CREATE OR REPLACE FUNCTION trigger_org_creation()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  payload JSONB;
  response TEXT;
BEGIN
  -- Get the function URL from environment or set it manually
  function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/org-link';
  
  -- Prepare the payload
  payload := jsonb_build_object(
    'type', 'signup',
    'user', jsonb_build_object(
      'id', NEW.id,
      'email', NEW.email,
      'user_metadata', NEW.raw_user_meta_data
    )
  );
  
  -- Call the edge function (this requires pg_net extension)
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload::text
    );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_org_creation();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION trigger_org_creation() TO postgres;
