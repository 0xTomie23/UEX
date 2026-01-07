use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::constants::{ANCHOR_DISCRIMINATOR, POOL_SEED, LP_TOKEN_SEED};
use crate::state::LiquidityPool;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub user_x_mint: InterfaceAccount<'info, Mint>,
    pub user_y_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = ANCHOR_DISCRIMINATOR as usize + LiquidityPool::INIT_SPACE,
        seeds = [POOL_SEED.as_bytes(), user_x_mint.key().as_ref(), user_y_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, LiquidityPool>,

    #[account(
        init,
        payer = payer,
        seeds = [LP_TOKEN_SEED.as_bytes(), pool.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = pool,
        mint::token_program = token_program,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
    // 禁止同名代币
    if ctx.accounts.user_x_mint.key() == ctx.accounts.user_y_mint.key() {
        return Err(ErrorCode::SameMint.into());
    }
    // 确认代币顺序，由前端自动排序
    if ctx.accounts.user_x_mint.key() > ctx.accounts.user_y_mint.key() {
        return Err(ErrorCode::InvalidMintOrder.into());
    }

    let pool = &mut ctx.accounts.pool;
    pool.user_x_mint = ctx.accounts.user_x_mint.key();
    pool.user_y_mint = ctx.accounts.user_y_mint.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.bump = ctx.bumps.pool;

    msg!("Pool Initialized!");
    msg!("user_x_mint: {}", ctx.accounts.user_x_mint.key());
    msg!("user_y_mint: {}", ctx.accounts.user_y_mint.key());
    msg!("lp_mint: {}", ctx.accounts.lp_mint.key());
    msg!("bump: {}", ctx.bumps.pool);

    Ok(())
}
