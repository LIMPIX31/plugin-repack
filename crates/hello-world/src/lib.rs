use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub fn hello_world() -> String {
  "Hello World".into()
}

#[wasm_bindgen]
pub fn sum(a: usize, b: usize) -> usize {
  just_lib::add(a, b)
}
