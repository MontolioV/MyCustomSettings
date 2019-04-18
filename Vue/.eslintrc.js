/* eslint object-property-newline: 'off'*/

const envProd = 'production'

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [ 'eslint:recommended', 'plugin:vue/recommended', ],
  plugins: [],

  // add your custom rules here
  rules: {
    // enforce a maximum line length
    'max-len': [ 'error', { 'code': 100, 'ignoreUrls': true, 'ignoreStrings': true, }, ],
    // enforce consistent indentation
    'indent': [ 'error', 2, ],
    // enforce the consistent use of either backticks, double, or single quotes
    'quotes': [ 'error', 'single', ],
    // require or disallow semicolons instead of ASI
    'semi': [ 'error', 'never', ],
    'comma-spacing': [ 'error', { 'before': false, 'after': true, }, ],
    // require or disallow trailing commas
    'comma-dangle': [ 'error', 'always', ],
    // enforce consistent spacing after the // or /* in a comment
    'spaced-comment': [ 'error', 'always', ],
    // allow paren-less arrow functions
    'arrow-parens': [ 'error', 'always', ],
    // disallow multiple spaces
    'no-multi-spaces': 'error',
    // enforce consistent spacing before and after keywords
    'keyword-spacing': [ 'error', { 'before': true, 'after': true, }, ],
    // require spacing around infix operators
    'space-infix-ops': 'error',

    // Functions
    // require or disallow spacing between function identifiers and their invocations
    'func-call-spacing': [ 'error', 'never', ],
    // enforce consistent spacing before function definition opening parenthesis
    'space-before-function-paren': [ 'error', 'always', ],

    // Objects
    // enforce consistent spacing inside braces
    'object-curly-spacing': [ 'error', 'always', ],
    // enforce linebreaks after opening and before closing array brackets
    'object-curly-newline': [ 'error', { 'multiline': true, 'consistent': true, }, ],
    // enforce line breaks after each array element
    'object-property-newline': 'error',
    // enforce consistent spacing between keys and values in object literal properties
    'key-spacing': [ 'error', { 'beforeColon': false, 'mode': 'strict', }, ],

    // Arrays
    // enforce linebreaks after opening and before closing array brackets
    'array-bracket-spacing': [ 'error', 'always', ],
    // enforce linebreaks after opening and before closing array brackets
    'array-bracket-newline': [ 'error', { 'minItems': 4, 'multiline': true, }, ],
    // enforce line breaks after each array element
    'array-element-newline': [ 'error', { 'minItems': 4, 'multiline': true, }, ],

    // allow alerts, console, debugger, unused-vars during development
    'no-alert': process.env.NODE_ENV === envProd ? 2 : 0,
    'no-console': process.env.NODE_ENV === envProd ? 2 : 0,
    'no-debugger': process.env.NODE_ENV === envProd ? 2 : 0,
    'no-unused-vars': process.env.NODE_ENV === envProd ? 2 : 0,
  },
}
