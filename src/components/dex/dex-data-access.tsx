"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { useMemo } from "react";
import { useTransactionToast } from "../use-transaction-toast";

// Token 信息类型
export interface TokenInfo {
  mint: PublicKey;
  balance: bigint;
  decimals: number;
  symbol?: string;
  name?: string;
}

// 本地存储代币名称的 key
const TOKEN_NAMES_KEY = "dex_token_names";

// 保存代币名称到 localStorage
export function saveTokenName(mint: string, name: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(TOKEN_NAMES_KEY);
    const names = stored ? JSON.parse(stored) : {};
    names[mint] = name;
    localStorage.setItem(TOKEN_NAMES_KEY, JSON.stringify(names));
  } catch (e) {
    console.error("Failed to save token name:", e);
  }
}

// 从 localStorage 获取代币名称
export function getTokenName(mint: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = localStorage.getItem(TOKEN_NAMES_KEY);
    if (!stored) return undefined;
    const names = JSON.parse(stored);
    return names[mint];
  } catch (e) {
    return undefined;
  }
}

// 获取所有保存的代币名称
export function getAllTokenNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(TOKEN_NAMES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

// IDL 和常量
import idl from "../../../anchor/target/idl/dex.json";

export const PROGRAM_ID = new PublicKey(
  "CMmmm4HjjqMTuPafBuRxMxgA3Z8cfSPMsE3cxNUU4P13"
);

export const SEEDS = {
  POOL: "pool",
  VAULT: "vault",
  LP_TOKEN: "lp_token",
};

// 获取 Program 实例
export function useDexProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new anchor.AnchorProvider(
      connection,
      wallet as anchor.Wallet,
      anchor.AnchorProvider.defaultOptions()
    );

    return new anchor.Program(idl as anchor.Idl, provider);
  }, [connection, wallet]);
}

// 排序 Mint 地址（确保 mintX < mintY）
export function sortMints(mintA: PublicKey, mintB: PublicKey): [PublicKey, PublicKey] {
  if (mintA.toBuffer().compare(mintB.toBuffer()) < 0) {
    return [mintA, mintB];
  }
  return [mintB, mintA];
}

// 推导 Pool PDA
export function getPoolPda(mintX: PublicKey, mintY: PublicKey): PublicKey {
  // 自动排序
  const [sortedX, sortedY] = sortMints(mintX, mintY);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.POOL), sortedX.toBuffer(), sortedY.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// 推导 LP Mint PDA
export function getLpMintPda(pool: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.LP_TOKEN), pool.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// 推导 Vault PDA
export function getVaultPda(pool: PublicKey, mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT), pool.toBuffer(), mint.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// 查询 Pool 信息
export function usePoolInfo(mintX: PublicKey | null, mintY: PublicKey | null) {
  const program = useDexProgram();
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["pool", mintX?.toString(), mintY?.toString()],
    queryFn: async () => {
      if (!program || !mintX || !mintY) return null;

      // 排序 mint 地址
      const [sortedMintX, sortedMintY] = sortMints(mintX, mintY);
      const poolPda = getPoolPda(sortedMintX, sortedMintY);

      try {
        const poolAccount = await program.account.liquidityPool.fetch(poolPda);
        const xVaultPda = getVaultPda(poolPda, sortedMintX);
        const yVaultPda = getVaultPda(poolPda, sortedMintY);

        // 获取 Vault 余额
        let xVaultBalance = BigInt(0);
        let yVaultBalance = BigInt(0);

        try {
          const xVaultAccount = await getAccount(connection, xVaultPda);
          xVaultBalance = xVaultAccount.amount;
        } catch {}

        try {
          const yVaultAccount = await getAccount(connection, yVaultPda);
          yVaultBalance = yVaultAccount.amount;
        } catch {}

        return {
          address: poolPda,
          data: poolAccount,
          lpMint: getLpMintPda(poolPda),
          xVault: xVaultPda,
          yVault: yVaultPda,
          xVaultBalance,
          yVaultBalance,
          exists: true,
        };
      } catch {
        return {
          address: poolPda,
          lpMint: getLpMintPda(poolPda),
          xVault: getVaultPda(poolPda, sortedMintX),
          yVault: getVaultPda(poolPda, sortedMintY),
          xVaultBalance: BigInt(0),
          yVaultBalance: BigInt(0),
          exists: false,
        };
      }
    },
    enabled: !!program && !!mintX && !!mintY,
    refetchInterval: 10000,
  });
}

// 查询用户代币余额
export function useTokenBalance(mint: PublicKey | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["tokenBalance", mint?.toString(), publicKey?.toString()],
    queryFn: async () => {
      if (!mint || !publicKey) return BigInt(0);

      try {
        const ata = await getAssociatedTokenAddress(mint, publicKey);
        const account = await getAccount(connection, ata);
        return account.amount;
      } catch {
        return BigInt(0);
      }
    },
    enabled: !!mint && !!publicKey,
    refetchInterval: 5000,
  });
}

// Initialize Pool
export function useInitializePool() {
  const program = useDexProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const transactionToast = useTransactionToast();

  return useMutation({
    mutationFn: async ({
      mintX,
      mintY,
    }: {
      mintX: PublicKey;
      mintY: PublicKey;
    }) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const poolPda = getPoolPda(mintX, mintY);
      const lpMintPda = getLpMintPda(poolPda);

      const tx = await program.methods
        .initializePool()
        .accounts({
          payer: publicKey,
          userXMint: mintX,
          userYMint: mintY,
          pool: poolPda,
          lpMint: lpMintPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      return signature;
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      queryClient.invalidateQueries({ queryKey: ["pool"] });
    },
  });
}

// Initialize Vault
export function useInitializeVault() {
  const program = useDexProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const transactionToast = useTransactionToast();

  return useMutation({
    mutationFn: async ({
      mintX,
      mintY,
    }: {
      mintX: PublicKey;
      mintY: PublicKey;
    }) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const poolPda = getPoolPda(mintX, mintY);
      const xVaultPda = getVaultPda(poolPda, mintX);
      const yVaultPda = getVaultPda(poolPda, mintY);

      const tx = await program.methods
        .initializeVault()
        .accounts({
          payer: publicKey,
          userXMint: mintX,
          userYMint: mintY,
          pool: poolPda,
          xVault: xVaultPda,
          yVault: yVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      return signature;
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      queryClient.invalidateQueries({ queryKey: ["pool"] });
    },
  });
}

// Initialize Pool + Vault (合并操作，分两笔交易)
export function useInitializePoolAndVault() {
  const program = useDexProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const transactionToast = useTransactionToast();

  return useMutation({
    mutationFn: async ({
      mintX,
      mintY,
    }: {
      mintX: PublicKey;
      mintY: PublicKey;
    }) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // 排序 mint 地址，确保 mintX < mintY
      const [sortedMintX, sortedMintY] = sortMints(mintX, mintY);
      
      const poolPda = getPoolPda(sortedMintX, sortedMintY);
      const lpMintPda = getLpMintPda(poolPda);
      const xVaultPda = getVaultPda(poolPda, sortedMintX);
      const yVaultPda = getVaultPda(poolPda, sortedMintY);

      console.log("Creating pool with sorted mints:");
      console.log("  MintX:", sortedMintX.toString());
      console.log("  MintY:", sortedMintY.toString());
      console.log("  Pool PDA:", poolPda.toString());

      // 第一笔交易：Initialize Pool (使用 .rpc() 自动签名)
      const sig1 = await program.methods
        .initializePool()
        .accounts({
          payer: publicKey,
          userXMint: sortedMintX,
          userYMint: sortedMintY,
          pool: poolPda,
          lpMint: lpMintPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Pool initialized, signature:", sig1);

      // 第二笔交易：Initialize Vault (使用 .rpc() 自动签名)
      const sig2 = await program.methods
        .initializeVault()
        .accounts({
          payer: publicKey,
          userXMint: sortedMintX,
          userYMint: sortedMintY,
          pool: poolPda,
          xVault: xVaultPda,
          yVault: yVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Vaults initialized, signature:", sig2);

      return sig2; // 返回最后一笔交易签名
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      queryClient.invalidateQueries({ queryKey: ["pool"] });
    },
    onError: (error: any) => {
      console.error("Initialize pool error:", error);
      // 尝试解析更详细的错误信息
      if (error?.logs) {
        console.error("Transaction logs:", error.logs);
      }
      if (error?.message) {
        alert(`Error: ${error.message}`);
      }
    },
  });
}

// Add Liquidity
export function useAddLiquidity() {
  const program = useDexProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const transactionToast = useTransactionToast();

  return useMutation({
    mutationFn: async ({
      mintX,
      mintY,
      amountX,
      amountY,
    }: {
      mintX: PublicKey;
      mintY: PublicKey;
      amountX: bigint;
      amountY: bigint;
    }) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // 排序 mint 地址
      const [sortedMintX, sortedMintY] = sortMints(mintX, mintY);
      // 如果排序后顺序变了，也要交换 amount
      const isSwapped = !mintX.equals(sortedMintX);
      const [sortedAmountX, sortedAmountY] = isSwapped 
        ? [amountY, amountX] 
        : [amountX, amountY];

      const poolPda = getPoolPda(sortedMintX, sortedMintY);
      const lpMintPda = getLpMintPda(poolPda);

      // 获取用户 ATA
      const userXAta = await getAssociatedTokenAddress(sortedMintX, publicKey);
      const userYAta = await getAssociatedTokenAddress(sortedMintY, publicKey);
      const userLpAta = await getAssociatedTokenAddress(lpMintPda, publicKey);

      // 获取 Pool 的 ATA (vault)
      const xVault = await getAssociatedTokenAddress(sortedMintX, poolPda, true);
      const yVault = await getAssociatedTokenAddress(sortedMintY, poolPda, true);

      console.log("Adding liquidity:");
      console.log("  MintX:", sortedMintX.toString());
      console.log("  MintY:", sortedMintY.toString());
      console.log("  AmountX:", sortedAmountX.toString());
      console.log("  AmountY:", sortedAmountY.toString());

      // 使用 .rpc() 自动签名
      const signature = await program.methods
        .addLiquidity(new anchor.BN(sortedAmountX.toString()), new anchor.BN(sortedAmountY.toString()))
        .accounts({
          payer: publicKey,
          pool: poolPda,
          userXMint: sortedMintX,
          userYMint: sortedMintY,
          lpMint: lpMintPda,
          xVault: xVault,
          yVault: yVault,
          userTokenAccountX: userXAta,
          userTokenAccountY: userYAta,
          userLpTokenAccount: userLpAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Liquidity added, signature:", signature);
      return signature;
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      queryClient.invalidateQueries({ queryKey: ["pool"] });
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
      queryClient.invalidateQueries({ queryKey: ["userTokens"] });
    },
    onError: (error: any) => {
      console.error("Add liquidity error:", error);
      if (error?.logs) {
        console.error("Transaction logs:", error.logs);
      }
      if (error?.message) {
        alert(`Error: ${error.message}`);
      }
    },
  });
}

// 获取用户钱包中的所有代币
export function useUserTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["userTokens", publicKey?.toString()],
    queryFn: async (): Promise<TokenInfo[]> => {
      if (!publicKey) return [];

      try {
        // 获取本地保存的代币名称
        const savedNames = getAllTokenNames();

        // 获取所有 SPL Token 账户
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        // 也获取 Token-2022 账户
        const token2022Accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_2022_PROGRAM_ID }
        );

        const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

        const tokens: TokenInfo[] = allAccounts
          .map((account) => {
            const parsed = account.account.data.parsed;
            const info = parsed.info;
            const balance = BigInt(info.tokenAmount.amount);
            const mintAddress = info.mint;
            
            // 只返回有余额的代币
            if (balance === BigInt(0)) return null;

            return {
              mint: new PublicKey(mintAddress),
              balance,
              decimals: info.tokenAmount.decimals,
              name: savedNames[mintAddress], // 从本地存储获取名称
            };
          })
          .filter((t): t is TokenInfo => t !== null);

        console.log("Found tokens:", tokens.length);
        return tokens;
      } catch (error) {
        console.error("Error fetching user tokens:", error);
        return [];
      }
    },
    enabled: !!publicKey,
    refetchInterval: 30000, // 每30秒刷新一次
  });
}

// Metaplex Token Metadata Program ID
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// 推导 Mint PDA（基于 creator）
export function getMintPda(creator: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), creator.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// 推导 BondingCurve PDA
export function getBondingCurvePda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// 推导 Metadata PDA
export function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

// Create Token (Meme 币创建，带 Metadata)
export function useCreateToken() {
  const program = useDexProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const transactionToast = useTransactionToast();

  return useMutation({
    mutationFn: async ({
      name,
      symbol,
      uri,
    }: {
      name: string;
      symbol: string;
      uri: string;
    }) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // 推导所有 PDA
      const mintPda = getMintPda(publicKey);
      const bondingCurvePda = getBondingCurvePda(mintPda);
      const metadataPda = getMetadataPda(mintPda);
      
      // 获取 mint_vault (bonding_curve 的 ATA)
      const mintVault = await getAssociatedTokenAddress(
        mintPda, 
        bondingCurvePda, 
        true // allowOwnerOffCurve
      );

      console.log("Creating token with metadata:");
      console.log("  Name:", name);
      console.log("  Symbol:", symbol);
      console.log("  URI:", uri);
      console.log("  Mint PDA:", mintPda.toString());
      console.log("  BondingCurve PDA:", bondingCurvePda.toString());
      console.log("  Metadata PDA:", metadataPda.toString());

      const signature = await program.methods
        .createToken(name, symbol, uri)
        .accounts({
          creator: publicKey,
          mint: mintPda,
          metadata: metadataPda,
          mintVault: mintVault,
          bondingCurve: bondingCurvePda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log("Token created, signature:", signature);
      
      // 保存代币名称到本地存储
      saveTokenName(mintPda.toString(), name);
      
      return { signature, mintAddress: mintPda.toString() };
    },
    onSuccess: (result) => {
      transactionToast(result.signature);
      queryClient.invalidateQueries({ queryKey: ["userTokens"] });
    },
    onError: (error: any) => {
      console.error("Create token error:", error);
      if (error?.logs) {
        console.error("Transaction logs:", error.logs);
      }
    },
  });
}
