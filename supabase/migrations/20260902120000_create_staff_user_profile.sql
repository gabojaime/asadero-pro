CREATE OR REPLACE FUNCTION public.create_staff_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role user_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_merchant_id uuid;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT merchant_id
  INTO v_merchant_id
  FROM public.users
  WHERE id = v_admin_id
    AND role = 'admin';

  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'profile_exists';
  END IF;

  IF trim(p_email) = '' OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  INSERT INTO public.users (id, merchant_id, email, full_name, role)
  VALUES (p_user_id, v_merchant_id, trim(p_email), trim(p_full_name), p_role);

  RETURN p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_user_profile(uuid, text, text, user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_user_profile(uuid, text, text, user_role) TO authenticated;
