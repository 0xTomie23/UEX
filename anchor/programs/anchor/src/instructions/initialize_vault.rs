use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount};

use crate::constants::*;
use crate::state::LiquidityPool;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub user_x_mint: InterfaceAccount<'info, Mint>,
    pub user_y_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [POOL_SEED.as_bytes(), user_x_mint.key().as_ref(), user_y_mint.key().as_ref()],
        bump = pool.bump,
        has_one = user_x_mint,
        has_one = user_y_mint,
    )]
    pub pool: Account<'info, LiquidityPool>,

    #[account(
        init,
        payer = payer,
        seeds = [VAULT_SEED.as_bytes(), pool.key().as_ref(), user_x_mint.key().as_ref()],
        bump,
        token::mint = user_x_mint,
        token::authority = pool,
        token::token_program = token_program,
    )]
    pub x_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [VAULT_SEED.as_bytes(), pool.key().as_ref(), user_y_mint.key().as_ref()],
        bump,
        token::mint = user_y_mint,
        token::authority = pool,
        token::token_program = token_program,
    )]
    pub y_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    msg!("Vault Initialized!");
    msg!("x_vault: {}", ctx.accounts.x_vault.key());
    msg!("y_vault: {}", ctx.accounts.y_vault.key());
    Ok(())
}
