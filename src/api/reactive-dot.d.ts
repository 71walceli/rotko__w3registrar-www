import { configStore } from "~/api/config2";
import type { InferChains } from "@reactive-dot/core";

declare module "@reactive-dot/core" {
  export interface Chains extends InferChains<typeof configStore.config> {}
}
