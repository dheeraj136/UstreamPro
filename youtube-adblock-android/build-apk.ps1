# YouTube AdFree Player - Automated Local Build Script
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Building YouTube AdFree Player APK            " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Check for Java
$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
    Write-Host "[!] Java (JDK 17) was not detected in PATH." -ForegroundColor Yellow
    Write-Host "    Installing Microsoft OpenJDK 17 via winget..." -ForegroundColor Green
    winget install --id Microsoft.OpenJDK.17 -e --silent --accept-source-agreements --accept-package-agreements
    
    # Reload environment path for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Verify Java
try {
    $javaVer = java -version 2>&1 | Out-String
    Write-Host "[OK] Java found: $javaVer" -ForegroundColor Green
} catch {
    Write-Host "[!] Please restart your terminal after Java installation completes, then run this script again." -ForegroundColor Red
    exit 1
}

# 2. Check Android SDK
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    $possibleSdk = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $possibleSdk) {
        $env:ANDROID_HOME = $possibleSdk
        Write-Host "[OK] Detected Android SDK at $possibleSdk" -ForegroundColor Green
    } else {
        Write-Host "[!] ANDROID_HOME environment variable is not set." -ForegroundColor Yellow
        Write-Host "    If you have Android Studio installed, set ANDROID_HOME to '$env:LOCALAPPDATA\Android\Sdk'." -ForegroundColor Yellow
    }
}

# 3. Run Build
Write-Host "`n[*] Starting APK build..." -ForegroundColor Cyan
& ".\gradlew.bat" assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] APK built successfully!" -ForegroundColor Green
    Write-Host " Output file:" -ForegroundColor Green
    Write-Host " $(Get-Location)\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
    Write-Host "=================================================" -ForegroundColor Green
} else {
    Write-Host "`n[!] Build failed with exit code $LASTEXITCODE." -ForegroundColor Red
    Write-Host "    Tip: You can also push to GitHub and the included GitHub Actions workflow" -ForegroundColor Yellow
    Write-Host "    will automatically compile and provide the downloadable APK artifact!" -ForegroundColor Yellow
}
