# IFSE Open installer (Windows). Asks where the site and the dashboard
# listen, writes .env, then builds and starts the containers.
#   .\install.ps1            ask
#   .\install.ps1 -Defaults  take every default without asking
param([switch]$Defaults)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Ask($q, $def) {
    if ($Defaults) { return $def }
    $a = Read-Host "$q [$def]"
    if ([string]::IsNullOrWhiteSpace($a)) { return $def } else { return $a.Trim() }
}
function Pick($q, $def, $options) {   # options: ordered @{ "1" = @("value", "label") }
    Write-Host ""; Write-Host $q
    foreach ($k in $options.Keys) { Write-Host "  $k) $($options[$k][1])" }
    while ($true) {
        $n = Ask "Choose" $def
        if ($options.Contains($n)) { return $options[$n][0] }
        Write-Host "Unknown choice '$n'."
    }
}
function AskPort($q, $def, $not) {
    while ($true) {
        $p = Ask $q $def
        if ($p -match '^\d+$' -and [int]$p -ge 1 -and [int]$p -le 65535 -and $p -ne $not) { return $p }
        Write-Host "Use a free port 1-65535."
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Host "Docker Desktop is not installed: https://docs.docker.com/desktop/"; exit 1 }
docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "Docker Compose v2 is needed (start Docker Desktop)."; exit 1 }

if ((Test-Path .env) -and -not $Defaults) {
    $r = Read-Host ".env already exists. Replace it? [y/N]"
    if ($r -notmatch '^[yY]') { Write-Host "Keeping .env. Starting with it."; docker compose up -d --build; exit $LASTEXITCODE }
}

Write-Host "IFSE Open - setup"

$searchBind = Pick "Who can open the search site?" "1" ([ordered]@{
    "1" = @("0.0.0.0",   "Everyone who can reach this machine (LAN, server, internet) - 0.0.0.0")
    "2" = @("127.0.0.1", "Only this machine - localhost") })
$searchPort = AskPort "Search site port" "5000" ""

$indexerBind = Pick "Who can open the indexer dashboard (controls the index)?" "1" ([ordered]@{
    "1" = @("127.0.0.1", "Only this machine - localhost (recommended)")
    "2" = @("0.0.0.0",   "Every network - 0.0.0.0 (protect it with a firewall or VPN)") })
$indexerPort = AskPort "Dashboard port" "5101" $searchPort

$searchUrl = Ask "Public address of the site, if it has a domain (empty = none)" ""

$bytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$token = ([Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', '')

@"
# written by install.ps1 - edit and run: docker compose up -d
SEARCH_BIND=$searchBind
SEARCH_PORT=$searchPort
INDEXER_BIND=$indexerBind
INDEXER_PORT=$indexerPort
SEARCH_URL=$searchUrl
IFSE_ADMIN_TOKEN=$token
IFSE_RATE_PER_MIN=120
"@ | Set-Content -Path .env -Encoding ascii

Write-Host ""; Write-Host "Building and starting..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

function Show($bind, $port) {
    Write-Host "    http://localhost:$port"
    if ($bind -eq "127.0.0.1") { return }
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "vEthernet|WSL|Loopback" } |
        ForEach-Object { Write-Host "    http://$($_.IPAddress):$port" }
}

Write-Host ""
Write-Host "IFSE Open is running."
Write-Host "  Search site:";       Show $searchBind $searchPort
Write-Host "  Indexer dashboard:"; Show $indexerBind $indexerPort
Write-Host "  Customize the site:  <search site>/owner"
Write-Host "  Admin token:         $token   (also in .env)"
if ($searchBind -eq "0.0.0.0") {
    Write-Host "  If other devices cannot connect, allow port $searchPort in Windows Firewall (as administrator):"
    Write-Host "    New-NetFirewallRule -DisplayName 'IFSE Open' -Direction Inbound -Protocol TCP -LocalPort $searchPort -Action Allow"
}
