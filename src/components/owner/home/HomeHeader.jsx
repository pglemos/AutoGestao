import { Home } from "lucide-react";
import { greetingByHour } from "@/lib/owner-b44/format";
import { useOwner } from "@/components/owner/OwnerContext";
import OwnerPageHeading from "@/components/owner/OwnerPageHeading";

export default function HomeHeader() {
  const { user } = useOwner();
  const firstName = (user?.full_name || "Davi").split(" ")[0];

  return (
    <OwnerPageHeading
      icon={Home}
      title={`${greetingByHour()}, ${firstName}!`}
      subtitle="Aqui está o panorama da sua loja hoje."
    />
  );
}
