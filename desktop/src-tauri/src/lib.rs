pub mod discovery;
pub mod pairing;
pub mod protocol;

use discovery::DiscoveryManager;
use protocol::DiscoveredDevice;
use std::sync::Mutex;
use tauri::{State, Window};

pub struct AppState {
    pub discovery: Mutex<DiscoveryManager>,
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
fn window_close(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            discovery: Mutex::new(DiscoveryManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            start_discovery,
            get_discovered_devices,
            window_minimize,
            window_maximize,
            window_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running PHONE SPACE66 application");
}

