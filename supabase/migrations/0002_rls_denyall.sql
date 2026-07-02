-- ============================================================
-- 0002_rls_denyall.sql — Defense in depth.
-- Enable RLS with ZERO policies (deny-all). The app uses the
-- service_role key server-side, which BYPASSES RLS, so the app
-- keeps working. If the project URL/anon key ever leaks, the
-- database stays locked (no anon/public access whatsoever).
-- ============================================================

alter table words          enable row level security;
alter table grammar_topics enable row level security;
alter table exercises      enable row level security;
alter table attempts       enable row level security;

-- Intentionally NO policies: default-deny for every non-service role.
