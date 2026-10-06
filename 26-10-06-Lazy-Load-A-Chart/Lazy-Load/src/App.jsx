import { lazy, Suspense } from "react";

const Chart = lazy(() => import("./Chart"));

export default function App() {
  return (
    <main className="page">
      <header>
        <h1>Dashboard — With Lazy Loading</h1>
        <p>
          The chart is split into another JavaScript chunk and loaded when
          React needs to render it.
        </p>
      </header>

      <section className="card">
        <h2>Today's summary</h2>
        <p>Orders: 128</p>
        <p>Active users: 76</p>
      </section>

      <Suspense fallback={<div className="card loading">Loading chart…</div>}>
        <Chart />
      </Suspense>
    </main>
  );
}
