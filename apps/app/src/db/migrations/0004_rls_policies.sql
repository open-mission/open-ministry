CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

-- Cria o role sem senha; scripts/setup-app-role.mjs habilita LOGIN e define a
-- senha/URL autenticada. Isso permite aplicar as migrations em um banco novo
-- antes de gerar a credencial da aplicação.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_authenticated') THEN
    CREATE ROLE app_authenticated NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

-- pg_session_jwt auth.user_id() reseta request.jwt.claims quando chamado pela
-- primeira vez dentro de uma função SECURITY DEFINER. Por isso as helpers leem
-- o claim `sub` diretamente. O claim é definido pelo servidor na mesma
-- transação da query e não vem do cliente.
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

REVOKE ALL ON FUNCTION public.current_user_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_user(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO app_authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(text) TO app_authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_user(text) TO app_authenticated;

ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_select_authenticated ON public.organization;
CREATE POLICY organization_select_authenticated ON public.organization
  FOR SELECT TO app_authenticated
  USING (id IN (SELECT public.current_user_org_ids()));

DROP POLICY IF EXISTS member_select_authenticated ON public.member;
CREATE POLICY member_select_authenticated ON public.member
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));

DROP POLICY IF EXISTS invitation_admin_authenticated ON public.invitation;
CREATE POLICY invitation_admin_authenticated ON public.invitation
  FOR ALL TO app_authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS user_select_authenticated ON public."user";
CREATE POLICY user_select_authenticated ON public."user"
  FOR SELECT TO app_authenticated
  USING (public.can_view_user(id));

GRANT USAGE ON SCHEMA public TO app_authenticated;
GRANT SELECT ON public.organization, public.member, public.invitation, public."user" TO app_authenticated;
