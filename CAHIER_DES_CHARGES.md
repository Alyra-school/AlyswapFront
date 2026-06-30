# Cahier des Charges — AlySwap

## 1. Contexte et compréhension de l’écosystème crypto

### 1.1 Contexte général
L’écosystème crypto repose sur des actifs numériques (tokens) échangés sur des blockchains publiques (Ethereum, principalement), avec des règles exécutées automatiquement par des smart contracts.

Dans ce contexte, la finance décentralisée (DeFi) permet d’échanger, prêter, emprunter ou staker des tokens sans intermédiaire central. Les applications DeFi s’appuient sur des primitives robustes, dont la plus critique est le **swap** (échange d’actifs).

### 1.2 Pourquoi notre projet nécessite un swapper
AlySwap a pour objectif de proposer une expérience d’échange on-chain transparente, testable et évolutive. Sans swapper:
- impossible de convertir un token en un autre de façon non custodiale,
- impossible de créer une expérience AMM complète (pool + liquidité + prix implicite),
- impossible d’étendre vers des mécanismes avancés (rewards, incentives, analytics).

Le swapper est donc le coeur fonctionnel du protocole: il permet l’exécution des échanges via un modèle AMM, tout en s’appuyant sur la liquidité des utilisateurs.

### 1.3 Positionnement d’AlySwap
AlySwap s’inspire du modèle Uniswap V2 pour:
- simplicité d’implémentation,
- robustesse du mécanisme mathématique,
- lisibilité pour audit et pédagogie,
- compatibilité avec les usages Ethereum.

---

## 2. Fonctionnalités principales (MVP + cible)

### 2.1 Fonctionnalités MVP
- Connexion wallet utilisateur (Reown/AppKit).
- Sélection réseau compatible.
- Consultation des contrats actifs (Factory, Router, WETH, tokens).
- Mint de tokens de test (en environnement non-mainnet).
- Création de paires de tokens.
- Ajout / retrait de liquidité.
- Swap de token A vers token B.
- Suivi d’état des transactions (pending/success/error).
- Historique d’activité utilisateur dans l’interface.

### 2.2 Fonctionnalités cibles post-MVP
- Slippage configurable avancé.
- Price impact et estimations détaillées.
- Multi-hop routing.
- Simulation de transaction avant signature.
- Historique enrichi et filtres.
- Intégration d’un module Rewards.

---

## 3. Calcul mathématique du swap (modèle Uniswap V2)

### 3.1 Invariant AMM
Le modèle repose sur l’invariant:

\[
X \times Y = K
\]

où:
- `X` = réserve token A,
- `Y` = réserve token B,
- `K` = constante du pool.

### 3.2 Calcul du montant de sortie
Pour un swap `amountIn` avec frais, la formule canonique V2 est:

\[
amountInWithFee = amountIn \times 997
\]
\[
amountOut = \frac{amountInWithFee \times reserveOut}{reserveIn \times 1000 + amountInWithFee}
\]

Cela intègre des frais de 0.3% (1000 - 997 = 3).

### 3.3 Effets économiques
- Plus `amountIn` est grand vs les réserves, plus le **price impact** augmente.
- Le prix est implicite et dépend du ratio des réserves.
- Les LP perçoivent les frais de swap via l’évolution de la valeur du pool.

### 3.4 Ajout et retrait de liquidité
- Ajout: l’utilisateur doit déposer les deux tokens selon le ratio courant du pool.
- Retrait: l’utilisateur brûle des LP tokens pour récupérer sa part proportionnelle des réserves.

### 3.5 Risques à prendre en compte
- Slippage élevé sur pools peu liquides.
- Impermanent loss côté LP.
- Reverts si allowances insuffisantes ou deadline expirée.

---

## 4. Fonctionnalités précises de l’application

### 4.1 Page Dashboard
- Hero explicatif produit.
- Contrats du réseau courant uniquement.
- Bloc d’activité (5 dernières actions utiles).
- Navigation vers Swap / Pool / Token / Rewards.

### 4.2 Page Swap
- Sélection token source / destination.
- Saisie montant entrant.
- Affichage quote sortie.
- Workflow transactionnel:
  1. Approve token source,
  2. Swap.
- États UX standardisés: `idle`, `approving`, `swapping`, `confirming`, `success`, `error`.

### 4.3 Page Pool
- Sélecteur des paires disponibles on-chain.
- Ajout de liquidité sur paire sélectionnée.
- Retrait de liquidité sur paire sélectionnée.
- Bloc de création de paire intégré.

### 4.4 Page Token
- Bloc `Token Balances`:
  - balance ETH native,
  - balances des tokens gérés.
- Bloc `Token Faucet`:
  - mint de tokens de test,
  - retours transactionnels et erreurs user-friendly.

### 4.5 Page Rewards 
Objectif: inciter la liquidité et/ou le volume de swap via des récompenses.

#### 4.5.1 Sous-fonctionnalités 
- Vue des campagnes actives (`APR`, durée, paires éligibles).
- Statut utilisateur:
  - stake LP en cours,
  - rewards accumulées,
  - rewards claimables.
- Actions:
  - `Stake LP`,
  - `Unstake LP`,
  - `Claim Rewards`.

#### 4.5.2 Logique Rewards 
- Base de calcul: LP tokens stakés et/ou volume de swap.
- Distribution continue par epoch/bloc.
- Contrat `RewardsController` responsable des snapshots et claims.

#### 4.5.3 Contraintes
- Prévenir les doubles claims.
- Gérer les changements de campagne sans perte d’historique.
- Prévoir garde-fous anti-abus (cooldown, minimum stake, etc.).

---

## 5. Design & UX guidelines

### 5.1 Principes de design
- Identité visuelle DeFi premium (glassmorphism léger, contrastes lisibles).
- Hiérarchie claire: Header > action principale > données > feedback.
- Cohérence des composants (cards, badges status, boutons, champs).

### 5.2 Eléments structurants
- Header avec:
  - logo,
  - titre/sous-titre,
  - navigation principale,
  - balance + bouton Reown.
- Hero dashboard animé (orbites / tags interactifs).
- Layout responsive mobile-first.
- Feedback transactionnel via toasts et états de formulaire.

### 5.3 Accessibilité & lisibilité
- Contrastes conformes sur textes critiques.
- Focus visible sur éléments interactifs.
- Labels explicites sur champs de saisie.
- Messages d’erreur compréhensibles (notamment refus de signature wallet).

---

## 6. Connexion wallet via Reown

### 6.1 Objectifs
- Permettre connexion/déconnexion fiable.
- Supporter wallets majeurs Ethereum.
- Gérer le switch réseau selon besoins produit.

### 6.2 Exigences
- Bouton Reown natif (AppKit).
- Sessions persistantes contrôlées.
- Message clair si mauvais réseau.
- Synchronisation des données wallet (adresse, balance, chainId).

### 6.3 Qualité attendue
- Pas d’erreurs d’hydratation côté Next.
- Pas de blocage spinner permanent en condition nominale.
- Gestion robuste des erreurs de signature/reject.

---

## 7. Sélection réseau — cible Mainnet Ethereum

### 7.1 Exigence produit
La cible finale de l’application est **Ethereum Mainnet**.

### 7.2 Phases de déploiement recommandées
1. **Phase test**: Local + Sepolia (validation fonctionnelle et UX).
2. **Phase pre-prod**: Sepolia stabilisée + monitoring.
3. **Phase prod**: Mainnet Ethereum uniquement (ou priorité mainnet).

### 7.3 Conditions de passage en mainnet
- Audit smart contracts.
- Revue sécurité front (approvals, replay, erreurs UX).
- Vérification des adresses de contrats mainnet.
- Plan incident (pause, alerting, rollback front).

### 7.4 Comportement attendu côté UI
- Réseau courant clairement affiché.
- Blocage explicite des actions si réseau non conforme.
- Support switch réseau simplifié.

---

## 8. Contraintes techniques et qualité

### 8.1 Frontend
- Next.js (App Router).
- React + wagmi + viem + Reown AppKit.
- Typage TypeScript strict.

### 8.2 Backend smart contracts
- Hardhat + contrats AMM type Uniswap V2.
- Scripts de déploiement par environnement.
- Export d’adresses consommable par frontend.

### 8.3 Qualité attendue
- Build reproductible.
- Pas de secrets commités.
- Messages d’erreur user-friendly.
- Cohérence design sur desktop/mobile.

---

## 9. Critères d’acceptation

- L’utilisateur connecte son wallet via Reown sans friction majeure.
- Le swap fonctionne sur réseau cible avec états UX complets.
- Le pool permet create pair + add/remove liquidity sur paires disponibles.
- La page Token affiche soldes + faucet opérationnel (selon environnement).
- Le dashboard présente:
  - contexte produit,
  - contrats du réseau courant,
  - activité récente.
- La navigation vers `/rewards` retourne une 404 custom tant que non implémentée.

---

## 10. Roadmap courte

### V1 (actuelle)
- Swap / Pool / Token / Dashboard / Activity / 404 custom.

### V1.1
- Durcissement Reown + réseau.
- Meilleure observabilité des transactions.

### V2
- Rewards module complet.
- Mainnet-first UX.
- Analytics et reporting avancé.

