import { getDeployment } from "@/config/networks";
import { factoryAbi, routerAbi } from "@/contracts/abis";

export function getContractsByChain(chainId?: number) {
  const network = chainId === 11155111 ? "sepolia" : "localhost";
  const dep = getDeployment(network);

  return {
    deployment: dep,
    factory: {
      address: dep.factory,
      abi: factoryAbi
    },
    router: {
      address: dep.router,
      abi: routerAbi
    }
  };
}
