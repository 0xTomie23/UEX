use anchor_lang::prelude::*;

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


pub fn swap(ctx: Context<Swap>, amount_in:u64, amount_out_min:u64, is_x_to_y:bool) -> Result<()> {
    //自动判断输入输出方向
    let (mint_in, mint_out,
    vault_in, vault_out,
    user_in, user_out) = if is_x_to_y {
        (user_x_mint, user_y_mint, x_vault, y_vault, user_token_account_x, user_token_account_y)
    } else {
        (user_y_mint, user_x_mint, y_vault, x_vault, user_token_account_y, user_token_account_x)
    };

    //转账输入代币到vault
    transfer_tokens(
        user_in,
        vault_in,
        amount_in,
        mint_in,
        &ctx.accounts.payer,
        &ctx.accounts.token_program,
    )
    //vault转账输出代币到用户
    let seeds = &[
                POOL_SEED.as_bytes(),
                ctx.accounts.user_mint_x.key().as_ref(), // 永远放 X
                ctx.accounts.user_mint_y.key().as_ref(), // 永远放 Y
                &[ctx.accounts.pool.bump],
                ];
    transfer_token_with_signer(
        vault_out,
        user_out,
        amount_out,
        mint_out,
        &ctx.accounts.pool.to_account_info(),
        &ctx.accounts.token_program,
        signer = &[&seeds[..]],

    )
    Ok(())
}