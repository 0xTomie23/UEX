use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Mint X and Mint Y cannot be the same")]
    SameMint,
    #[msg("Invalid mint order")]
    InvalidMintOrder,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
}
