/**
 * ChartRenderer — dispatches to the correct chart component
 * based on the `type` field in the backend chat response.
 */
import BarChartView  from "./charts/BarChartView";
import LineChartView from "./charts/LineChartView";
import PieChartView  from "./charts/PieChartView";

export default function ChartRenderer({ chart }) {
  if (!chart || chart.type === "none" || !chart.data?.length) return null;

  const props = {
    title: chart.title,
    data:  chart.data,
    xKey:  chart.x_key,
    yKeys: chart.y_keys,
  };

  switch (chart.type) {
    case "bar":   return <BarChartView  {...props} />;
    case "line":  return <LineChartView {...props} />;
    case "pie":   return <PieChartView  {...props} />;
    // "table" type is handled by ResultTable, not here
    default:      return null;
  }
}
