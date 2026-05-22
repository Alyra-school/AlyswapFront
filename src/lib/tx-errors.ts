export function toUserErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const m = error.message.toLowerCase();

  if (
    m.includes("user rejected") ||
    m.includes("user denied") ||
    m.includes("rejected the request") ||
    m.includes("transaction signature")
  ) {
    return "Transaction refusée dans le wallet.";
  }

  if (m.includes("insufficient funds")) {
    return "Fonds insuffisants pour payer la transaction.";
  }

  if (m.includes("execution reverted") || m.includes("revert")) {
    return "La transaction a été revert par le contrat.";
  }

  if (m.includes("network") || m.includes("chain")) {
    return "Réseau non supporté ou mauvaise chaîne sélectionnée.";
  }

  return error.message;
}
