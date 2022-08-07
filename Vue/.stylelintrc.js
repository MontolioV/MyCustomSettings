module.exports = {
  extends: 'stylelint-config-standard',
  plugins: ['stylelint-selector-bem-pattern', 'stylelint-scss'],
  rules: {
    'plugin/selector-bem-pattern': {
      preset: 'bem',
      implicitComponents:
        'src/+(components|pages|layouts)/**/*.+(css|scss|sass)',
      presetOptions: {
        namespace: 'tp',
      },
    },

    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
  },
};
