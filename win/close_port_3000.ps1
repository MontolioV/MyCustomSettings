$PORT=3000; Get-NetTCPConnection -LocalPort $PORT | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
