/**
 * PHONE SPACE66 — USB Phone Diagnostic Utility
 * Inspects Windows PnP, WPD Portable Devices, and ADB status.
 */

const { execSync } = require('child_process');

function detectDevices() {
  console.log('================================================================');
  console.log('           PHONE SPACE66 — USB HARDWARE DIAGNOSTICS             ');
  console.log('================================================================');

  // 1. PnP WPD Devices
  let pnpDevices = [];
  try {
    const raw = execSync('pnputil /enum-devices /class WPD', { encoding: 'utf8', timeout: 4000 });
    const blocks = raw.split(/\r?\n\r?\n/);
    for (const b of blocks) {
      if (!b.includes('Instance ID:')) continue;
      const id = (b.match(/Instance ID:\s*(.+)/i) || [])[1];
      const desc = (b.match(/Device Description:\s*(.+)/i) || [])[1];
      const mfg = (b.match(/Manufacturer Name:\s*(.+)/i) || [])[1];
      const status = (b.match(/Status:\s*(.+)/i) || [])[1];
      const drv = (b.match(/Driver Name:\s*(.+)/i) || [])[1];
      if (id && desc) {
        pnpDevices.push({
          id: id.trim(),
          description: desc.trim(),
          manufacturer: mfg ? mfg.trim() : 'Generic',
          status: status ? status.trim() : 'Unknown',
          driver: drv ? drv.trim() : '',
          isStarted: status && status.trim().toLowerCase() === 'started',
        });
      }
    }
  } catch {}

  console.log(`[PnP] WPD Devices Discovered in System Registry: ${pnpDevices.length}`);
  pnpDevices.forEach((d) => {
    console.log(`  - ${d.description} (${d.manufacturer}) | Driver: ${d.driver} | Status: ${d.status}`);
  });

  // 2. Windows Shell COM Namespace(17) Active Storage
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
          storageCount = $storageItems.Count;
          storageItems = $storageItems;
        };
      }
    }
    $results | ConvertTo-Json -Compress;
  `;

  let shellDevices = [];
  try {
    const raw = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      timeout: 4000,
    }).trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      shellDevices = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {}

  console.log('\n[SHELL] Active Portable Storage Devices (Namespace 17):');
  if (shellDevices.length === 0) {
    console.log('  ⚠️  No active phone storage partition detected.');
  } else {
    shellDevices.forEach((s) => {
      console.log(`  - Name: ${s.name}`);
      console.log(`    Storage Partitions: ${s.storageCount}`);
      if (s.storageCount === 0) {
        console.log('    STATUS: ⚠️ LOCKED_OR_CHARGING_ONLY (Unlock screen & tap "File Transfer")');
      } else {
        console.log(`    STATUS: ✓ READY (Partitions: ${s.storageItems.join(', ')})`);
      }
    });
  }

  // 3. ADB Transport Probe
  let adbInstalled = false;
  try {
    execSync('adb version', { stdio: 'ignore', timeout: 1500 });
    adbInstalled = true;
  } catch {}

  console.log('\n[ADB] Android Debug Bridge Transport:');
  if (!adbInstalled) {
    console.log('  ℹ️  ADB binary not found in PATH (Standard USB MTP is used).');
  } else {
    try {
      const adbOut = execSync('adb devices -l', { encoding: 'utf8', timeout: 3000 });
      console.log(adbOut.trim());
    } catch (e) {
      console.log('  Error checking ADB:', e.message);
    }
  }

  console.log('================================================================\n');
  return { pnpDevices, shellDevices, adbInstalled };
}

detectDevices();
