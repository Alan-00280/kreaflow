import { DashboardContainer } from "./_components/dashboard-container";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DashboardContainer />
    </div>
  );
}
