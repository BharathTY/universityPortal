# Requires PostgreSQL client tools (pg_dump / pg_restore) on PATH, or set PG_BIN to the bin folder
# Example:
#   .\scripts\pg-migrate.ps1 `
#     -Source "postgresql://postgres:postgres@localhost:5432/university_portal" `
#     -Target "postgresql://postgres:PASSWORD@103.182.211.219:5432/university_portal"

param(
  [Parameter(Mandatory = $true)]
  [string] $Source,
  [Parameter(Mandatory = $true)]
  [string] $Target,
  [string] $PgBin = ""
)

$ErrorActionPreference = "Stop"

function Resolve-Tool([string] $name) {
  if ($PgBin) {
    $p = Join-Path $PgBin $name
    if (Test-Path $p) { return $p }
  }
  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\$name",
    "C:\Program Files\PostgreSQL\17\bin\$name",
    "C:\Program Files\PostgreSQL\16\bin\$name"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  $fromPath = Get-Command $name -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }
  throw "Could not find $name. Install PostgreSQL client tools or use -PgBin."
}

$pgDump = Resolve-Tool "pg_dump.exe"
$pgRestore = Resolve-Tool "pg_restore.exe"

$dumpFile = Join-Path $env:TEMP ("university_portal_migrate_{0}.dump" -f [guid]::NewGuid().ToString("n"))

try {
  Write-Host "Dumping from source..."
  & $pgDump --dbname=$Source -Fc --no-owner --no-acl -f $dumpFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit $LASTEXITCODE" }

  $size = (Get-Item $dumpFile).Length
  Write-Host "Dump OK ($size bytes). Restoring to target (may take a moment)..."
  & $pgRestore --dbname=$Target --clean --if-exists --no-owner --no-acl $dumpFile
  if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit $LASTEXITCODE" }

  Write-Host "Done. Target database updated."
}
finally {
  if (Test-Path $dumpFile) {
    Remove-Item -Force $dumpFile
  }
}
