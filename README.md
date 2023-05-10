# Repack
###### Yarn plugin for easy integration of rust wasm into a web or nodejs project</h6>

## Installation
1. [Install rust nightly toolchain and cargo](https://www.rust-lang.org/tools/install)
2. Setup rust for **wasm32-unknown-unknown** target
3. Install yarn (v3/4)
4. Install plugin in the project with cargo workspaces + yarn workspaces
```bash
yarn plugin import https://raw.githubusercontent.com/LIMPIX31/plugin-repack/master/yarn-plugin/bundles/@yarnpkg/plugin-repack.js
yarn repack install
```

## Usage

### Create wasm crate
```bash
cargo new --lib hello-world
```

#### ...and add target
```toml
[lib]
crate-type = ["cdylib"]

[repack]
target = "web" # or "nodejs"
```


#### ...and add crate to cargo workspaces
```toml
[workspace]
members = [
  "hello-world"
]
```

### Add crate to yarn workspace dependencies and build
```json
{
 "name": "my-project",
 "version": "1.0.0",
 "main": "src/index.ts",
 "dependencies": {
   "@crate/hello-world": "crate:*"
 }
}
```

#### ...then make the initial build
```bash
yarn
```

### Rebuild crates
```
# Try rebuild only hello-world
yarn repack rebuild hello-world
# Try rebuild all crates
yarn repack rebuild
# Try rebuild hello-world crate for release
yarn repack rebuild --release hello-world
```

### Import your crate
```ts
import { hello_world } from '@crate/hello-world'
```

## Example
You can find examples in `examples` branch
```
git checkout examples
```

## Misc

### `@crate` scope
...is required. It is needed to restrict your dependencies semantically, so that you can understand that you are importing a crate and not something else
