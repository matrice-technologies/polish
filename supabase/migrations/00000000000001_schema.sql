-- Baseline privileges for the public schema.
--
-- Polish has accounts and nothing above them: every row belongs to one person,
-- and each table's own policies say "it is yours". RLS filters rows; grants
-- decide whether a role may reach a table at all. Both layers are needed — a
-- policy on a table `authenticated` has no privilege on is unreachable, and a
-- grant with no policy exposes everything.
--
-- Some Supabase instances blanket-grant every privilege on new public tables to
-- anon and authenticated, so each table also revokes before it grants (see the
-- Polish migration). This sets the starting point.

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to anon, authenticated, service_role;

-- The server uses the service role for the paths RLS cannot express: the
-- desktop sign-in, done before the app has a session of its own.
grant all on all tables in schema public to service_role;
grant all on all routines in schema public to service_role;
grant all on all sequences in schema public to service_role;
