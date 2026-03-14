import { OperationsPage } from "@/components/operations/operations-page";

export default function InternalTransfersPage() {
  return (
    <OperationsPage
      operationType="INTERNAL"
      title="Internal Transfers"
      sourceLabel="Source Location"
      destLabel="Destination Location"
    />
  );
}
