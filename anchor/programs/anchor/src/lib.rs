use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("CMmmm4HjjqMTuPafBuRxMxgA3Z8cfSPMsE3cxNUU4P13");

#[program]
pub mod dex {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        instructions::initialize_pool(ctx)
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault(ctx)
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_x: u64, amount_y: u64) -> Result<()> {
        instructions::add_liquidity(ctx, amount_x, amount_y)
    }

    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::create_token(ctx, name, symbol, uri)
    }
}
