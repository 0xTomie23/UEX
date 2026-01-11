use crate::constants::ANCHOR_DISCRIMINATOR;
use crate::constants::POOL_SEED;
use crate::instructions::shared::*;
use crate::state::LiquidityPool;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct Swap<'info> {
    pub payer: Signer<'info>,
    pub pool: Account<'info, LiquidityPool>,
    pub user_x_mint: InterfaceAccount<'info, Mint>,
    pub user_y_mint: InterfaceAccount<'info, Mint>,
    pub x_vault: InterfaceAccount<'info, TokenAccount>,
    pub y_vault: InterfaceAccount<'info, TokenAccount>,
    pub user_token_account_x: InterfaceAccount<'info, TokenAccount>,
    pub user_token_account_y: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    amount_out_min: u64,
    is_x_to_y: bool,
) -> Result<()> {
    let accounts = &ctx.accounts;

    //自动判断输入输出方向
    let (mint_in, mint_out, vault_in, vault_out, user_in, user_out) = if is_x_to_y {
        (
            &accounts.user_x_mint,
            &accounts.user_y_mint,
            &accounts.x_vault,
            &accounts.y_vault,
            &accounts.user_token_account_x,
            &accounts.user_token_account_y,
        )
    } else {
        (
            &accounts.user_y_mint,
            &accounts.user_x_mint,
            &accounts.y_vault,
            &accounts.x_vault,
            &accounts.user_token_account_y,
            &accounts.user_token_account_x,
        )
    };

    // 这里需要根据常数乘积公式计算 amount_out
    // 暂时先设置为 amount_in 以便编译通过，实际业务需要实现计算逻辑
    let amount_out = amount_in;

    //转账输入代币到vault
    transfer_tokens(
        user_in,
        vault_in,
        &amount_in,
        mint_in,
        &accounts.payer,
        &accounts.token_program,
    )?;

    //vault转账输出代币到用户
    let mint_x_key = accounts.user_x_mint.key();
    let mint_y_key = accounts.user_y_mint.key();
    let seeds = &[
        POOL_SEED.as_bytes(),
        mint_x_key.as_ref(), // 永远放 X
        mint_y_key.as_ref(), // 永远放 Y
        &[accounts.pool.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    transfer_tokens_with_signer(
        vault_out,
        user_out,
        &amount_out,
        mint_out,
        &accounts.pool.to_account_info(),
        &accounts.token_program,
        signer_seeds,
    )?;
    Ok(())
}
