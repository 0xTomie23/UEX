use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitalizeLendingPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
    init,
    payer = admin,
    space = ANCHOR_DISCRIMINATOR + LendingPool::INIT_SPACE,
    seeds = [b"lending_pool", admin.key().as_ref()],
    bump
  )]
    pub lending_pool: Account<'info, LendingPool>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
      init,
      payer = admin,
      token::mint = mint,
      token::authority = lending_pool,//池子pda控制金库
      seeds = [b"vault", mint.key().as_ref()],
      bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn init_pool(ctx: Context<InitalizeLendingPool>, ltv: u64) -> Result<()> {
    let pool = &mut ctx.accounts.lending_pool;
    pool.authority = ctx.accounts.admin.key();
    pool.mint = ctx.accounts.mint.key();
    pool.vault = ctx.accounts.vault.key();
    pool.total_deposit = 0;
    pool.total_borrow = 0;
    pool.ltv = ltv;
    pool.bump = ctx.bumps.lending_pool;

    msg!("lending pool initialized for mint:{}", pool.mint);
    Ok(())
}
