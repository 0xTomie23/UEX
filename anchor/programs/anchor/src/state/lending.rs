use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LendingPool {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub total_deposit: u64,
    pub total_borrow: u64,
    pub ltv: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub owner: Pubkey,
    pub deposit_amount: u64,
    pub borrow_amount: u64,
    pub bump: u8,
}
