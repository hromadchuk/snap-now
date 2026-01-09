import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const eslintConfig = [
    {
        ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
            'react-hooks': reactHooks,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 1,
            '@typescript-eslint/no-require-imports': 2,
            '@typescript-eslint/no-unused-vars': 2,
            '@typescript-eslint/no-unsafe-function-type': 2,
            '@typescript-eslint/no-unused-expressions': 2,
            '@typescript-eslint/no-this-alias': 2,
            '@typescript-eslint/member-ordering': 2,
            '@typescript-eslint/no-inferrable-types': 2,
            '@typescript-eslint/no-empty-interface': 1,
            '@typescript-eslint/adjacent-overload-signatures': 2,
            '@typescript-eslint/no-namespace': 2,
            '@typescript-eslint/no-array-constructor': 2,
            '@typescript-eslint/no-shadow': 2,
            '@typescript-eslint/explicit-function-return-type': 0,

            'prefer-const': 2,
            'no-control-regex': 2,
            'no-case-declarations': 2,
            'prettier/prettier': 2,
            curly: [2, 'all'],
            'no-constant-binary-expression': 2,
            'prefer-rest-params': 2,
            'no-mixed-spaces-and-tabs': 2,
            'brace-style': 2,
            'max-lines': [
                2,
                {
                    max: 2000,
                    skipBlankLines: true,
                },
            ],
            'max-lines-per-function': [
                2,
                {
                    max: 500,
                },
            ],
            'no-use-before-define': [
                2,
                {
                    functions: false,
                },
            ],
            'no-tabs': 2,
            'key-spacing': 2,
            'max-len': [
                1,
                {
                    code: 120,
                },
            ],
            'comma-spacing': 2,
            'array-bracket-spacing': 2,
            'space-in-parens': 2,
            'no-trailing-spaces': 2,
            'space-infix-ops': 2,
            'keyword-spacing': 2,
            'space-before-blocks': 2,
            'no-multiple-empty-lines': [
                2,
                {
                    max: 1,
                },
            ],
            semi: [2, 'always'],
            quotes: [
                2,
                'single',
                {
                    allowTemplateLiterals: false,
                },
            ],
            camelcase: [
                2,
                {
                    properties: 'never',
                },
            ],
            'no-implicit-coercion': 2,
            'no-extra-boolean-cast': [
                2,
                {
                    enforceForLogicalOperands: true,
                },
            ],
            'max-depth': [
                1,
                {
                    max: 5,
                },
            ],
            'default-case': 2,
            'dot-notation': 2,
            'no-eval': 2,
            'no-extend-native': 2,
            'no-extra-bind': 2,
            'no-multi-spaces': 2,
            'no-useless-return': 2,
            'no-console': 0,
            'no-useless-escape': 2,
            'no-async-promise-executor': 2,
            'computed-property-spacing': 2,
            'no-inner-declarations': 2,
            'consistent-this': ['error', 'self'],
            'func-call-spacing': 2,
            'func-names': 2,
            'no-empty': 2,
            'func-name-matching': 2,
            'func-style': [
                2,
                'declaration',
                {
                    allowArrowFunctions: true,
                },
            ],
            indent: [
                2,
                4,
                {
                    SwitchCase: 1,
                },
            ],
            'line-comment-position': 2,
            'lines-around-comment': 0,
            'linebreak-style': 2,
            'max-statements-per-line': 2,
            'no-lonely-if': 2,
            'no-unsafe-optional-chaining': 2,
            'no-else-return': [
                2,
                {
                    allowElseIf: true,
                },
            ],
            'no-negated-condition': 2,
            'no-param-reassign': [
                2,
                {
                    props: false,
                },
            ],
            'object-shorthand': [
                2,
                'always',
                {
                    avoidExplicitReturnArrows: false,
                },
            ],
            'prefer-spread': 2,
            'no-prototype-builtins': 2,
            'no-multi-assign': 2,
            'no-unneeded-ternary': 2,
            'no-nested-ternary': 2,
            'object-property-newline': [
                2,
                {
                    allowAllPropertiesOnSameLine: true,
                },
            ],
            'operator-linebreak': [
                2,
                'after',
                {
                    overrides: {
                        '?': 'before',
                        ':': 'before',
                    },
                },
            ],
            'use-isnan': 2,
            'consistent-return': [2, {}],
            'no-self-compare': 2,
            'no-duplicate-imports': 2,
            'no-return-assign': 2,
            'array-callback-return': 2,
            'block-scoped-var': 2,
            'prefer-arrow-callback': 2,
            'prefer-object-spread': 2,
            'require-await': 1,
            yoda: 2,
            'quote-props': [2, 'as-needed'],
            'semi-spacing': 2,
            'no-empty-pattern': 2,
            'spaced-comment': 2,
            'no-useless-catch': 2,
            'no-self-assign': 2,
            'no-debugger': 2,
            'no-unreachable': 2,
            'one-var': [2, 'never'],
            'eol-last': 2,
            'no-var': 2,
            'sort-imports': [
                2,
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                },
            ],
            'react-hooks/exhaustive-deps': 0,
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            prettier: eslintPluginPrettier,
            'simple-import-sort': simpleImportSort,
            import: eslintPluginImport,
        },
        rules: {
            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        ['^\\u0000'],

                        ['^node:'],

                        ['^react', '^@?\\w'],

                        ['^src/', '^[^.]'],

                        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

                        ['^\\./(?=.*[^/]$)', '^\\./?$'],

                        ['\\.s?css$'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',
            'import/no-duplicates': 'error',
        },
    },
];

export default eslintConfig;
