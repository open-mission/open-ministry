-- Substitui as helpers que chamavam auth.user_id() dentro de SECURITY DEFINER.
-- A extensão pg_session_jwt reseta request.jwt.claims quando auth.user_id() é
-- chamado nesse contexto; agora lemos o claim `sub` diretamente.
CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.organization_id
  FROM public.member m
  WHERE m.user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.member m
    WHERE m.organization_id = org_id
      AND m.user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      AND string_to_array(m.role, ',') && ARRAY['owner', 'admin']
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    OR EXISTS (
      SELECT 1
      FROM public.member viewer
      JOIN public.member target
        ON target.organization_id = viewer.organization_id
      WHERE viewer.user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        AND target.user_id = target_user_id
    )
$$;

REVOKE EXECUTE ON FUNCTION auth.user_id() FROM app_authenticated;
