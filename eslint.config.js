// A deliberately small rule set. This is not a style linter — it is the gate
// that catches the class of bug `npm run build` cannot see: a reference that
// resolves to nothing at runtime.
//
// Two real examples from this repo's history:
//   - `TECH_STACK` was deleted with the component above it but still
//     referenced, so /technology threw ReferenceError and rendered a bare
//     shell. Rollup treats an unknown identifier as a global and says nothing.
//   - `<MeshBackground />` style JSX references need react/jsx-no-undef,
//     because a JSX element name is a JSXIdentifier and plain no-undef does
//     not resolve it.
//
// Style rules are deliberately absent: this runs inside `npm run build`, so a
// rule that fires on formatting would block a deploy for no safety gain.
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // injected by the Facebook SDK script that Setup.jsx loads
        FB: "readonly",
      },
    },
    plugins: { react },
    settings: { react: { version: "detect" } },
    rules: {
      // the two that matter
      "no-undef": "error",
      "react/jsx-no-undef": "error",

      // an import of a name a module does not export, caught here as well as
      // in the bundler, plus genuinely dead bindings left by a deletion
      "no-unused-vars": ["error", {
        args: "none",
        varsIgnorePattern: "^_",
        // `catch (_)` beside a comment is this codebase's way of saying the
        // error is deliberately ignored; the rule should read it that way.
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],

      // things that are always a mistake rather than a preference
      "no-const-assign": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-duplicate-case": "error",
      "no-func-assign": "error",
      "no-obj-calls": "error",
      "no-sparse-arrays": "error",
      "no-unreachable": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "react/jsx-key": "error",
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["scripts/**/*.js", "api/**/*.js", "*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: { "no-undef": "error", "no-unused-vars": ["error", { args: "none" }] },
  },
];
