"use client";

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader2, Coins, Copy, Check, Sparkles, ImageIcon } from 'lucide-react';
import { useCreateToken, getMintPda } from './dex/dex-data-access';

export const CreateToken = () => {
    const { publicKey } = useWallet();
    const createToken = useCreateToken();

    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenUri, setTokenUri] = useState("");
    const [mintAddress, setMintAddress] = useState("");
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

        if (!tokenName.trim()) {
            alert("请输入代币名称！");
            return;
        }

        if (!tokenSymbol.trim()) {
            alert("请输入代币符号！");
            return;
        }

        try {
            const result = await createToken.mutateAsync({
                name: tokenName.trim(),
                symbol: tokenSymbol.trim(),
                uri: tokenUri.trim() || "",
            });

            setMintAddress(result.mintAddress);
            setTokenName("");
            setTokenSymbol("");
            setTokenUri("");
        } catch (error) {
            console.error("❌ Token creation failed", error);
            alert(`Token creation failed: ${error}`);
        }
    };

    // 预测 Mint 地址
    const predictedMint = publicKey ? getMintPda(publicKey).toString() : "";

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-3">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-stone-800">Create Meme Token</h3>
                <p className="text-sm text-stone-500 mt-1">
                    Launch your token with on-chain metadata
                </p>
            </div>

            {/* Token Name */}
            <div>
                <label className="text-xs text-stone-500 mb-2 block font-bold uppercase tracking-wider">
                    Token Name *
                </label>
                <input
                    type="text"
                    placeholder="e.g., Doge Moon Coin"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-700 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    maxLength={32}
                />
                <p className="text-xs text-stone-400 mt-1">{tokenName.length}/32 characters</p>
            </div>

            {/* Token Symbol */}
            <div>
                <label className="text-xs text-stone-500 mb-2 block font-bold uppercase tracking-wider">
                    Token Symbol *
                </label>
                <input
                    type="text"
                    placeholder="e.g., DOGE"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-700 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all uppercase"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                    maxLength={10}
                />
                <p className="text-xs text-stone-400 mt-1">{tokenSymbol.length}/10 characters</p>
            </div>

            {/* Token URI (Optional) */}
            <div>
                <label className="text-xs text-stone-500 mb-2 block font-bold uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" />
                    Metadata URI (Optional)
                </label>
                <input
                    type="url"
                    placeholder="https://example.com/metadata.json"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-700 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                    value={tokenUri}
                    onChange={(e) => setTokenUri(e.target.value)}
                />
                <p className="text-xs text-stone-400 mt-1">
                    JSON with name, symbol, description & image
                </p>
            </div>

            {/* Predicted Address Preview */}
            {publicKey && (
                <div className="p-3 bg-stone-100 rounded-lg border border-stone-200">
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">
                        Predicted Mint Address
                    </p>
                    <code className="text-xs text-stone-600 font-mono break-all">
                        {predictedMint.slice(0, 20)}...{predictedMint.slice(-20)}
                    </code>
                </div>
            )}

            {/* Create Button */}
            <button
                onClick={handleCreateToken}
                disabled={createToken.isPending || !publicKey || !tokenName.trim() || !tokenSymbol.trim()}
                className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
                {createToken.isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating Token...
                    </>
                ) : (
                    <>
                        <Coins className="w-5 h-5" />
                        Create Meme Token
                    </>
                )}
            </button>

            {/* Info Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-700 text-xs">
                    <strong>💡 What happens:</strong><br />
                    • 1 Billion tokens will be minted<br />
                    • Tokens go into a Bonding Curve vault<br />
                    • Users can buy/sell through the curve
                </p>
            </div>

            {/* Success Message */}
            {mintAddress && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
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
                    <div className="mt-3 flex gap-2">
                        <a
                            href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:text-green-700 underline"
                        >
                            View on Explorer ↗
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
