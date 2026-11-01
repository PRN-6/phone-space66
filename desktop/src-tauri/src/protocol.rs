use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u32 = 1;
pub const DEFAULT_PORT: u16 = 6655;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolEnvelope<T> {
    pub protocol_version: u32,
    pub message_id: String,
    pub request_id: Option<String>,
    pub r#type: String,
    pub timestamp: String,
    pub auth_token: Option<String>,
    pub payload: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredDevice {
    pub id: String,
    pub name: String,
    pub model: String,
    pub manufacturer: String,
    pub ip_address: String,
    pub port: u16,
    pub protocol_version: u32,
    pub last_seen: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceHardwareInfo {
    pub manufacturer: String,
    pub model: String,
    pub market_name: String,
    pub android_version: String,
    pub sdk_int: i32,
    pub uptime_ms: i64,
    pub total_ram_bytes: Option<i64>,
    pub available_ram_bytes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub level: i32,
    pub is_charging: bool,
    pub charging_source: String,
    pub temperature_celsius: f32,
    pub health: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageMetrics {
    pub total_bytes: i64,
    pub available_bytes: i64,
    pub used_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    pub ip_address: String,
    pub ssid: Option<String>,
    pub link_speed_mbps: Option<i32>,
    pub is_wifi: bool,
    pub is_hotspot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfoResponsePayload {
    pub device: DeviceHardwareInfo,
    pub battery: BatteryInfo,
    pub storage: StorageMetrics,
    pub network: NetworkInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairRequestPayload {
    pub desktop_name: String,
    pub desktop_id: String,
    pub public_key_fingerprint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairChallengePayload {
    pub phone_name: String,
    pub phone_model: String,
    pub challenge: String,
    pub pin_required: bool,
    pub pin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairVerifyPayload {
    pub pin: String,
    pub challenge_response: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairSuccessPayload {
    pub auth_token: String,
    pub expires_at: i64,
    pub phone_id: String,
    pub phone_name: String,
}

