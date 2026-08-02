-- O backend NestJS acessa estes schemas por conexão direta como owner.
-- Nada aqui deve ser alcançável pela Data API (anon/authenticated).
-- RLS habilitada sem policies = deny-all para qualquer papel não-owner.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('analytics', 'dt_catalogo')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', t.schemaname, t.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA dt_catalogo FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA analytics FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA dt_catalogo FROM anon, authenticated;
REVOKE USAGE ON SCHEMA analytics FROM anon, authenticated;
REVOKE USAGE ON SCHEMA dt_catalogo FROM anon, authenticated;
