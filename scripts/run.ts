import { tryHandle } from "ts-jolt/isomorphic";
import { getDotConfig } from "../src/index.js";

const config = await tryHandle(getDotConfig)();
if (config.hasError) {
  console.error(config.error);
} else {
  console.log(config.data);
}
