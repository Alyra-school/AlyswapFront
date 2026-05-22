import { PoolForm } from "@/components/pool-form";
import { CreatePairForm } from "@/components/create-pair-form";

export default function PoolPage() {
  return (
    <div className="grid">
      <PoolForm />
      <CreatePairForm />
    </div>
  );
}
