#[cfg(target_arch = "wasm32")]
mod gpu_bridge;

#[cfg(target_arch = "wasm32")]
pub use gpu_bridge::*;
pub use time::*;
