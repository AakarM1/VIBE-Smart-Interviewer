# PowerShell wrapper for sync_branch.sh
# Usage: .\tools\sync_branch.ps1 origin mustafa [--include-low-ahead]

param(
    [Parameter(Mandatory=$true)]
    [string]$Remote,
    
    [Parameter(Mandatory=$true)]
    [string]$TargetBranch,
    
    [switch]$IncludeLowAhead
)

# Check if Git Bash is available
$gitBashPaths = @(
    "${env:ProgramFiles}\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
    "${env:LOCALAPPDATA}\Programs\Git\bin\bash.exe"
)

$gitBash = $null
foreach ($path in $gitBashPaths) {
    if (Test-Path $path) {
        $gitBash = $path
        break
    }
}

if (-not $gitBash) {
    Write-Host "Git Bash not found. Please install Git for Windows or run this script in WSL/Git Bash." -ForegroundColor Red
    Write-Host "Alternatively, use: git bash -c 'bash tools/sync_branch.sh $Remote $TargetBranch'" -ForegroundColor Yellow
    exit 1
}

# Build command arguments
$args = @($Remote, $TargetBranch)
if ($IncludeLowAhead) {
    $args += "--include-low-ahead"
}

# Convert Windows path to Unix-style path for Git Bash
$scriptPath = (Get-Location).Path + "\tools\sync_branch.sh"
$unixScriptPath = $scriptPath -replace '\\', '/' -replace '^C:', '/c'

Write-Host "Running sync script via Git Bash..." -ForegroundColor Green
Write-Host "Command: bash '$unixScriptPath' $($args -join ' ')" -ForegroundColor Gray

& $gitBash -c "cd '$((Get-Location).Path -replace '\\', '/' -replace '^C:', '/c')' && bash tools/sync_branch.sh $($args -join ' ')"
