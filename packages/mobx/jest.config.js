const buildConfig = require("../../jest.base.config.js");

module.exports = buildConfig(__dirname, {
    projects: ["<rootDir>/jest.config.js"],
    testRegex: "__tests__/base/.*\\.(t|j)sx?$",
    setupFilesAfterEnv: [`<rootDir>/jest.setup.ts`]
})
