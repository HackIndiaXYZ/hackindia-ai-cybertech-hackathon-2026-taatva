# TAATVA Obsidian - start both parts with one command:  .\start.ps1
# Opens two windows: the backend (port 8000) and the website (port 3000).
#
# Before starting, it frees ports 8000 and 3000: if an old copy of the scanner or the
# website is still running (a forgotten window, or a test copy), it is closed first and
# its name is shown. Team rule: ports 8000 and 3000 are only for Obsidian.

$root = $PSScriptRoot
$closedSomething = $false

# Close whatever is using this port (with its helper programs), then wait until the port is free.
# Returns $true if the port is free at the end.
function Clear-Port($port, $what) {
    for ($try = 1; $try -le 10; $try++) {
        $owners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
                  Select-Object -ExpandProperty OwningProcess -Unique
        if (-not $owners) { return $true }   # free
        foreach ($id in $owners) {
            $process = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Closing an old copy on port $port ($what): $($process.ProcessName), process $id" -ForegroundColor Yellow
                # /T = also close its helper programs, /F = do not wait for it to agree
                taskkill /PID $id /T /F *> $null
                $script:closedSomething = $true
            }
        }
        Start-Sleep -Seconds 1
    }
    return -not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# Only run the start-up when this file is started (not when the tests load it)
if ($MyInvocation.InvocationName -ne ".") {
    $backendFree = Clear-Port 8000 "scanner"
    $websiteFree = Clear-Port 3000 "website"
    if (-not ($backendFree -and $websiteFree)) {
        Write-Host ""
        Write-Host "Could not free port 8000 or 3000. Restart the laptop, then run start.ps1 again." -ForegroundColor Red
        Read-Host "Press Enter to close this window"
        exit 1
    }
    if (-not $closedSomething) { Write-Host "Ports 8000 and 3000 are free." -ForegroundColor Green }

    # Backend window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\python.exe -m uvicorn main:app --reload --reload-exclude '*.venv*' --port 8000"

    # Website window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

    Write-Host "Backend:  http://localhost:8000/health"
    Write-Host "Website:  http://localhost:3000"
    # Keep this small window open a moment, so the messages above can be read
    Start-Sleep -Seconds 5
}
