import { OperationsPage } from "@/components/operations/operations-page";

export default function DeliveriesPage() {
  return (
    <OperationsPage
      operationType="DELIVERY"
      title="Deliveries"
      sourceLabel="Source"
      destLabel="Destination (Customer)"
    />
  );
}
