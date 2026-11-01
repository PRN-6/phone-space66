const { execSync } = require('child_process');

const ps = `
$shell = New-Object -ComObject Shell.Application
$drives = $shell.Namespace(17)
$found = $null
foreach ($i in $drives.Items()) {
    if ($i.Name -match 'realme|Phone|Android|Portable') {
        $found = $i
        break
    }
}

if (-not $found) {
    Write-Output "NO_DEVICE"
    exit
}

Write-Output "DEVICE_NAME: $($found.Name)"
Write-Output "DEVICE_PATH: $($found.Path)"
$folder = $found.GetFolder
if ($folder) {
    $items = $folder.Items()
    Write-Output "ITEM_COUNT: $($items.Count)"
    foreach ($item in $items) {
        Write-Output "STORAGE_ROOT: $($item.Name)"
        $subFolder = $item.GetFolder
        if ($subFolder) {
            foreach ($child in $subFolder.Items()) {
                Write-Output "  FOLDER: $($child.Name) | isFolder: $($child.IsFolder)"
            }
        }
    }
}
`;

require('fs').writeFileSync('scripts/test_mtp.ps1', ps);
try {
  const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test_mtp.ps1', { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.error(e.message);
}

