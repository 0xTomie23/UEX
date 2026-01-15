import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dex } from "../../target/types/dex";
import { PublicKey } from "@solana/web3.js";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.Dex as Program<Dex>;
export const payer = provider.wallet.payer;

export const SEEDS = {
  POOL: "pool",
  VAULT: "vault",
  LP_TOKEN: "lp_token",
};

export function getPoolPda(mintX: PublicKey, mintY: PublicKey): PublicKey {
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.POOL), mintX.toBuffer(), mintY.toBuffer()],
    program.programId
  );
  return PDA;
}

export function getLpMintPda(pool: PublicKey): PublicKey {
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.LP_TOKEN), pool.toBuffer()],
    program.programId
  );
  return PDA;
}

export function getVaultPda(pool: PublicKey, mint: PublicKey): PublicKey {
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT), pool.toBuffer(), mint.toBuffer()],
    program.programId
  );
  return PDA;
}