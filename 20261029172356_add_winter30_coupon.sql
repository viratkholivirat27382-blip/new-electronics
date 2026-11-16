/*
# Add WINTER30 promo code

1. New Data
- Adds a WINTER30 coupon: 30% off, no minimum spend, active, no expiry.
- Existing coupons (VEYRA20, WELCOME10) are preserved.

2. Important Notes
- Uses ON CONFLICT so re-running is safe.
*/

INSERT INTO coupons (code, percent_off, fixed_off, min_subtotal, active, expires_at)
VALUES ('WINTER30', 30.00, NULL, 0.00, true, NULL)
ON CONFLICT (code) DO NOTHING;
