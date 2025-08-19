import z from "zod";

import { TEST_VAR } from "../__test_folder/test.js";

export default {
  TEST_VAR,
  schema: z.object({ test: z.string() }),
};
