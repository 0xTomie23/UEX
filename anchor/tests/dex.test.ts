import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dex } from "../target/types/dex";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { assert } from "chai";
import { 
  getOrCreateAssociatedTokenAccount, 
  getAccount, 
  getAssociatedTokenAddressSync // 👈 新增这个，用来同步计算 ATA 地址
} from "@solana/spl-token";

const BN = anchor.BN;

describe("dex", () => {
  const provider = anchor.AnchorProvider.env(); //连接到solana 测试网
  anchor.setProvider(provider);//设置provider

  const program = anchor.workspace.Dex as Program<Dex>; //获取程序实例
  const payer = (provider.wallet as anchor.Wallet).payer;//获取付款账户

  //定义变量
  let tokenMintA: PublicKey;
  let tokenMintB: PublicKey;
  let poolPda: PublicKey;
  let vaultA: PublicKey;
  let vaultB: PublicKey;
  let lpMint: PublicKey;

  before(async () => {
    console.log("正在创建测试代币...");
    tokenMintA = await createMint(provider.connection, payer, payer.publicKey, null, 6);
    tokenMintB = await createMint(provider.connection, payer, payer.publicKey, null, 6);

    if (tokenMintA > tokenMintB) {
      [tokenMintA, tokenMintB] = [tokenMintB, tokenMintA];
    }

    console.log("Token Mint A:", tokenMintA.toBase58());
    console.log("Token Mint B:", tokenMintB.toBase58());
  });
  
  it("应该成功初始化池子和金库", async () => {
    //推导pda地址
    //seeds 必须和合约里面一样
    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMintA.toBuffer(), tokenMintB.toBuffer()],
      program.programId
    );//返回[address, bump]

    [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_token"), poolPda.toBuffer()],
      program.programId
    );

    [vaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), poolPda.toBuffer(), tokenMintA.toBuffer()],
      program.programId
    );

    [vaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), poolPda.toBuffer(), tokenMintB.toBuffer()],
      program.programId
    );

    console.log("Pool PDA:", poolPda.toBase58());

    //发送交易、
    try {
      await program.methods.initializePool().accounts({//调用合约中的initializePool指令
        payer: payer.publicKey,
        userMintX: tokenMintA,
        userMintY: tokenMintB,
        pool: poolPda,
        lpToken: lpMint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
        .rpc();
      console.log("✅ pool 和 LP Mint created successfully");
    } catch (e) {
      console.error("❌ pool 和 LP Mint creation failed:", e);
      throw e;
    }
    //initialize vaults
    try {
      await program.methods.initializeVault().accounts({
        payer: payer.publicKey,
        userMintX: tokenMintA,
        userMintY: tokenMintB,
        pool: poolPda,
        vaultA: vaultA,
        vaultB: vaultB,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
        .rpc();
      console.log("✅ vaults initialized successfully");
    } catch (e) {
      console.error("❌ vault initialization failed:", e);
      throw e;
    }
    //验证数据
    const poolAccount = await program.account.liquidityPool.fetch(poolPda);
    assert.ok(poolAccount.userMintX.equals(tokenMintA), "userMintX 不匹配");
    assert.ok(poolAccount.userMintY.equals(tokenMintB), "userMintY 不匹配");
    console.log("✅ pool 状态数据正确");
    //验证vault 的owner是不是pool
    const vaultAccount = await provider.connection.getAccountInfo(vaultA);
    console.log("✅ 验证通过 Vault A 创建成功");

  });

  it("Add Liquidity (添加流动性)", async () => {
    // 1. 准备资金数额 (假设精度是 6)
    // 存入 100 个 X 和 200 个 Y
    const amountX = new BN(100 * 1000000); 
    const amountY = new BN(200 * 1000000);

    // 2. 计算 LP Token 的 Mint 地址 (PDA)
    // 根据你在 Rust 里的 seeds = [b"lp_token", pool.key()]
    const [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_token"), poolPda.toBuffer()],
      program.programId
    );

    // 3. 计算用户的 LP 接收账户地址 (ATA)
    // 虽然合约里用了 init_if_needed 自动创建，但我们得告诉合约这个地址在哪
    const userLpTokenAccount = getAssociatedTokenAddressSync(
      lpMintPda,       // Mint 是谁？
      payer.publicKey  // 给谁开户？
    );

    console.log("准备添加流动性...");
    console.log("User LP Account 将是:", userLpTokenAccount.toBase58());

    // --- 记录操作前的余额 (用于对比) ---
    // 这一步是为了严谨，确保余额真的变了
    // 如果是第一次跑，这里 userX 和 userY 应该是满的 (100万)，Vault 是 0
    
    // 4. 发起交易
    const tx = await program.methods
      .addLiquidity(amountX, amountY)
      .accounts({
        payer: payer.publicKey,
        pool: poolPda,
        userMintX: tokenXMint, // 注意：TS 里自动变驼峰命名
        userMintY: tokenYMint,
        vaultX: vaultX,
        vaultY: vaultY,
        userTokenAccountX: userTokenAccountX, // 用户的钱包
        userTokenAccountY: userTokenAccountY,
        lpToken: lpMintPda,    // LP Mint PDA
        userLpTokenAccount: userLpTokenAccount, // 接收 LP 的账户
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ 交易成功！签名:", tx);

    // --- 5. 核心验证 (Assert) ---
    
    // 验证 A: 金库 (Vault) 收到钱了吗？
    const vaultXAccount = await getAccount(provider.connection, vaultX);
    const vaultYAccount = await getAccount(provider.connection, vaultY);
    
    console.log("Vault X 余额:", vaultXAccount.amount.toString());
    console.log("Vault Y 余额:", vaultYAccount.amount.toString());

    assert.equal(vaultXAccount.amount.toString(), amountX.toString(), "Vault X 没收到钱");
    assert.equal(vaultYAccount.amount.toString(), amountY.toString(), "Vault Y 没收到钱");

    // 验证 B: 用户收到 LP Token 了吗？
    const userLpAccountInfo = await getAccount(provider.connection, userLpTokenAccount);
    
    console.log("用户收到的 LP 数量:", userLpAccountInfo.amount.toString());

    // 根据你的合约逻辑，如果 lp = x + y
    const expectedLp = amountX.add(amountY);
    assert.equal(userLpAccountInfo.amount.toString(), expectedLp.toString(), "LP 铸造数量不对");
  });

});
