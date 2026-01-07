"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "../solana/solana-provider";
import { DexFeature as DexUI } from "./dex-ui";

export function DexFeature() {
  const { publicKey } = useWallet();

  return (
    <div>
      {!publicKey && (
        <div className="fixed top-4 right-4 z-50">
          <WalletButton />
        </div>
      )}
      <DexUI />
    </div>
  );
}

