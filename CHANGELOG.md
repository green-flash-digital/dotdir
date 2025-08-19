# Changelog

## 0.4.5

### Patch Changes

- 475edd0: Fixes temp output path

## 0.4.4

### Patch Changes

- 7453141: Remove logs; await cleanup

## 0.4.3

### Patch Changes

- efa703e: Compiles to temporary directory to correctly resolve dependencies

## 0.4.2

### Patch Changes

- b4fa226: Removes bundling of configuration files

## 0.4.1

### Patch Changes

- 9c8d4fa: Externalize any node builtins

## 0.4.0

### Minor Changes

- b00aad8: Adds support for .ts files

## 0.3.2

### Patch Changes

- 7c8b1ef: Upgrades dependencies & adds changesets
- c225208: Bumps version

## v0.3.1 (2025-02-23)

### 🐛 Fixed

- Ensures that a configuration, regardless of caching, is returned with the `DotDirResponse`.

## v0.3.0 (2025-02-23)

### 🔄 Changed

Nests all of the file information into a `meta` key on the `DotDirResponse`. The return type looks as follows

```ts
type DotDirResponse<C extends Record<string, unknown>> = {
  config: C | undefined;
  meta: {
    filePath: string;
    ext: string;
    dirName: string;
    dirPath: string;
  };
};
```

## v0.2.0 (2025-02-21)

### 🔄 Changed

- Renames the package from `dotconfig` to `dotdir` for npm registry availability

## v0.1.0 (2025-02-21)

### 🚀 Added

- Adds the `DotConfig` class to fetch & transpile the configuration
