import math
from datetime import datetime

def norm_cdf(x):
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def bs_call_price(S, K, T, r, sigma):
    if T <= 0 or sigma <= 0:
        return max(0.0, S - K)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)

def bs_put_price(S, K, T, r, sigma):
    if T <= 0 or sigma <= 0:
        return max(0.0, K - S)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)

def calculate_iv(price, S, K, T, r, is_call=True):
    if price <= 0 or S <= 0 or K <= 0 or T <= 0:
        return 0.0
    
    # Intrinsic value check
    intrinsic = max(0.0, S - K) if is_call else max(0.0, K - S)
    if price < intrinsic:
        return 0.0

    low = 0.001
    high = 5.0
    for _ in range(100):
        mid = (low + high) / 2.0
        p = bs_call_price(S, K, T, r, mid) if is_call else bs_put_price(S, K, T, r, mid)
        if abs(p - price) < 0.001:
            return round(mid * 100, 2)
        if p > price:
            high = mid
        else:
            low = mid
    return round(mid * 100, 2)

# Test with real HDFCBANK option from NSE
# Spot: 708.25, Strike: 720, Call LTP: 9.35, Expiry: 17 days
T = 17.0 / 365.0
r = 0.0675
iv = calculate_iv(9.35, 708.25, 720.0, T, r, is_call=True)
print(f"Calculated Real IV for HDFCBANK Call (Spot=708.25, Strike=720, LTP=9.35): {iv}%")
