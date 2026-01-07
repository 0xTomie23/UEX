use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, MintTo},
};

use crate::state::LiquidityPool;
use crate::constants::{POOL_SEED, LP_TOKEN_SEED, VAULT_SEED};
use crate::instructions::shared::transfer_tokens;

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED.as_bytes(), user_x_mint.key().as_ref(), user_y_mint.key().as_ref()],
        bump = pool.bump,
        has_one = user_x_mint,
        has_one = user_y_mint,
        has_one = lp_mint,
    )]
    pub pool: Account<'info, LiquidityPool>,

    pub user_x_mint: InterfaceAccount<'info, Mint>,
    pub user_y_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [LP_TOKEN_SEED.as_bytes(), pool.key().as_ref()],
        bump,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    /// Pool 的 X Token Vault (PDA)
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), pool.key().as_ref(), user_x_mint.key().as_ref()],
        bump,
        token::mint = user_x_mint,
        token::authority = pool,
    )]
    pub x_vault: InterfaceAccount<'info, TokenAccount>,

    /// Pool 的 Y Token Vault (PDA)
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), pool.key().as_ref(), user_y_mint.key().as_ref()],
        bump,
        token::mint = user_y_mint,
        token::authority = pool,
    )]
    pub y_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = user_x_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account_x: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = user_y_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account_y: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = lp_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
    )]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_x: u64,
    amount_y: u64,
) -> Result<()> {
    // --- 第一步：转账 Token X (使用 shared.rs) ---
    transfer_tokens(
        &ctx.accounts.user_token_account_x,
        &ctx.accounts.x_vault,
        &amount_x,
        &ctx.accounts.user_x_mint,
        &ctx.accounts.payer,
        &ctx.accounts.token_program,
    )?;

    // --- 第二步：转账 Token Y (使用 shared.rs) ---
    transfer_tokens(
        &ctx.accounts.user_token_account_y,
        &ctx.accounts.y_vault,
        &amount_y,
        &ctx.accounts.user_y_mint,
        &ctx.accounts.payer,
        &ctx.accounts.token_program,
    )?;

    // --- 第三步：铸造 LP Token (使用 token_interface) ---
    // 简单的 LP 计算逻辑：lp = x + y (实际项目中请使用 sqrt(x*y))
    let amount_lp = amount_x.checked_add(amount_y).unwrap();

    // 准备 PDA 签名种子
    let seeds = &[
        POOL_SEED.as_bytes(),
        ctx.accounts.user_x_mint.to_account_info().key.as_ref(),
        ctx.accounts.user_y_mint.to_account_info().key.as_ref(),
        &[ctx.accounts.pool.bump],
    ];
    let signer = &[&seeds[..]];

    // 构建 MintTo 上下文
    let cpi_accounts = MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_token_account.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );

    // 调用 Interface 的 mint_to
    token_interface::mint_to(cpi_ctx, amount_lp)?;

    msg!("Liquidity Added! Minted {} LP Tokens", amount_lp);
    Ok(())
}
