{
  "env": {
      "node": true,
      "es6": true,
      "es2017": true
  },
  "extends": [
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
      "prettier/@typescript-eslint",
      "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
      "project": "tsconfig.json",
      "tsconfigRootDir": ".",
      "version": "detect",
      "ecmaFeatures": {
          "jsx": true
      },
      "extraFileExtensions": [".json"]
  },
  "overrides": [{"files": ["**/*.ts", "**/*.tsx"]}],
  "settings": {
      "react": {
          "version": "detect"
      }
  },
  "plugins": [
      "react",
      "react-hooks",
      "@typescript-eslint",
      "prettier",
      "unused-imports",
      "simple-import-sort"
  ],
  "rules": {
      "simple-import-sort/sort": [
          "warn",
          {
              "groups": [
                  [
                      // Packages. `react` related packages come first.
                      "^react",
                      "^@?\\w",
                      // Internal packages.
                      "^(components|modules|utils)(/.*|$)",
                      // Side effect imports.
                      "^\\u0000",
                      // Parent imports. Put `..` last.
                      "^\\.\\.(?!/?$)", "^\\.\\./?$",
                      // Other relative imports. Put same-folder imports and `.` last.
                      "^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$",
                      // Style imports.
                      "^.+\\.s?css$"
                  ]
              ]
          }
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "unused-imports/no-unused-imports-ts": "error",
      "unused-imports/no-unused-vars-ts": [
          "warn",
          { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
      ],
      "@typescript-eslint/unbound-method": 0,
      "no-shadow": [ // Temporary
          "off",
          {
              "builtinGlobals": true
          }
      ],
      "no-duplicate-imports": [
          "error",
          {
              "includeExports": true
          }
      ],
      "no-template-curly-in-string": "error",
      "block-scoped-var": "error",
      "curly": [
          "error",
          "all"
      ],
      "eqeqeq": "error",
      "no-alert": "warn",
      "no-else-return": [
          "error",
          {
              "allowElseIf": false
          }
      ],
      "no-implicit-coercion": "off",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-multi-spaces": "error",
      "no-new": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-return-await": "error",
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unused-expressions": "error",
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "prefer-promise-reject-errors": "error",
      "radix": "off",
      "no-undefined": "off",
      "array-bracket-newline": "off",
      "comma-dangle": [
          "error",
          "never"
      ],
      "comma-style": "error",
      "eol-last": "error",
      "key-spacing": "error",
      "keyword-spacing": "error",
      "new-parens": "error",
      "no-bitwise": "warn",
      "no-lonely-if": "warn",
      "no-multiple-empty-lines": "error",
      "no-nested-ternary": "off",
      "no-new-object": "error",
      "no-tabs": [
          "error",
          {
              "allowIndentationTabs": true
          }
      ],
      "no-trailing-spaces": "error",
      "no-unneeded-ternary": "error",
      "no-whitespace-before-property": "error",
      "object-curly-newline": "error",
      "object-curly-spacing": [
          "error",
          "always"
      ],
      "semi-spacing": "error",
      "space-before-blocks": "error",
      "space-before-function-paren": [
          "error",
          {
              "anonymous": "always",
              "named": "never",
              "asyncArrow": "always"
          }
      ],
      "space-in-parens": "error",
      "space-infix-ops": "error",
      "space-unary-ops": "error",
      "spaced-comment": [
          "error",
          "always"
      ],
      "no-extra-boolean-cast": "off",
      "switch-colon-spacing": "error",
      "arrow-body-style": [
          "error",
          "as-needed"
      ],
      "arrow-parens": [
          "error",
          "as-needed"
      ],
      "arrow-spacing": "error",
      "generator-star-spacing": [
          "error",
          "after"
      ],
      "no-confusing-arrow": "off",
      "no-useless-computed-key": "error",
      "no-useless-rename": "error",
      "object-shorthand": [
          "error",
          "always"
      ],
      "prefer-arrow-callback": "warn",
      "prefer-destructuring": "off",
      "rest-spread-spacing": [
          "error",
          "never"
      ],
      "sort-imports": "off",
      "template-curly-spacing": "error",
      "@typescript-eslint/no-extra-parens": "off",
      "@typescript-eslint/semi": [
          "error",
          "always"
      ],
      "@typescript-eslint/member-delimiter-style": [
          "error",
          {
              "multiline": {
                  "delimiter": "semi"
              }
          }
      ],
      "@typescript-eslint/member-ordering": "warn",
      "@typescript-eslint/no-magic-numbers": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/brace-style": [
          "error",
          "1tbs"
      ],
      "max-len": [
        "error",
        {
            "code": 150,
            "tabWidth": 2
        }
      ],
      "react/no-multi-comp": "off",
      "react/display-name": "off",
      "@typescript-eslint/quotes": [
          "error",
          "single",
          {
              "avoidEscape": true
          }
      ],
      "@typescript-eslint/func-call-spacing": [
          "error",
          "never"
      ],
      "react/prop-types": "off",
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/no-parameter-properties": "off",
      "@typescript-eslint/no-unnecessary-type-arguments": "warn",
      "@typescript-eslint/prefer-function-type": "warn",
      "@typescript-eslint/prefer-readonly": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/camelcase": [
          "off", // Temporary
          {
              "properties": "never"
          }
      ],
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/explicit-function-return-type": 0,
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-access-state-in-setstate": "error",
      "react/no-danger": "error",
      "react/no-this-in-sfc": "error",
      "react/prefer-stateless-function": "error",
      "react/jsx-filename-extension": [
          "error",
          {
              "extensions": [
                  ".tsx"
              ]
          }
      ],
      "react/jsx-no-bind": "error",
      "react/jsx-no-literals": "warn",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-pascal-case": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
  }
}
