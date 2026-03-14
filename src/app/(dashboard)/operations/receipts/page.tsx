import { OperationsPage } from "@/components/operations/operations-page";

export default function ReceiptsPage() {
  return (
    <OperationsPage
      operationType="RECEIPT"
      title="Receipts"
      sourceLabel="Source (Vendor)"
      destLabel="Destination"
    />
  );
}
