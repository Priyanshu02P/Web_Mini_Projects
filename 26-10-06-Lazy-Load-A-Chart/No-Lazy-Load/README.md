# No Lazy Loading

This version imports the chart normally:

```jsx
import Chart from "../../src/Chart";
```

Build it:

```bash
npm install
npm run build
```

Look inside `dist/assets/`. The chart library/component is part of the
initial JavaScript dependency graph.

Run locally:

```bash
npm run dev
```

For a fair comparison, run the same Lighthouse settings against both versions.


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
