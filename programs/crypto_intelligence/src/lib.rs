use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod crypto_intelligence {
    use super::*;

    pub fn create_investigation(
        ctx: Context<CreateInvestigation>,
        investigation_id: u64,
        suspect_wallet: Pubkey,
        analysis_hash: [u8; 32],
    ) -> Result<()> {
        let record = &mut ctx.accounts.investigation;
        record.investigator = ctx.accounts.investigator.key();
        record.investigation_id = investigation_id;
        record.suspect_wallet = suspect_wallet;
        record.analysis_hash = analysis_hash;
        record.created_at = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.investigation;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(investigation_id: u64)]
pub struct CreateInvestigation<'info> {
    #[account(
        init,
        payer = investigator,
        space = 8 + Investigation::LEN,
        seeds = [b"investigation", investigator.key().as_ref(), &investigation_id.to_le_bytes()],
        bump
    )]
    pub investigation: Account<'info, Investigation>,
    #[account(mut)]
    pub investigator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Investigation {
    pub investigator: Pubkey,
    pub investigation_id: u64,
    pub suspect_wallet: Pubkey,
    pub analysis_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}

impl Investigation {
    pub const LEN: usize = 32 + 8 + 32 + 32 + 8 + 1;
}
