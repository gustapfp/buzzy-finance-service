/** @type {import('jest').Config} */
export default {
  projects: [
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/app/tests/v1/**/*.test.ts"],
      moduleDirectories: ["node_modules", "<rootDir>/app"],
      setupFiles: ["<rootDir>/app/tests/v1/api/setup.ts"],
      transform: {
        "^.+\\.tsx?$": [
          "babel-jest",
          {
            presets: [["@babel/preset-env", { targets: { node: "current" } }], "@babel/preset-typescript"],
          },
        ],
      },
    },
  ],
};
