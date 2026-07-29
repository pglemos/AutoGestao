import MetricCard from "./MetricCard";
import MxScoreCard from "./MxScoreCard";
import { mainIndicators } from "./homeData";

export default function MainIndicators() {
  return (
    <div role="list" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {mainIndicators.map((ind) => (
        <MetricCard key={ind.id} indicator={ind} />
      ))}
      <div className="col-span-2 sm:col-span-1 lg:col-span-1">
        <MxScoreCard />
      </div>
    </div>
  );
}