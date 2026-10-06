import Chart from "./Chart";

export default function App() {
  return (
    <main className="page">
      <header>
        <h1>Dashboard — No Lazy Loading</h1>
        <p>
          The chart is imported normally, so its dependency is included in
          the initial JavaScript graph.
        </p>
      </header>

      <section className="card">
        <h2>Today's summary</h2>
        <p>Orders: 128</p>
        <p>Active users: 76</p>
      </section>

      <Chart />
    </main>
  );
}
