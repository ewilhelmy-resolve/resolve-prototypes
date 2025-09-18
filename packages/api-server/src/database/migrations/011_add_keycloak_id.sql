ALTER TABLE public.user_profiles
ADD COLUMN keycloak_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_keycloak_id_idx ON public.user_profiles(keycloak_id);

COMMENT ON COLUMN public.user_profiles.keycloak_id IS 'The unique subject identifier (sub) from Keycloak.';
