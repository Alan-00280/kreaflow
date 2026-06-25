import { redirect } from "next/navigation";
import { Logistics } from "./_components/logistics";

// Import this stylesheet in any page or component that renders country flag classes.
import "@/styles/flag-icons/flags.css";

export default function Page() {
  redirect('/unauthorized')
  return <Logistics />;
}
