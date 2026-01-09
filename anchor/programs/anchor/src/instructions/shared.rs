use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
    mint_to, MintTo,
};

// 1. 普通转账函数 (用户 -> Vault)
// 适用于 Add Liquidity 和 Swap (User Input)
pub fn transfer_tokens<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: &u64,
    mint: &InterfaceAccount<'info, Mint>,
    authority: &Signer<'info>, // 必须是 Signer，因为是用户操作
    token_program: &Interface<'info, TokenInterface>,
) -> Result<()> {
    let transfer_accounts_options = TransferChecked {
        from: from.to_account_info(),
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_context = CpiContext::new(
        token_program.to_account_info(), 
        transfer_accounts_options
    );

    transfer_checked(cpi_context, *amount, mint.decimals)
}

// 2. PDA 签名转账函数 (Vault -> 用户)
// 适用于 Remove Liquidity 和 Swap (Vault Output)
pub fn transfer_tokens_with_signer<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: &u64,
    mint: &InterfaceAccount<'info, Mint>,
    authority: &AccountInfo<'info>, // 注意：这里 Authority 是 Pool PDA (AccountInfo)，不是 Signer
    token_program: &Interface<'info, TokenInterface>,
    signer_seeds: &[&[&[u8]]], // 关键：需要 PDA 种子
) -> Result<()> {
    let transfer_accounts_options = TransferChecked {
        from: from.to_account_info(),
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts_options,
        signer_seeds, // 传入种子进行签名
    );

    transfer_checked(cpi_context, *amount, mint.decimals)
}

pub fn mint_tokens<'info>(
    mint: &InterfaceAccount<'info, Mint>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: &u64,
    authority: &AccountInfo<'info>,
    token_program: &Interface<'info, TokenInterface>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    mint_to(cpi_context, *amount)
}