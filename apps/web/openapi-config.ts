import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
    schemaFile: "../../api/openapi.json",
    apiFile: "./src/core/generated/emptyApi.ts",
    apiImport: "emptySplitApi",
    outputFile: "./src/core/generated/api.ts",
    exportName: "api",
    tag: true,
    hooks: { queries: true, lazyQueries: true, mutations: true },
};

export default config;
