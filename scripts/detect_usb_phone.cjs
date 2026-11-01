const { execSync } = require('child_process');

function detectWiredPhone() {
  const psScript = `
    $shell = New-Object -ComObject Shell.Application;
    $drives = $shell.Namespace(17);
    $results = @();
    foreach ($i in $drives.Items()) {
      $type = $i.Type;
      $name = $i.Name;
      if ($type -match 'Portable|Phone|Media|MTP|Android' -or $i.Path -match '::\\{') {
        $storageItems = @();
        try {
          $subFolder = $i.GetFolder;
          if ($subFolder) {
            foreach ($sub in $subFolder.Items()) {
              $storageItems += $sub.Name;
            }
          }
        } catch {}
        $results += @{
          name = $name;
          type = $type;
          path = $i.Path;
          storage = $storageItems;
        };
      }
    }
    $results | ConvertTo-Json -Compress;
  `;

  try {
    const raw = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 4000,
    }).trim();

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [];
  }
}

console.log('Detected Wired USB Devices:', detectWiredPhone());

