import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// In the Docker build there is no .git, so the revision falls back to a random UUID per build.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ||
  crypto.randomUUID();

const route = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});

// Only these two exports: the `dynamic`, `dynamicParams` and `revalidate` segment configs
// that createSerwistRoute also returns are not allowed with cacheComponents.
export const { generateStaticParams, GET } = route;
