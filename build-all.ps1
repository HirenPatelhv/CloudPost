# CloudPost Multi-Platform Build Script for Windows PowerShell
# Compiles Windows (.exe installer & portable), Linux (.AppImage, .deb), and macOS (.zip) in a single command.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CloudPost Studio - Building All Operating Systems       " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure node_modules exist
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# 2. Run multi-platform build
Write-Host "[2/4] Preparing icons and compiling web bundle..." -ForegroundColor Green
Write-Host "[3/4] Packaging native desktop binaries..." -ForegroundColor Green
npm run build:all

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "✓ SUCCESS! Compiled distribution packages in dist_desktop/:" -ForegroundColor Green
    Write-Host "  - Windows: CloudPost Setup 2.4.0.exe (Installer) & Portable.exe" -ForegroundColor White
    Write-Host "  - Linux:   CloudPost-2.4.0.AppImage & .deb" -ForegroundColor White
    Write-Host "  - macOS:   Triggered via GitHub Actions on real macOS runners" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Cyan
} else {
    Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
