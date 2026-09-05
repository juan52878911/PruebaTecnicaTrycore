// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // Axios vive confinado en core/api/axios-instance.ts. Es lo que hace que cambiar de cliente
      // HTTP sea reescribir un fichero en lugar de tocar cada servicio, y evita que alguien cree
      // una segunda instancia por descuido, sin interceptores ni configuración por entorno.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Importa AXIOS_INSTANCE desde core/api/axios-instance en lugar de axios directamente.',
            },
          ],
          patterns: [
            {
              group: ['**/testing/*', '**/testing'],
              message: 'Las ayudas de prueba solo se importan desde ficheros *.spec.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // El único fichero autorizado a construir la instancia de axios, y los interceptores que
    // necesitan sus tipos. Aquí la regla anterior se apaga a propósito.
    files: [
      'src/app/core/api/axios-instance.ts',
      'src/app/core/api/interceptors/*.ts',
      'src/app/core/api/testing/*.ts',
      'src/app/core/api/*-api.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Los specs sí pueden usar las ayudas de prueba.
    files: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
