# SkillMint Beta Activation and Pricing Direction

## Purpose

Sprint 7.8 adds activation signals without adding payments or paid access.

SkillMint should feel like a serious career readiness system:

> Stop applying blindly. Know your proof gaps, match real jobs, and build your next 30 days.

## Target Users

- Freshers
- Final-year students
- Unemployed early job seekers
- Motivated job seekers who want structured guidance
- Coaching institutes, placement trainers, and career mentors

SkillMint is India-first for validation and global-ready in positioning.

## Career Families

Setup now asks for a broad career field:

- Tech / Software
- Data / Analytics
- Sales / Business Development
- Marketing / Content
- Finance / Operations
- Design / Product
- Other

This field is for future personalization. It does not change scoring, resume parsing, ATS matching, or roadmap generation yet.

Current persistence behavior:

- Saved locally in `skillmint:target-role-setup`
- Included in the profile goal summary when profile sync succeeds
- No Supabase schema change yet

## Activation Loop

The intended beta activation loop is:

1. Choose career direction
2. Upload resume proof
3. Review readiness and proof gaps
4. Match one real job description
5. Build the next 30 days
6. Save progress or signal paid-beta interest

Major app pages now show a compact next best action panel based on local progress.

## Upgrade Interest

Sprint 7.8 does not add payments.

Upgrade interest is stored locally under:

```text
skillmint:upgrade-interest
```

This is only a product signal. It does not unlock features, create plans, or block free users.

## Pricing Direction

Free beta remains active for now.

Possible future India pricing:

- Monthly: Rs. 299 / Rs. 499
- One-time readiness sprint: Rs. 999 for a 30-day job readiness sprint

Global pricing can be explored later after India-first validation.

## Do Not Build Yet

- Razorpay or Stripe integration
- Paid entitlements
- Hard paywalls
- Fake scarcity or discounts
- AI claims beyond the current deterministic system

## Next Product Questions

- Which career families show the strongest activation?
- Which pages generate the most upgrade interest?
- Do users understand "proof gaps" better than "resume score"?
- Are coaching institutes interested in grouped student readiness views?
