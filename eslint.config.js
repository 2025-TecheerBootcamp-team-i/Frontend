import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config([
    { ignores: ['dist', 'build', 'coverage'] },

    {
        files: ['**/*.{ts,tsx}'],
        extends: [
        js.configs.recommended,
        ...tseslint.configs.recommended,
        ],
        languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        sourceType: 'module',
        },
        plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
        },
        rules: {
        // ✅ hooks 규칙은 rules만 가져오기 (중요)
        ...reactHooks.configs.recommended.rules,

        // ✅ Vite Fast Refresh 규칙
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
        ],
        },
    },
]);
