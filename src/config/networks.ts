import localhostDeployment from "./deployments/localhost.json";
import sepoliaDeployment from "./deployments/sepolia.json";
import type { NetworkContracts } from "@/types/contracts";

export const deployments: Record<string, NetworkContracts> = {
  localhost: localhostDeployment as NetworkContracts,
  sepolia: sepoliaDeployment as NetworkContracts
};

export function getDeployment(network: string): NetworkContracts {
  return deployments[network] ?? deployments.localhost;
}
