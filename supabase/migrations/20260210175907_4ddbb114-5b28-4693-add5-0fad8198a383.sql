
-- Seed initial superadmin + admin roles for the owner (pa@troistiers.space)
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('d09f73a7-86c1-4862-ba19-98f4a4d0b4dc', 'superadmin'),
  ('d09f73a7-86c1-4862-ba19-98f4a4d0b4dc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Security-definer function to enforce superadmin-only role changes
-- with "at least one superadmin" safety rule
CREATE OR REPLACE FUNCTION public.set_user_role(
  _actor_id uuid,
  _target_user_id uuid,
  _role app_role,
  _grant boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _superadmin_count int;
BEGIN
  IF NOT public.has_role(_actor_id, 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can modify roles';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF _role = 'superadmin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_target_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  ELSE
    IF _role = 'superadmin' THEN
      SELECT count(*) INTO _superadmin_count
      FROM public.user_roles WHERE role = 'superadmin';
      IF _superadmin_count <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last superadmin';
      END IF;
    END IF;

    IF _role = 'admin' THEN
      IF public.has_role(_target_user_id, 'superadmin') THEN
        SELECT count(*) INTO _superadmin_count
        FROM public.user_roles WHERE role = 'superadmin';
        IF _superadmin_count <= 1 THEN
          RAISE EXCEPTION 'Cannot remove admin from the last superadmin';
        END IF;
        DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = 'superadmin';
      END IF;
    END IF;

    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  END IF;
END;
$$;

-- RLS policies for user_roles
CREATE POLICY "Anyone can read user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only superadmins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Only superadmins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));
