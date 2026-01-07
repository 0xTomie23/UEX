use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LiquidityPool {
    pub user_x_mint: Pubkey,
    pub user_y_mint: Pubkey,
    pub lp_mint: Pubkey,
    pub bump: u8,
}