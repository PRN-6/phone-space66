use sha2::{Digest, Sha256};
use uuid::Uuid;

pub struct PairingHelper;

impl PairingHelper {
    pub fn generate_client_id() -> String {
        Uuid::new_v4().to_string()
    }

    pub fn hash_pin_challenge(pin: &str, challenge: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("{}:{}", pin.trim(), challenge));
        hex::encode(hasher.finalize())
    }
}

