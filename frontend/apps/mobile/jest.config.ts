module.exports = {
    displayName: "mobile",
    preset: "react-native",
    resolver: "@nx/jest/plugins/resolver",
    moduleFileExtensions: ["ts", "js", "html", "tsx", "jsx"],
    setupFilesAfterEnv: ["<rootDir>/test-setup.ts"],
    moduleNameMapper: {
        "\\.svg$": "@nx/react-native/plugins/jest/svg-mock",
    },
    coverageDirectory: "../../coverage/apps/mobile",
};
