const { execSync } = require('child_process');

const ps = `
$shell = New-Object -ComObject Shell.Application
$drives = $shell.Namespace(17)
foreach ($i in $drives.Items()) {
    if ($i.Name -like '*realme*') {
        Write-Output "=== ITEM DETAILS ==="
        Write-Output "Name: $($i.Name)"
        Write-Output "Path: $($i.Path)"
        Write-Output "Type: $($i.Type)"
        $folder = $i.GetFolder
        if ($folder) {
            Write-Output "GetFolder: OK"
            Write-Output "Items Count: $($folder.Items().Count)"
            foreach ($sub in $folder.Items()) {
                Write-Output "  SUB ITEM: $($sub.Name) | Type: $($sub.Type)"
            }
        } else {
            Write-Output "GetFolder: NULL"
        }
    }
}
`;

require('fs').writeFileSync('scripts/deep_check.ps1', ps);
try {
  const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deep_check.ps1', { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.error(e.message);
}
