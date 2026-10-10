# React + Vite

## Local cart demo

Add these settings to `.env` to start as a demo shopper and use the bundled
sample products without running the backend:

```env
VITE_MOCK_LOGIN=true
VITE_USE_MOCK=true
```

`VITE_MOCK_LOGIN` signs in a local demo user on app startup. `VITE_USE_MOCK`
switches product and API requests to the bundled mock data. Either setting can
be used independently. Restart the Vite dev server after changing environment
variables. The demo cart is saved in this browser's local storage.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
