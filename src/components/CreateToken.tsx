"use client";

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
    Keypair, 
    SystemProgram, 
    Transaction,
} from '@solana/web3.js';
import { 
    MINT_SIZE, 
    TOKEN_PROGRAM_ID, 
    createInitializeMintInstruction, 
    createAssociatedTokenAccountInstruction, 
    getAssociatedTokenAddress, 
    createMintToInstruction 
} from '@solana/spl-token';
import { Loader2, Coins, Copy, Check } from 'lucide-react';
import { saveTokenName } from './dex/dex-data-access';

export const CreateToken = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const queryClient = useQueryClient();

    const [tokenName, setTokenName] = useState("");
    const [amount, setAmount] = useState("");
    const [mintAddress, setMintAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(mintAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCreateToken = async () => {
        if (!publicKey) {
            alert("请先连接钱包！");
            return;
        }
        
        if (!amount || Number(amount) <= 0) {
            alert("请输入有效的数量！");
            return;
        }

        setIsLoading(true);
        try {
            const mintKeypair = Keypair.generate();
            const mintPublicKey = mintKeypair.publicKey;

            const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

            const userATA = await getAssociatedTokenAddress(mintPublicKey, publicKey);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mintPublicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(
                    mintPublicKey,
                    6, // decimals
                    publicKey, // mint authority
                    publicKey, // freeze authority
                ),
                createAssociatedTokenAccountInstruction(
                    publicKey, // payer
                    userATA, // ata
                    publicKey, // owner
                    mintPublicKey, // mint
                ),
                createMintToInstruction(
                    mintPublicKey, // mint
                    userATA, // destination
                    publicKey, // authority
                    BigInt(Number(amount) * 10 ** 6), // amount with 6 decimals
                ),
            );

            const signature = await sendTransaction(transaction, connection, { 
                signers: [mintKeypair] 
            });
            await connection.confirmTransaction(signature, 'confirmed');
            
            console.log("✅ Token created successfully");
            const mintAddressStr = mintPublicKey.toBase58();
            setMintAddress(mintAddressStr);
            
            // 保存代币名称到本地存储
            if (tokenName.trim()) {
                saveTokenName(mintAddressStr, tokenName.trim());
            }
            
            setTokenName("");
            setAmount("");
            
            // 刷新代币列表
            queryClient.invalidateQueries({ queryKey: ["userTokens"] });
        } catch (error) {
            console.error("❌ Token creation failed", error);
            alert(`Token creation failed: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
                <div>
                    <label className="text-xs text-stone-500 mb-2 block font-bold uppercase tracking-wider">
                        Token Name (Optional)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., Mock USDC"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-700 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                    />
                </div>
                
                <div>
                    <label className="text-xs text-stone-500 mb-2 block font-bold uppercase tracking-wider">
                        Amount to Mint
                    </label>
                    <input
                        type="number"
                        placeholder="e.g., 1000"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-700 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                
                <button
                    onClick={handleCreateToken}
                    disabled={isLoading || !publicKey || !amount}
                    className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-600 shadow-md flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Minting...
                        </>
                    ) : (
                        <>
                            <Coins className="w-5 h-5" />
                            Create Token
                        </>
                    )}
                </button>

                {mintAddress && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-sm font-medium mb-2 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Token Created Successfully!
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white p-2 rounded border border-green-200 text-stone-700 font-mono break-all">
                                {mintAddress}
                            </code>
                            <button
                                onClick={handleCopy}
                                className="p-2 rounded-lg bg-white border border-green-200 hover:bg-green-100 transition-colors"
                                title="Copy address"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-stone-500" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                            Copy this address to use in the DEX pool
                        </p>
                    </div>
                )}
        </div>
    );
};
