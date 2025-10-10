# Cravlr Business Subscription Flow

## 🎯 Overview
After a business is verified by an admin, they must select a subscription plan before accessing the dashboard.

## 💰 Pricing Plans

### Base Plan (Commission Only)
- **Cost**: 10% commission per confirmed visit
- **Features**:
  - Pay only when customers visit
  - No monthly fees
  - Basic referral tracking
  - Standard visibility

### Growth Tier (Premium)
- **Cost**: $49/month per location
- **Early Adopter Special**: $29/month for first 3 months
- **Features**:
  - Priority placement in recommendations
  - Advanced analytics dashboard
  - Featured listings & badges
  - Higher visibility to food lovers
  - Early adopter pricing

## 📋 User Flow

### 1. Business Sign Up
- Business owner signs up at `/auth-business`
- Creates business profile

### 2. Submit Restaurant Claim
- Navigate to `/business/claim`
- Submit restaurant ownership verification
- Status: "Pending"

### 3. Admin Verification
- Admin reviews claim at `/admin/business-claims`
- Verifies ownership
- Status changes to: "Verified"

### 4. **Subscription Selection** (NEW)
- Upon first login after verification, business is redirected to `/business/subscription`
- Must choose between Base Plan or Growth Tier
- Selection is saved to `business_profiles.is_premium`
- Cannot access dashboard until plan is selected

### 5. Dashboard Access
- After selecting plan, redirected to `/business/dashboard`
- Full access to all features based on selected plan

## 🗄️ Database Schema

### business_profiles Table
```sql
- is_premium (boolean | null)
  - null = no subscription selected yet
  - false = Base Plan (commission only)
  - true = Growth Tier ($49/month)

- premium_started_at (timestamp)
  - Set when Growth Tier is selected

- stripe_subscription_id (text)
  - Will store Stripe subscription ID (future integration)

- default_ticket_value (numeric)
  - Optional fallback for commission calculation
```

## 🔐 Access Control

### Subscription Check
```typescript
// In BusinessDashboard.tsx
const { data: profile } = await supabase
  .from('business_profiles')
  .select('is_premium')
  .eq('user_id', user?.id)
  .maybeSingle();

// If is_premium is null, redirect to subscription page
if (profile && profile.is_premium === null) {
  navigate('/business/subscription');
  return;
}
```

## 🧪 Testing Steps

1. **Create Test Business Account**
   - Sign up as business at `/auth-business`
   - Submit claim at `/business/claim`

2. **Verify as Admin**
   - Login as admin
   - Go to `/admin/business-claims`
   - Verify the test business

3. **Test Subscription Selection**
   - Login as test business
   - Should auto-redirect to `/business/subscription`
   - Select Base Plan → redirects to dashboard
   - Check `business_profiles.is_premium = false`

4. **Test Growth Tier**
   - Create another test business
   - After verification, select Growth Tier
   - Should show intro pricing ($29/month)
   - Check `business_profiles.is_premium = true`

5. **Test Dashboard Access**
   - Businesses with plan selected can access dashboard
   - Those without are redirected to subscription page

## 🚀 Future Enhancements

### Stripe Integration (To Do)
- Create Stripe products for Growth Tier
- Implement checkout flow for $49/month subscription
- Add intro pricing ($29) with Stripe coupons
- Handle subscription webhooks
- Add subscription management (upgrade/downgrade/cancel)

### Features to Add
- View current plan in dashboard
- Change plan option
- Billing history
- Subscription renewal reminders
- Trial period option

## 📁 Files Created/Modified

### New Files
- `src/pages/SubscriptionSelection.tsx` - Subscription selection page

### Modified Files
- `src/App.tsx` - Added subscription route
- `src/pages/BusinessDashboard.tsx` - Added subscription check
- `src/components/PremiumUpgrade.tsx` - Updated pricing to $49/month
- Database migrations for subscription tracking fields

## 📞 Support

For subscription issues:
1. Check `business_profiles.is_premium` value
2. Verify business claim status is 'verified'
3. Check business_profiles record exists for user
4. Review console logs for API errors
