import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const data = [
  { day: "Mon", users: 35 },
  { day: "Tue", users: 48 },
  { day: "Wed", users: 42 },
  { day: "Thu", users: 70 },
  { day: "Fri", users: 64 },
  { day: "Sat", users: 82 },
  { day: "Sun", users: 76 }
];

export default function Chart() {
  return (
    <section className="card">
      <h2>Weekly activity</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="users"
              strokeWidth={3}
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
