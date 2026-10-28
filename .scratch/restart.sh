#!/bin/bash
cd /c/Users/User/Documents/GitHubPersonal/Portafolio
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3150 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"
sleep 1
(SITE_URL=http://localhost:3150 CONTACT_TRANSPORT=mock nohup node node_modules/next/dist/bin/next start -p 3150 > /tmp/start.log 2>&1 &)
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" localhost:3150/es
