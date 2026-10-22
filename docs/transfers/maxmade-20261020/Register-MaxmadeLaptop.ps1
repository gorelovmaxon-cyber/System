[CmdletBinding()]
param(
    [string]$BootstrapKey = (Join-Path $env:USERPROFILE '.ssh\maxmade-bootstrap-from-main'),
    [string]$LaptopKey = (Join-Path $env:USERPROFILE '.ssh\maxmade_laptop')
)
$ErrorActionPreference = 'Stop'
$null = Get-Command ssh.exe, ssh-keygen.exe, icacls.exe
if (!(Test-Path -LiteralPath $BootstrapKey -PathType Leaf)) {
    throw 'Copy the existing private bootstrap key from the main PC outside Git, as described in the guide.'
}
$sshFolder = Join-Path $env:USERPROFILE '.ssh'
$null = New-Item -ItemType Directory -Force -Path $sshFolder
$knownHosts = Join-Path $sshFolder 'maxmade_known_hosts'
$bundledHosts = Join-Path $PSScriptRoot 'maxmade_known_hosts'
if (Test-Path -LiteralPath $knownHosts) {
    if ((Get-FileHash -LiteralPath $knownHosts).Hash -ne (Get-FileHash -LiteralPath $bundledHosts).Hash) {
        throw 'Existing MAXMADE known_hosts differs. Verify the server fingerprint before continuing.'
    }
} else {
    Copy-Item -LiteralPath $bundledHosts -Destination $knownHosts
}
function Protect-PrivateFile([string]$FilePath) {
    $currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls.exe $FilePath /reset | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not reset private file permissions.' }
    & icacls.exe $FilePath /inheritance:r /grant:r "*${currentSid}:(F)" '*S-1-5-18:(F)' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not protect private file permissions.' }
}
Protect-PrivateFile $BootstrapKey
$crmFile = Join-Path $sshFolder 'maxmade_brief_operator_20261020.json'
if (Test-Path -LiteralPath $crmFile -PathType Leaf) { Protect-PrivateFile $crmFile }
if (!(Test-Path -LiteralPath $LaptopKey)) {
    if (Test-Path -LiteralPath ($LaptopKey + '.pub')) { throw 'Public key already exists without its private key. Choose another key path.' }
    & ssh-keygen.exe -t ed25519 -f $LaptopKey -C 'MAXMADE-laptop'
    if ($LASTEXITCODE -ne 0) { throw 'Laptop key generation failed.' }
}
if (!(Test-Path -LiteralPath ($LaptopKey + '.pub') -PathType Leaf)) { throw 'Laptop public key is missing.' }
Protect-PrivateFile $LaptopKey
$publicLine = (Get-Content -LiteralPath ($LaptopKey + '.pub') -Raw).Trim()
if ($publicLine -notmatch '^ssh-ed25519 [A-Za-z0-9+/=]+(?: [^\r\n]*)?$') { throw 'Expected one Ed25519 public key line.' }
$program = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'install_laptop_key.py') -Raw -Encoding UTF8
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($program))
$remoteCommand = "python3 -c `"import base64;exec(base64.b64decode('$encoded'))`""
$connection = @('-T', '-p', '22', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', "UserKnownHostsFile=$knownHosts", '-i', $BootstrapKey, 'maxmade-admin@185.250.47.204')
# Only the public key is piped. Private keys remain on the laptop.
$publicLine | & ssh.exe @connection $remoteCommand
if ($LASTEXITCODE -ne 0) { throw 'Public key was not installed. The existing bootstrap access is retained.' }
$connection = @('-T', '-p', '22', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', "UserKnownHostsFile=$knownHosts", '-i', $LaptopKey, 'maxmade-admin@185.250.47.204')
& ssh.exe @connection 'id -un'
if ($LASTEXITCODE -ne 0) { throw 'Laptop key login was not confirmed. Keep the bootstrap key for diagnosis.' }
$configSource = Join-Path $PSScriptRoot 'ssh-config.example'
$configTarget = Join-Path $sshFolder 'maxmade-laptop.config'
if (Test-Path -LiteralPath $configTarget) {
    if ((Get-FileHash -LiteralPath $configTarget).Hash -ne (Get-FileHash -LiteralPath $configSource).Hash) {
        throw 'An existing laptop SSH config differs. It was retained; use an explicit SSH command from the guide.'
    }
} else {
    Copy-Item -LiteralPath $configSource -Destination $configTarget
}
Write-Host 'MAXMADE laptop key login confirmed. Connect using the command in the guide.'
