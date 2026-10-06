# With Lazy Loading

This version uses:

```jsx
const Chart = lazy(() => import("../../src/Chart"));
```

and:

```jsx
<Suspense fallback={<div>Loading chart…</div>}>
  <Chart />
</Suspense>
```

Build it:

```bash
npm install
npm run build
```

Look inside `dist/assets/`. Vite should create a separate chunk for the
dynamically imported chart dependency.

Run locally:

```bash
npm run dev
```

Open DevTools → Network → JS and reload. Compare the initial JavaScript
requests with the no-lazy version.

For an especially useful experiment, move the chart below a large amount of
content or behind a button. Then lazy loading has a better chance of helping
the initial page load.


## Docker

Build:

```bash
docker build -t chart-demo:latest .
```

Run:

```bash
docker run --rm -p 8080:80 chart-demo:latest
```

Open http://localhost:8080

To compare the two versions, build each project with a different image tag, for example:

```bash
docker build -t chart-demo-no-lazy .
docker run --rm -p 8080:80 chart-demo-no-lazy
```

and:

```bash
docker build -t chart-demo-with-lazy .
docker run --rm -p 8081:80 chart-demo-with-lazy
```

Then compare `http://localhost:8080` and `http://localhost:8081` using Chrome DevTools → Network → JS.
