# Fresh Mart frontend tests (Sprints 1 to 3)

16 tests in total: Sprint 1 has 5, Sprint 2 has 5, Sprint 3 has 6.

## 1. Where to put this folder

Copy the whole `tests` folder into your frontend project root, next to `src` and `package.json`:

```
your-frontend/
├── src/
├── tests/        <- this folder
└── package.json
```

## 2. Install the test tools (once)

```
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

If npm complains about peer dependencies, run the same command again with `--legacy-peer-deps` at the end.

## 3. Add one line to package.json

Inside `"scripts"`, add:

```
"test": "vitest run --config tests/vitest.config.js"
```

## 4. Run

```
npm test
```

To keep the tests running while you work: `npx vitest --config tests/vitest.config.js`

## What is tested

| File | Tests |
|------|-------|
| sprint1.test.jsx | Catalog requests use the backend's category slug and sort names; stock status, pictures and the availability/price filters; the login token is sent only to private endpoints; registration shows a message under each wrong field; a product card shows price and stock and only offers Add to cart when allowed |
| sprint2.test.jsx | Empty cart message; items and totals with the checkout link; plus stops at the stock limit and minus stops at one; plus asks the cart to change the quantity; Clear cart only works after confirming |
| sprint3.test.jsx | Phone rule matches the backend; delivery fees ($2 standard, $5 express); the order request body; checkout blocks an incomplete form; checkout reviews, places the order and opens the confirmation; order history lists orders with status, total and items |

## Notes

- The tests never call the real backend. They use fake replies, so the backend does not need to be running.
- Your own code is not changed by anything in this folder. To remove the tests later, delete the `tests` folder and the `"test"` line.
