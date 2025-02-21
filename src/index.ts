import { stat } from "fs/promises";
import { join, resolve } from "path";
import { tryHandle } from "ts-jolt/isomorphic";
import { findDirectoryUpwards, TempFile } from "ts-jolt/node";
import * as esbuild from "esbuild";

export type GetConfigOptions = {
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

async function getDirName(startingDir: string, dirName?: string) {
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

/**
 *
 */
export async function getDotConfig<C extends Record<string, unknown>>(
  options?: GetConfigOptions
) {
  const startingDir = options?.cwd ?? process.cwd();
  const dirName = await getDirName(startingDir, options?.dirName);

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

  const esbuildRes = await tryHandle(esbuild.build)({
    entryPoints: [configProperties.filePath],
    tsconfigRaw: JSON.stringify("ts-jolt/tsconfig/library"),
    write: false,
  });
  if (esbuildRes.hasError) throw esbuildRes.error;

  const outputFile = esbuildRes.data.outputFiles[0];
  const outputFileContents = Buffer.from(outputFile.contents).toString("utf-8");
  const tempFile = new TempFile();
  const filePath = await tempFile.create(outputFileContents, "js");

  const configModule = await import(`file://${filePath}`);

  if (!configModule.default) {
    throw new Error(
      "Malformed configuration file. Please ensure that the file contains the correct syntax in relation to it's extension."
    );
  }
  tempFile.cleanup();

  return {
    dirName,
    dirPath: res.data,
    ...configProperties,
    config: configModule.default as C,
  };
}
