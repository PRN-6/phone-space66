use crate::protocol::DiscoveredDevice;
use mdns_sd::{ServiceDaemon, ServiceEvent};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct DiscoveryManager {
    devices: Arc<Mutex<HashMap<String, DiscoveredDevice>>>,
    daemon: Option<ServiceDaemon>,
}

impl DiscoveryManager {
    pub fn new() -> Self {
        Self {
            devices: Arc::new(Mutex::new(HashMap::new())),
            daemon: None,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
        let service_type = "_phonespace66._tcp.local.";
        let receiver = mdns.browse(service_type).map_err(|e| e.to_string())?;

        let devices_clone = Arc::clone(&self.devices);

        tokio::spawn(async move {
            while let Ok(event) = receiver.recv_async().await {
                match event {
                    ServiceEvent::ServiceResolved(info) => {
                        let ip = info.get_addresses_v4().iter().next().map(|a| a.to_string()).unwrap_or_else(|| "127.0.0.1".to_string());
                        let port = info.get_port();
                        let fullname = info.get_fullname().to_string();

                        let model = info.get_property_val_str("model").unwrap_or("Android Phone").to_string();
                        let manufacturer = info.get_property_val_str("manufacturer").unwrap_or("Android").to_string();
                        let version: u32 = info.get_property_val_str("version").and_then(|v| v.parse().ok()).unwrap_or(1);

                        let now = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as i64;

                        let device = DiscoveredDevice {
                            id: format!("{}:{}", ip, port),
                            name: fullname,
                            model,
                            manufacturer,
                            ip_address: ip,
                            port,
                            protocol_version: version,
                            last_seen: now,
                        };

                        let mut lock = devices_clone.lock().unwrap();
                        lock.insert(device.id.clone(), device);
                    }
                    _ => {}
                }
            }
        });

        self.daemon = Some(mdns);
        Ok(())
    }

    pub fn get_devices(&self) -> Vec<DiscoveredDevice> {
        let lock = self.devices.lock().unwrap();
        lock.values().cloned().collect()
    }
}

