import type React from "react";

declare global {
  type AppKitButtonProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    balance?: "show" | "hide";
    size?: "md" | "sm";
    label?: string;
    loadingLabel?: string;
    namespace?: "eip155" | "solana" | "bip122";
  };

  namespace JSX {
    interface IntrinsicElements {
      "appkit-button": AppKitButtonProps;
    }
  }
}

export {};
