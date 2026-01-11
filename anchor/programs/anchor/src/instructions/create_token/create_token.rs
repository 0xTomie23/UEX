use crate::constants::ANCHOR_DISCRIMINATOR;
use crate::instructions::shared::*;
use crate::state::BondingCurve;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
    Metadata,
};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
      init,
      payer = creator,
      mint::decimals = 6,
      mint::authority =bonding_curve,
      seeds = [b"mint", creator.key().as_ref()],
      bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: This account is managed by the Metaplex program and initialized via CPI
    #[account(
      mut,
      seeds = [b"metadata",
      token_metadata_program.key().as_ref(),
      mint.key().as_ref()],
      seeds::program = token_metadata_program.key(),
      bump
    )]
    pub metadata: UncheckedAccount<'info>,
    #[account(
      init,
      payer = creator,
      associated_token::mint = mint,
      associated_token::authority = bonding_curve,
    )]
    pub mint_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
    init,
    payer = creator,
    space = ANCHOR_DISCRIMINATOR + BondingCurve::INIT_SPACE,
    seeds = [b"bonding_curve", mint.key().as_ref()],
    bump
  )]
    pub bonding_curve: Account<'info, BondingCurve>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token(
    ctx: Context<CreateToken>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    let total_supply = 1_000_000_000_u64.checked_mul(10u64.pow(6)).unwrap();

    let bonding_curve = &mut *ctx.accounts.bonding_curve;
    bonding_curve.creator = ctx.accounts.creator.key();
    bonding_curve.mint = ctx.accounts.mint.key();
    bonding_curve.virtual_sol_reserves = 30 * 1_000_000_000;
    bonding_curve.virtual_token_reserves = total_supply;
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.real_token_reserves = total_supply;
    bonding_curve.token_total_supply = total_supply;

    let mint_key = ctx.accounts.mint.key();
    let seeds = &[
        b"bonding_curve",
        mint_key.as_ref(),
        &[ctx.bumps.bonding_curve],
    ];
    let signer_seeds = &[&seeds[..]];

    let token_data = DataV2 {
        name,
        symbol,
        uri: uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };
    let metadata_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.bonding_curve.to_account_info(),
            payer: ctx.accounts.creator.to_account_info(),
            update_authority: ctx.accounts.bonding_curve.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        signer_seeds,
    );
    create_metadata_accounts_v3(metadata_ctx, token_data, false, true, None)?;

    mint_tokens(
        &ctx.accounts.mint,
        &ctx.accounts.mint_vault,
        &total_supply,
        &ctx.accounts.bonding_curve.to_account_info(),
        &ctx.accounts.token_program,
        signer_seeds,
    )?;
    msg!("Token Created: {}", mint_key);
    Ok(())
}
