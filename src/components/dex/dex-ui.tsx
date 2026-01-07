"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  usePoolInfo,
  useTokenBalance,
  useInitializePoolAndVault,
  useAddLiquidity,
  useUserTokens,
  TokenInfo,
  PROGRAM_ID,
} from "./dex-data-access";
import { Droplets, Plus, Settings, Loader2, Wallet, Coins, Sparkles, ChevronDown, RefreshCw } from "lucide-react";
import { CreateToken } from "../CreateToken";

// 格式化代币数量
function formatAmount(amount: bigint, decimals = 6): string {
  const num = Number(amount) / Math.pow(10, decimals);
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// 解析输入为 bigint
function parseAmount(input: string, decimals = 6): bigint {
  const num = parseFloat(input) || 0;
  return BigInt(Math.floor(num * Math.pow(10, decimals)));
}

// 缩短地址显示
function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// 统计卡片组件
function StatCard({ label, value, icon: Icon, delay }: { label: string; value: string; icon: any; delay: string }) {
  return (
    <div 
      className="flex flex-col items-center p-6 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-400/50 animate-fade-in-up"
      style={{ animationDelay: delay }}
    >
      <Icon className="w-8 h-8 text-amber-500 mb-3" />
      <p className="text-2xl font-serif text-stone-900 mb-1">{value}</p>
      <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

// 代币选择器组件
function TokenSelector({
  label,
  tokens,
  selectedMint,
  onSelect,
  excludeMint,
  isLoading,
  onRefresh,
}: {
  label: string;
  tokens: TokenInfo[];
  selectedMint: PublicKey | null;
  onSelect: (mint: PublicKey | null) => void;
  excludeMint?: PublicKey | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 过滤掉已选择的代币
  const availableTokens = tokens.filter(
    (t) => !excludeMint || !t.mint.equals(excludeMint)
  );

  const selectedToken = tokens.find(
    (t) => selectedMint && t.mint.equals(selectedMint)
  );

  return (
    <div className="relative">
      <label className="text-xs text-stone-500 mb-2 block font-bold uppercase tracking-wider">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-left hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
      >
        {selectedToken ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">
              {selectedToken.name ? selectedToken.name.slice(0, 2).toUpperCase() : <Coins className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-stone-900 font-medium text-sm">
                {selectedToken.name || shortenAddress(selectedToken.mint.toString(), 6)}
              </p>
              <p className="text-stone-500 text-xs">
                {selectedToken.name && <span className="font-mono mr-2">{shortenAddress(selectedToken.mint.toString(), 4)}</span>}
                Balance: {formatAmount(selectedToken.balance, selectedToken.decimals)}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-stone-400">Select a token</span>
        )}
        <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-xl max-h-48 overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-bold uppercase">Your Tokens</span>
              {onRefresh && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  className="p-1 hover:bg-stone-100 rounded transition-colors"
                  title="Refresh token list"
                >
                  <RefreshCw className={`w-4 h-4 text-stone-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading tokens...
              </div>
            ) : availableTokens.length === 0 ? (
              <div className="p-4 text-center text-stone-500 text-sm">
                No tokens found in your wallet.
                <br />
                <span className="text-xs">Use the Faucet to create test tokens.</span>
              </div>
            ) : (
              <div className="py-1">
                {availableTokens.map((token) => (
                  <button
                    key={token.mint.toString()}
                    onClick={() => {
                      onSelect(token.mint);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-xs">
                      {token.name ? token.name.slice(0, 2).toUpperCase() : <Coins className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-900 font-medium text-sm truncate">
                        {token.name || shortenAddress(token.mint.toString(), 6)}
                      </p>
                      <p className="text-stone-500 text-xs">
                        {token.name && <span className="font-mono">{shortenAddress(token.mint.toString(), 4)} · </span>}
                        {formatAmount(token.balance, token.decimals)} tokens
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Clear selection */}
            {selectedMint && (
              <div className="border-t border-stone-100">
                <button
                  onClick={() => {
                    onSelect(null);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Token Input 组件（带选择器）
function TokenInputWithSelector({
  label,
  value,
  onChange,
  tokens,
  selectedMint,
  onSelectMint,
  excludeMint,
  disabled,
  isLoadingTokens,
  onRefreshTokens,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tokens: TokenInfo[];
  selectedMint: PublicKey | null;
  onSelectMint: (mint: PublicKey | null) => void;
  excludeMint?: PublicKey | null;
  disabled?: boolean;
  isLoadingTokens?: boolean;
  onRefreshTokens?: () => void;
}) {
  const selectedToken = tokens.find(
    (t) => selectedMint && t.mint.equals(selectedMint)
  );

  return (
    <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-400/30">
      <div className="flex justify-between text-sm text-stone-500 mb-3">
        <span className="font-medium">{label}</span>
        {selectedToken && (
          <button
            onClick={() => onChange(formatAmount(selectedToken.balance, selectedToken.decimals))}
            className="hover:text-amber-600 transition-colors text-xs uppercase tracking-wider"
          >
            Balance: <span className="font-mono">{formatAmount(selectedToken.balance, selectedToken.decimals)}</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          disabled={disabled || !selectedMint}
          className="flex-1 bg-transparent text-3xl font-serif text-stone-900 outline-none placeholder:text-stone-300 disabled:opacity-50 min-w-0"
        />
        <div className="relative shrink-0">
          <TokenSelectorButton
            tokens={tokens}
            selectedMint={selectedMint}
            onSelect={onSelectMint}
            excludeMint={excludeMint}
            isLoading={isLoadingTokens}
            onRefresh={onRefreshTokens}
          />
        </div>
      </div>
    </div>
  );
}

// 小型代币选择按钮
function TokenSelectorButton({
  tokens,
  selectedMint,
  onSelect,
  excludeMint,
  isLoading,
  onRefresh,
}: {
  tokens: TokenInfo[];
  selectedMint: PublicKey | null;
  onSelect: (mint: PublicKey | null) => void;
  excludeMint?: PublicKey | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const availableTokens = tokens.filter(
    (t) => !excludeMint || !t.mint.equals(excludeMint)
  );

  const selectedToken = tokens.find(
    (t) => selectedMint && t.mint.equals(selectedMint)
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all"
      >
        {selectedToken ? (
          <>
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-[10px]">
              {selectedToken.name ? selectedToken.name.slice(0, 2).toUpperCase() : <Coins className="w-3 h-3" />}
            </div>
            <span className="text-stone-700 font-medium text-sm">
              {selectedToken.name || shortenAddress(selectedToken.mint.toString(), 3)}
            </span>
          </>
        ) : (
          <span className="text-stone-500 text-sm">Select</span>
        )}
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 w-64 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl max-h-48 overflow-auto">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-bold uppercase">Select Token</span>
              {onRefresh && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  className="p-1 hover:bg-stone-100 rounded"
                >
                  <RefreshCw className={`w-3 h-3 text-stone-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-stone-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                Loading...
              </div>
            ) : availableTokens.length === 0 ? (
              <div className="p-3 text-center text-stone-500 text-xs">
                No tokens available
              </div>
            ) : (
              <div className="py-1">
                {availableTokens.map((token) => (
                  <button
                    key={token.mint.toString()}
                    onClick={() => {
                      onSelect(token.mint);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-[10px]">
                      {token.name ? token.name.slice(0, 2).toUpperCase() : <Coins className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-900 text-xs truncate">
                        {token.name || shortenAddress(token.mint.toString(), 4)}
                      </p>
                      <p className="text-stone-400 text-xs">
                        {token.name && <span className="font-mono">{shortenAddress(token.mint.toString(), 3)} · </span>}
                        {formatAmount(token.balance, token.decimals)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// 主 DEX 组件
export function DexFeature() {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<"liquidity" | "admin" | "faucet">("liquidity");
  const [mintX, setMintX] = useState<PublicKey | null>(null);
  const [mintY, setMintY] = useState<PublicKey | null>(null);
  const [amountX, setAmountX] = useState("");
  const [amountY, setAmountY] = useState("");

  // Hooks
  const userTokens = useUserTokens();
  const poolInfo = usePoolInfo(mintX, mintY);
  const balanceX = useTokenBalance(mintX);
  const balanceY = useTokenBalance(mintY);
  
  const initPoolAndVault = useInitializePoolAndVault();
  const addLiquidity = useAddLiquidity();

  const isLoading = initPoolAndVault.isPending || addLiquidity.isPending;
  const tokens = userTokens.data || [];

  // 处理添加流动性
  const handleAddLiquidity = async () => {
    if (!mintX || !mintY || !amountX || !amountY) return;
    
    await addLiquidity.mutateAsync({
      mintX,
      mintY,
      amountX: parseAmount(amountX),
      amountY: parseAmount(amountY),
    });
    
    setAmountX("");
    setAmountY("");
  };

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-stone-800 selection:bg-amber-500 selection:text-white py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-2">Yang DEX</h1>
          <p className="text-stone-500 text-sm">
            Solana Devnet • AMM Protocol
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-amber-600 hover:text-amber-700 underline"
            >
              View Contract ↗
            </a>
          </p>
        </div>

        {/* 主内容区域 - 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* 左侧：Pool 状态卡片 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold tracking-widest text-stone-500 uppercase mb-4">Pool Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600 text-sm">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    poolInfo.data?.exists 
                      ? "bg-green-100 text-green-700" 
                      : "bg-stone-100 text-stone-500"
                  }`}>
                    {poolInfo.data?.exists ? "Active" : "Not Created"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600 text-sm">Vault X</span>
                  <span className="text-stone-900 font-mono text-sm">
                    {poolInfo.data?.exists ? formatAmount(poolInfo.data.xVaultBalance || BigInt(0)) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600 text-sm">Vault Y</span>
                  <span className="text-stone-900 font-mono text-sm">
                    {poolInfo.data?.exists ? formatAmount(poolInfo.data.yVaultBalance || BigInt(0)) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* 你的代币 */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold tracking-widest text-stone-500 uppercase">Your Tokens</h3>
                <button
                  onClick={() => userTokens.refetch()}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  {userTokens.isLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
              {tokens.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-4">
                  No tokens found.<br/>
                  <span className="text-xs">Use Faucet to create test tokens.</span>
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {tokens.map((token) => (
                    <div key={token.mint.toString()} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">
                          {token.name ? token.name.slice(0, 2).toUpperCase() : "?"}
                        </div>
                        <span className="text-stone-700 text-sm">
                          {token.name || shortenAddress(token.mint.toString(), 4)}
                        </span>
                      </div>
                      <span className="text-stone-900 font-mono text-sm">
                        {formatAmount(token.balance, token.decimals)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：主交易卡片 */}
          <div className="lg:col-span-2">
            {/* Main Card */}
            <div className="rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden max-w-xl mx-auto">
              
              {/* Tab 切换 */}
              <div className="flex border-b border-stone-200">
                <button
                  onClick={() => setActiveTab("liquidity")}
                  className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "liquidity"
                      ? "text-amber-600 bg-amber-50 border-b-2 border-amber-500"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                  Liquidity
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "admin"
                      ? "text-amber-600 bg-amber-50 border-b-2 border-amber-500"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Pool
                </button>
                <button
                  onClick={() => setActiveTab("faucet")}
                  className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "faucet"
                      ? "text-amber-600 bg-amber-50 border-b-2 border-amber-500"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Faucet
                </button>
              </div>

              <div className="p-6 md:p-8">
                {activeTab === "faucet" ? (
                  /* Faucet 面板 - 不需要 Mint 输入 */
                  <CreateToken />
                ) : (
                  <>
                    {/* 代币选择器 */}
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <TokenSelector
                        label="Token X"
                        tokens={tokens}
                        selectedMint={mintX}
                        onSelect={setMintX}
                        excludeMint={mintY}
                        isLoading={userTokens.isLoading}
                        onRefresh={() => userTokens.refetch()}
                      />
                      <TokenSelector
                        label="Token Y"
                        tokens={tokens}
                        selectedMint={mintY}
                        onSelect={setMintY}
                        excludeMint={mintX}
                        isLoading={userTokens.isLoading}
                        onRefresh={() => userTokens.refetch()}
                      />
                    </div>

                    {/* Pool 状态 */}
                    {mintX && mintY && (
                      <div className="mb-6 p-4 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 text-sm font-medium">Pool Status</span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              poolInfo.data?.exists
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {poolInfo.isLoading
                              ? "Loading..."
                              : poolInfo.data?.exists
                              ? "✓ Active"
                              : "Not Created"}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "liquidity" && (
                  /* 添加流动性 */
                  <div className="space-y-4">
                    <TokenInputWithSelector
                      label="Deposit Token X"
                      value={amountX}
                      onChange={setAmountX}
                      tokens={tokens}
                      selectedMint={mintX}
                      onSelectMint={setMintX}
                      excludeMint={mintY}
                      disabled={isLoading}
                      isLoadingTokens={userTokens.isLoading}
                      onRefreshTokens={() => userTokens.refetch()}
                    />

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="p-3 rounded-full bg-stone-100 border border-stone-200 shadow-sm">
                        <Plus className="w-5 h-5 text-stone-500" />
                      </div>
                    </div>

                    <TokenInputWithSelector
                      label="Deposit Token Y"
                      value={amountY}
                      onChange={setAmountY}
                      tokens={tokens}
                      selectedMint={mintY}
                      onSelectMint={setMintY}
                      excludeMint={mintX}
                      disabled={isLoading}
                      isLoadingTokens={userTokens.isLoading}
                      onRefreshTokens={() => userTokens.refetch()}
                    />

                    <button
                      onClick={handleAddLiquidity}
                      disabled={!publicKey || !mintX || !mintY || !amountX || !amountY || isLoading || !poolInfo.data?.exists}
                      className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-stone-900 hover:bg-stone-800 shadow-lg flex items-center justify-center gap-2 mt-6"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : !publicKey ? (
                        <>
                          <Wallet className="w-5 h-5" />
                          Connect Wallet
                        </>
                      ) : !poolInfo.data?.exists ? (
                        "Pool Not Created"
                      ) : (
                        <>
                          <Droplets className="w-5 h-5" />
                          Add Liquidity
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeTab === "admin" && (
                  /* Admin 面板 */
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-stone-500 text-sm mb-2">
                        Initialize a new liquidity pool for the token pair.
                      </p>
                      <p className="text-stone-400 text-xs">
                        This will create the pool account and token vaults.
                      </p>
                    </div>

                    <button
                      onClick={() => mintX && mintY && initPoolAndVault.mutate({ mintX, mintY })}
                      disabled={!publicKey || !mintX || !mintY || isLoading || poolInfo.data?.exists}
                      className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 ${
                        poolInfo.data?.exists 
                          ? "bg-green-600" 
                          : "bg-amber-500 hover:bg-amber-600"
                      }`}
                    >
                      {initPoolAndVault.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Pool & Vaults...
                        </>
                      ) : poolInfo.data?.exists ? (
                        <>
                          <span className="text-lg">✓</span>
                          Pool Already Exists
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Create Pool
                        </>
                      )}
                    </button>

                    {poolInfo.data?.exists && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-green-700 text-sm font-medium">
                          Pool is ready! Switch to "Liquidity" tab to deposit tokens.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <p className="text-stone-400 text-xs font-mono">
            Program: {PROGRAM_ID.toString().slice(0, 8)}...{PROGRAM_ID.toString().slice(-8)}
          </p>
        </div>
      </div>
    </div>
  );
}
