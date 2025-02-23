# Changelog

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
