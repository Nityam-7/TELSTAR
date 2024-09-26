export default {
    transform: {
      "^.+\\.m?js$": ["babel-jest", { plugins: ["@babel/plugin-transform-modules-commonjs"] }],
    },
    testEnvironment: "node",
    moduleFileExtensions: ["js", "json", "node", "mjs"],
    clearMocks: true,
    // setupFilesAfterEnv: ['<rootDir>/singleton.mjs'],
    globalSetup: '<rootDir>/setup.cjs', // Add this line
  };
  