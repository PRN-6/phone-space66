pub mod discovery;
pub mod pairing;
pub mod protocol;

use discovery::DiscoveryManager;
use protocol::DiscoveredDevice;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{State, Window};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct AppState {
    pub discovery: Mutex<DiscoveryManager>,
    pub bridge_process: Mutex<Option<Child>>,
}

/// Spawns the USB hardware bridge in background if not already listening
fn ensure_hardware_bridge() -> Option<Child> {
    // Check if port 6655 is already open
    if std::net::TcpStream::connect("127.0.0.1:6655").is_ok() {
        println!("[TAURI-RUST] Hardware bridge already active on port 6655.");
        return None;
    }

    let possible_nodes = [
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        "node",
    ];

    let mut node_bin = "node";
    for n in &possible_nodes {
        if std::path::Path::new(n).exists() {
            node_bin = n;
            break;
        }
    }

    // Locate scripts/usb_mtp_bridge.cjs
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let candidates = [
        current_dir.join("scripts").join("usb_mtp_bridge.cjs"),
        current_dir.join("..").join("scripts").join("usb_mtp_bridge.cjs"),
        PathBuf::from(r"D:\projects\phonespace66\scripts\usb_mtp_bridge.cjs"),
    ];

    for script in &candidates {
        if script.exists() {
            println!("[TAURI-RUST] Launching hardware bridge: {:?}", script);
            let mut cmd = Command::new(node_bin);
            cmd.arg(script);
            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(child) = cmd.spawn() {
                return Some(child);
            }
        }
    }

    None
}

/// Registers PHONE SPACE66 with Windows AutoPlay
fn register_windows_autoplay() {
    #[cfg(windows)]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_string_lossy().to_string();
            let _ = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-Command",
                    &format!(
                        r#"
                        $p = "{exe_str}"
                        New-Item -Path "HKCU:\Software\Classes\PhoneSpace66.AutoPlay\shell\open\command" -Force | Out-Null
                        Set-ItemProperty -Path "HKCU:\Software\Classes\PhoneSpace66.AutoPlay\shell\open\command" -Name "(Default)" -Value "`"$p`"" -Force
                        New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay" -Force | Out-Null
                        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay" -Name "Action" -Value "Launch PHONE SPACE66 Desktop" -Force
                        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay" -Name "Provider" -Value "PHONE SPACE66" -Force
                        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay" -Name "DefaultIcon" -Value "`"$p`",0" -Force
                        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay" -Name "InvokeProgID" -Value "PhoneSpace66.AutoPlay" -Force
                        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay" -Name "InvokeVerb" -Value "open" -Force
                        New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\EventHandlers\WPD\DeviceArrival" -Force | Out-Null
                        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\EventHandlers\WPD\DeviceArrival" -Name "PhoneSpace66AutoPlay" -Value "" -Force
                        "#,
                        exe_str = exe_str.replace('"', "")
                    ),
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
        }
    }
}

#[tauri::command]
fn start_discovery(state: State<'_, AppState>) -> Result<(), String> {
    let mut disc = state.discovery.lock().map_err(|e| e.to_string())?;
    disc.start()
}

#[tauri::command]
fn get_discovered_devices(state: State<'_, AppState>) -> Result<Vec<DiscoveredDevice>, String> {
    let disc = state.discovery.lock().map_err(|e| e.to_string())?;
    Ok(disc.get_devices())
}

#[tauri::command]
fn detect_usb_hardware() -> Result<serde_json::Value, String> {
    #[cfg(windows)]
    {
        let output = Command::new("pnputil")
            .args(["/enum-devices", "/class", "WPD"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        let text = String::from_utf8_lossy(&output.stdout);
        let is_connected = text.contains("Started") || text.contains("Pixel 10a");
        Ok(serde_json::json!({
            "connected": is_connected,
            "raw": text,
            "device": if is_connected { "Pixel 10a" } else { "Unknown" }
        }))
    }
    #[cfg(not(windows))]
    {
        Ok(serde_json::json!({ "connected": false }))
    }
}

#[tauri::command]
async fn get_phone_diagnostics() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("http://127.0.0.1:6655/diagnostics")
        .timeout(std::time::Duration::from_millis(1500))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json = res.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
fn window_minimize(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_maximize(window: Window) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn window_close(window: Window, state: State<'_, AppState>) -> Result<(), String> {
    if let Ok(mut lock) = state.bridge_process.lock() {
        if let Some(mut child) = lock.take() {
            let _ = child.kill();
        }
    }
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register_windows_autoplay();
    let bridge_child = ensure_hardware_bridge();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            discovery: Mutex::new(DiscoveryManager::new()),
            bridge_process: Mutex::new(bridge_child),
        })
        .invoke_handler(tauri::generate_handler![
            start_discovery,
            get_discovered_devices,
            detect_usb_hardware,
            get_phone_diagnostics,
            window_minimize,
            window_maximize,
            window_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running PHONE SPACE66 application");
}
