Set-Location $PSScriptRoot\..

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found. Create it first:" -ForegroundColor Yellow
    Write-Host "python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

& ".\.venv\Scripts\python.exe" -m app.scripts.seed_demo