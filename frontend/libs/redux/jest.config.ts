/* eslint-disable */
export default {
    displayName: "redux",
    preset: "../../jest.preset.js",
    transform: {
        "^.+\\.[tj]sx?$": "babel-jest",
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    coverageDirectory: "../../coverage/libs/redux",
};
