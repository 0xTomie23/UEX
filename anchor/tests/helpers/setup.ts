import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dex } from "../../target/types/dex";
import { PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
export const provider = anchor.AnchorProvider.local();
anchor.setProvider(provider);

export const program = anchor.workspace.Dex as Program<Dex>;
export const payer = (provider.wallet as anchor.Wallet).payer;
export const connection = provider.connection;

export const SEEDS = {
  POOL: "pool",
  LP_TOKEN: "lp_token",
  VAULT: "vault",
}

export function getPoolPda(mintX: PublicKey, mintY: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from(SEEDS.POOL),
    mintX.toBuffer(),
    mintY.toBuffer(),
  ],
    program.programId
  );
  return pda;
}

export function getLpMintPda(pool: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from(SEEDS.LP_TOKEN),
    pool.toBuffer(),
  ],
    program.programId);
  return pda;
}

export function getVaultPda(pool: PublicKey, mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from(SEEDS.VAULT),
    pool.toBuffer(),
    mint.toBuffer(),
  ],
    program.programId);
  return pda;
}

export async function createTestMint(decimals: number = 6): Promise<PublicKey> {
  return await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    decimals,
  );
}

export async function createSortedTestMints(decimals: number = 6): Promise<[PublicKey, PublicKey]> {
  const mintA = await createTestMint(decimals);
  const mintB = await createTestMint(decimals);

  if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
    return [mintB, mintA]
  } else {
    return [mintA, mintB]
  }
}