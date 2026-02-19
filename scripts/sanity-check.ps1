param(
  [switch]$SkipE2E
)

$ErrorActionPreference = "Stop"

Write-Host "[sanity] Iniciando verificacoes de estabilizacao..."

$requiredMigrations = @(
  "supabase/migrations/20260219170000_crm_maturity_phase1.sql",
  "supabase/migrations/20260219174000_crm_maturity_phase2.sql",
  "supabase/migrations/20260219181000_crm_maturity_phase3_lgpd.sql",
  "supabase/migrations/20260219190000_crm_maturity_phase4.sql",
  "supabase/migrations/20260219193000_crm_maturity_phase5.sql",
  "supabase/migrations/20260219195000_crm_maturity_phase6.sql",
  "supabase/migrations/20260219200000_crm_maturity_phase6_tuning.sql",
  "supabase/migrations/20260219203000_crm_priority_weights_user_config.sql",
  "supabase/migrations/20260219210000_crm_retention_policy.sql"
)

foreach ($file in $requiredMigrations) {
  if (-not (Test-Path $file)) {
    throw "[sanity] Migration obrigatoria ausente: $file"
  }
}

Write-Host "[sanity] Migrations obrigatorias: OK"

.\scripts\hardening-audit.ps1

npm run lint
npm run build

if (-not $SkipE2E) {
  npm run e2e
}
else {
  Write-Host "[sanity] E2E pulado por parametro -SkipE2E"
}

Write-Host "[sanity] Verificacoes concluidas com sucesso."
