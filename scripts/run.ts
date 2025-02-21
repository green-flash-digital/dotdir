import { tryHandle } from "ts-jolt/isomorphic";
import { DotConfig } from "../src/index.js";

const dotConfig = new DotConfig();

const config = await tryHandle(dotConfig.find)();
if (config.hasError) {
  console.error(config.error);
} else {
  console.log(config.data);
}

const config2 = await tryHandle(dotConfig.find)();
if (config2.hasError) {
  console.error(config2.error);
} else {
  console.log(config2.data);
}
