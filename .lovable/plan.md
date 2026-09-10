# Guild membership: receipts, approval gating, and monthly plans

## What happened with your 250 credits

It did work, but only halfway:

- 250 credits were taken from your balance and recorded (10 Sep, "Guild membership fee").
- You were recorded as a paying member of the guild until 10 Oct.
- The 250 credits went **nowhere** — no guild account received them, and there is no receipt shown anywhere in the interface.
- Paying did **not** add you to the guild's member list, and it did not require any application or approval.

So the money moved out of your pocket silently. That is the main thing to fix.

## What will change

### 1. The fee actually lands somewhere, and leaves a trace
- The guild gets a credits balance; membership fees are paid into it.
- Every payment is recorded on both sides: your wallet history and the guild's ledger.
- A "Membership" receipt list appears for you (in your wallet/economy area) and for guild admins.
- Guild admins are notified when someone pays.

### 2. Application first, then payment
- If the guild requires an application, the flow becomes: fill the form → admin approves → you are invited to pay → you become a member.
- No credits are ever taken before approval.
- If the guild is open, payment happens immediately as today.
- If admins reject an application, nothing is charged.

### 3. Paying makes you a real member
- A successful payment adds you to the guild's member list (and follows the guild), instead of only the hidden paid-membership record.
- Expired membership drops you back to guest status rather than silently keeping full rights.

### 4. Whoever creates a guild is a member by default
- The creator is recorded as an active member with no application and no fee, permanently (no expiry).
- Existing guild creators are backfilled so they are not shown as non-members.

### 5. One-off entry fee or monthly subscription
Guild settings gain a choice of billing model:
- **One-time entry fee** — pay once, member forever (current behaviour, minus the expiry surprise).
- **Monthly fee** — a recurring amount that keeps the member role alive.
- Optional joining fee combined with the monthly fee.

For monthly members:
- A renewal date is shown, with reminders 7 days and 1 day before.
- Renewal is charged automatically from the credits balance if enough is available; otherwise a reminder asks to top up.
- A 7-day grace period after a failed renewal before the role drops to guest.
- Members can cancel at any time; they keep the role until the paid period ends.
- Guild admins see who is active, in grace, or lapsed.

## Technical notes

- Add `credits_balance` to `guild_wallets`; add a `guild_credit_transactions` ledger (guild_id, user_id, amount, type, source) with grants + RLS (guild admins read, service role writes).
- Extend `guilds` with `billing_model` (`one_time` | `monthly`), `monthly_fee_credits`, `joining_fee_credits`, `requires_application_before_payment`.
- Extend `user_guild_memberships` with `status` (`active` | `grace` | `lapsed` | `cancelled`), `current_period_end`, `cancel_at_period_end`, `last_payment_at`.
- Replace the client-side `becomeMember` credit spend with an edge function `guild-membership-pay` (service role) that atomically: verifies eligibility/approval, debits the user, credits the guild wallet, writes both ledger rows, upserts membership, inserts `guild_members` row, notifies admins.
- New edge function `guild-membership-renew` on a daily cron: charges due monthly members, handles grace/lapse transitions, sends reminders.
- Guild creation flow inserts an `active`, non-expiring `user_guild_memberships` row for the creator; one-off backfill for existing creators.
- Update `GuildJoinButton` / `EntityApplicationsTab` so approval of an application with a fee produces a "pay to activate" state, and `GuildMembershipCard` to render the new statuses, renewal date, and cancel action.
- Add membership settings (billing model, fees, application-before-payment toggle) to `GuildMembershipSettingsPanel`.
