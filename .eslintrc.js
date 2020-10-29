const namingOptions = [
   "error",
   {
      selector: "default",
      format: ["camelCase"],
      leadingUnderscore: "allow" },
  {
      selector: "variable",
      modifiers: ["const"],
      format: ["camelCase", "UPPER_CASE"],
      leadingUnderscore: "allow" },
  {
      selector: "function",
      filter: "^[a-z].*_",                                 // allow function names with "_"
      format: null },
  {
      selector: "typeLike",
      format: ["PascalCase"] }];

const rules = {

   // Standard ESLint rules:
   "curly": "error",
   "id-denylist": [ "error", "any", "Number", "number", "String", "string", "Boolean", "boolean", "Undefined", "undefined" ],
   "id-match": "error",
   "new-parens": "error",
   "no-invalid-this": "error",
   "no-new-wrappers": "error",
   "no-param-reassign": "error",
   "no-sequences": "error",
   "no-shadow": "error",
   "no-template-curly-in-string": "error",
   "no-underscore-dangle": "error",
   "prefer-const": "error",
   // Modifications of default rules:
   "no-constant-condition": ["error", {checkLoops: false }],

   // Typescript plugin rules:
   "@typescript-eslint/member-delimiter-style": "error",
   "@typescript-eslint/naming-convention": namingOptions,
   "@typescript-eslint/no-unused-expressions": "error",                              "no-unused-expressions": "off",
   "@typescript-eslint/semi": "error",                                               "semi": "off",
   "@typescript-eslint/no-unused-vars": ["error", {"argsIgnorePattern": "^_"}],      "no-unused-vars": "off",
   // Modifications of default rules:
   "@typescript-eslint/ban-types": ["error", {extendDefaults: true, types: {Function: false}}],
   "@typescript-eslint/explicit-module-boundary-types": "off",
   "@typescript-eslint/no-inferrable-types": "off",
   "@typescript-eslint/no-non-null-assertion": "off",
   "@typescript-eslint/no-unnecessary-type-assertion": "off", // off because it does not work correctly
   "@typescript-eslint/no-unsafe-assignment": "off",
   "@typescript-eslint/no-unsafe-member-access": "off",
   "@typescript-eslint/no-explicit-any": "off",
   "@typescript-eslint/restrict-plus-operands": "off",
   "no-var": "off",                                     // @typescript-eslint/recommended switches this on

   // Unicorn plugin rules:
   "unicorn/filename-case": ["error", {case: "pascalCase"}],
   };

module.exports = {
   plugins: [
      "@typescript-eslint",
      "eslint-plugin-unicorn" ],
   parser: "@typescript-eslint/parser",
   parserOptions: {
      project: "./tsconfig.json",
      sourceType: "module" },
   env: {
      browser: true },
   root: true,
   extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking" ],
   ignorePatterns: ["/src/tempExtSource/*.js"],
   rules };
