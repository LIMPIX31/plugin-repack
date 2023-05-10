use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub fn hello_world() -> String {
  "Hello, world!".into()
}
