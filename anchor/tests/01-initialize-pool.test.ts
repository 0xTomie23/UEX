/**
 * 测试 1: Initialize Pool (初始化流动性池)
 * 
 * 这个测试验证：
 * - 池子 PDA 能被正确创建
 * - LP Mint 能被正确初始化
 * - 池子状态数据正确保存
 */

import { assert } from "chai";
import {
  provider,
  program,
  payer,
  createSortedTestMints,
  getPoolPda,
  getLpMintPda,
  TOKEN_PROGRAM_ID,
  SystemProgram,
} from "./helpers/setup";

describe("01 - Initialize Pool (初始化池子)", () => {
  // 测试用变量
  let mintX: typeof import("@solana/web3.js").PublicKey;
  let mintY: typeof import("@solana/web3.js").PublicKey;
  let poolPda: typeof import("@solana/web3.js").PublicKey;
  let lpMintPda: typeof import("@solana/web3.js").PublicKey;

  before(async () => {
    console.log("\n🔧 准备测试环境...");

    // 创建两个测试代币（已排序）
    [mintX, mintY] = await createSortedTestMints();

    console.log("   Mint X:", mintX.toBase58());
    console.log("   Mint Y:", mintY.toBase58());

    // 推导 PDA
    poolPda = getPoolPda(mintX, mintY);
    lpMintPda = getLpMintPda(poolPda);

    console.log("   Pool PDA:", poolPda.toBase58());
    console.log("   LP Mint PDA:", lpMintPda.toBase58());
  });

  it("应该成功创建流动性池", async () => {
    // 调用合约
    const tx = await program.methods
      .initializePool()
      .accounts({
        payer: payer.publicKey,
        userXMint: mintX,
        userYMint: mintY,
        pool: poolPda,
        lpMint: lpMintPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ 交易成功:", tx);

    // 验证池子状态
    const poolAccount = await program.account.liquidityPool.fetch(poolPda);

    assert.ok(poolAccount.userXMint.equals(mintX), "Mint X 不匹配");
    assert.ok(poolAccount.userYMint.equals(mintY), "Mint Y 不匹配");
    assert.ok(poolAccount.lpMint.equals(lpMintPda), "LP Mint 不匹配");

    console.log("   ✅ 池子状态验证通过");
  });

  it("不能重复初始化同一个池子", async () => {
    try {
      await program.methods
        .initializePool()
        .accounts({
          payer: payer.publicKey,
          userXMint: mintX,
          userYMint: mintY,
          pool: poolPda,
          lpMint: lpMintPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 如果没报错，测试失败
      assert.fail("应该抛出错误但没有");
    } catch (error: any) {
      // 预期会报错（账户已存在）
      console.log("   ✅ 正确拒绝了重复初始化");
      assert.ok(error.message.includes("already in use") || error.logs, "错误类型不对");
    }
  });
});
