const buildConfig = require('./jest.base.config');

module.exports = buildConfig(__dirname, {
    projects: ["<rootDir>/packages/*/jest.config.js", "<rootDir>/packages/*/jest.config-*.js"],
    testRegex: "__tests__/base/.*\\.(t|j)sx?$",
    // collectCoverageFrom: ["<rootDir>/packages/*/src/**/*.{ts,tsx}"]
})
