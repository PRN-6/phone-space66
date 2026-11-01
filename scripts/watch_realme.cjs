const { execSync } = require('child_process');

function checkOnce() {
  const ps = `
    $shell = New-Object -ComObject Shell.Application
    $drives = $shell.Namespace(17)
    $phone = $null
    foreach ($i in $drives.Items()) {
      if ($i.Type -match 'Mobile|Portable|Phone' -or $i.Name -match 'realme') {
        $phone = $i
        break
      }
    }
    if (-not $phone) {
      Write-Output "STATUS:NO_DEVICE"
      exit
    }
    $folder = $phone.GetFolder
    if (-not $folder -or $folder.Items().Count -eq 0) {
      Write-Output "STATUS:LOCKED_OR_CHARGING_ONLY|$($phone.Name)"
      exit
    }
    $items = @()
    foreach ($item in $folder.Items()) {
      $items += $item.Name
    }
    Write-Output "STATUS:READY|$($phone.Name)|$($items -join ',')"
  `;

  require('fs').writeFileSync('scripts/_chk.ps1', ps);
  try {
    return execSync('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/_chk.ps1', {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
  } catch (e) {
    return 'STATUS:ERROR|' + e.message;
  }
}

console.log(checkOnce());
