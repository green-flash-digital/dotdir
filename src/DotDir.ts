import { readFile, rm, stat } from "node:fs/promises";
import path, { join, resolve } from "node:path";
import { tryHandle } from "ts-jolt/isomorphic";
import {
  findDirectoryUpwards,
  hashString,
  writeFileRecursive,
} from "ts-jolt/node";
import * as esbuild from "esbuild";

export type DotDirFindOptions = {
  /**
   * The working directory you wish to search from
   * @default process.cwd
   */
  cwd?: string;
  /**
   * The dot directory name you wish to locate. Do
   * not include the . By default the library will use
   * the name of the package inside of the `package.json`
   * @default package.json/name
   */
  dirName?: string;
};

export type DotDirResponse<C extends Record<string, unknown>> = {
  config: C;
  meta: {
    filePath: string;
    ext: string;
    dirName: string;
    dirPath: string;
  };
};

export class DotDir<C extends Record<string, unknown>> {
  cache: Map<string, C>;

  constructor() {
    this.cache = new Map<string, C>();
    this.find = this.find.bind(this);
  }

  private async getDirName(startingDir: string, dirName?: string) {
    if (dirName) return `.${dirName}`;
    const packageJsonPath = resolve(startingDir, "package.json");
    const { name } = (await import(packageJsonPath)) as { name?: string };
    if (!name) {
      throw new Error(
        "Located the package.json but no name was found. Please manually add the `dirName` to the script."
      );
    }
    return `.${name}`;
  }

  private async transpileConfig({
    filePath,
    rootDir,
  }: {
    filePath: string;
    ext: string;
    rootDir: string;
  }) {
    const now = new Date().getTime().toString();
    const outFileName = `config:${now}.js`;
    const outFilePath = path.resolve(rootDir, outFileName);

    const esbuildRes = await tryHandle(esbuild.build)({
      entryPoints: [filePath],
      tsconfigRaw: JSON.stringify("@gfdigital/tsconfig/library"),
      absWorkingDir: rootDir,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node18",
      outfile: outFileName,
      sourcemap: false,
      external: ["node:*"],
      loader: { ".ts": "ts" },
    });
    if (esbuildRes.hasError) throw esbuildRes.error;

    const configModule = await import(`file://${outFilePath}`);

    if (!configModule.default) {
      throw new Error(
        "Malformed configuration file. Please ensure that the file contains the correct syntax in relation to it's extension."
      );
    }
    await rm(outFilePath, { force: true, recursive: true });

    return configModule.default as C;
  }

  /**
   * Looks for the configuration directory and attempts to resolve the
   * `.config` file inside of it. If this is the first time that the configuration
   * is being read or the configuration has changed, it will transpile the file
   * and then cache it. Subsequent fetches without changes to the configuration
   * will skip transpilation and return the cached configuration.
   *
   * Available extensions for the `.config` file
   * - `json`
   * - `ts`
   * - `js`
   * - `mjs`
   * - `cjs`
   */
  async find(options?: DotDirFindOptions): Promise<DotDirResponse<C>> {
    const startingDir = options?.cwd ?? process.cwd();
    const dirName = await this.getDirName(startingDir, options?.dirName);

    const res = await tryHandle(findDirectoryUpwards)(dirName, undefined, {
      startingDirectory: startingDir,
    });

    // Error when searching upwards
    if (res.hasError) throw res.error;

    // Couldn't find the directory and not directory to auto create the dir
    if (res.data === null) {
      throw new Error(`Could not locate the "${dirName}" directory.`);
    }

    const configFileExts = ["json", "ts", "js", "mjs", "cjs"];
    const dirPath = res.data;

    await writeFileRecursive(path.resolve(dirPath, ".gitignore"), `config:*`);

    const responses = await Promise.allSettled(
      configFileExts.map(async (ext) => {
        const filePath = join(dirPath, `config.${ext}`);
        try {
          const { isFile } = await stat(filePath);
          if (!isFile) throw "File does not exist";
        } catch (error) {
          throw new Error(String(error));
        }
        return { filePath, ext };
      })
    );

    const configProperties = responses.reduce<
      { filePath: string; ext: string } | undefined
    >((accum, res) => {
      if (res.status === "fulfilled") {
        return res.value;
      }
      return accum;
    }, undefined);

    if (!configProperties) {
      throw new Error(
        `Could not locate a 'config.{${configFileExts.join(
          "|"
        )}}' file within "${dirPath}". Please ensure one exists`
      );
    }

    const configContents = await readFile(configProperties.filePath, "utf8");
    const contentHash = hashString(configContents);

    // Check to see if the content hashed config has already been cached
    const cachedConfig = this.cache.get(contentHash);
    if (cachedConfig) {
      // console.log("Config contents have not changed. Returning cached config.");
      return {
        config: cachedConfig,
        meta: { dirName, dirPath: res.data, ...configProperties },
      };
    }

    // Transpile the config and add it to the cache
    // console.log(
    //   "First time reading config or config has changed. Transpiling file..."
    // );
    const config = await this.transpileConfig({
      ...configProperties,
      rootDir: res.data,
    });
    // console.log(
    //   "First time reading config or config has changed. Transpiling file... complete."
    // );
    this.cache.set(contentHash, config);

    return {
      config,
      meta: {
        dirName,
        dirPath: res.data,
        ...configProperties,
      },
    };
  }
}
