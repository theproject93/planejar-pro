param(
  [string]$MigrationsPath = "supabase/migrations"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MigrationsPath)) {
  throw "Caminho de migrations nao encontrado: $MigrationsPath"
}

$allSql = Get-ChildItem $MigrationsPath -Filter *.sql | Sort-Object Name | Get-Content -Raw

$checks = @(
  @{ Name = "RLS crm_clients"; Pattern = "alter table public\.crm_clients enable row level security" },
  @{ Name = "RLS crm_followup_tasks"; Pattern = "alter table public\.crm_followup_tasks enable row level security" },
  @{ Name = "RLS crm_consent_records"; Pattern = "alter table public\.crm_consent_records enable row level security" },
  @{ Name = "RLS crm_client_stage_history"; Pattern = "alter table public\.crm_client_stage_history enable row level security" },
  @{ Name = "RLS crm_stage_playbook_steps"; Pattern = "alter table public\.crm_stage_playbook_steps enable row level security" },
  @{ Name = "RLS crm_priority_weights"; Pattern = "alter table public\.crm_priority_weights enable row level security" },
  @{ Name = "Indice followup status"; Pattern = "crm_followup_tasks_user_status_idx" },
  @{ Name = "Indice consent client"; Pattern = "crm_consent_records_client_idx" },
  @{ Name = "Indice stage history client"; Pattern = "crm_client_stage_history_client_idx" },
  @{ Name = "RPC forecast"; Pattern = "create or replace function public\.get_crm_pipeline_forecast" },
  @{ Name = "RPC priority queue"; Pattern = "create or replace function public\.get_crm_priority_queue" },
  @{ Name = "RPC execution metrics"; Pattern = "create or replace function public\.get_crm_execution_metrics" },
  @{ Name = "RPC LGPD export"; Pattern = "create or replace function public\.export_crm_client_data" },
  @{ Name = "RPC LGPD anonymize"; Pattern = "create or replace function public\.anonymize_crm_client_data" },
  @{ Name = "RPC retention purge"; Pattern = "create or replace function public\.purge_crm_lost_clients" }
)

$failed = @()
foreach ($check in $checks) {
  if ($allSql -match $check.Pattern) {
    Write-Host "[OK] $($check.Name)"
  } else {
    Write-Host "[FAIL] $($check.Name)"
    $failed += $check.Name
  }
}

if ($failed.Count -gt 0) {
  throw "Hardening audit falhou. Itens ausentes: $($failed -join ', ')"
}

Write-Host "[hardening] Todos os checks passaram."

