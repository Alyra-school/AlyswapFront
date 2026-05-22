import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="card stack">
      <p className="hero-kicker">Error 404</p>
      <h2 className="hero-title">Page introuvable</h2>
      <p className="muted">
        La route demandee n&apos;existe pas encore sur AlySwap.
      </p>
      <div className="hero-cta-row">
        <Link href="/" className="action-link">
          Retour au Dashboard
        </Link>
        <Link href="/swap" className="action-link">
          Aller au Swap
        </Link>
      </div>
    </section>
  );
}

