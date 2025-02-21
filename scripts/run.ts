import { tryHandle } from "ts-jolt/isomorphic";
import { DotDir } from "../src/index.js";

const dotDir = new DotDir();

const config = await tryHandle(dotDir.find)();
if (config.hasError) {
  console.error(config.error);
} else {
  console.log(config.data);
}

const config2 = await tryHandle(dotDir.find)();
if (config2.hasError) {
  console.error(config2.error);
} else {
  console.log(config2.data);
}
