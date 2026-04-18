# ZKP Authentication: Complete Registration & Login Flow

## THE CONFUSION CLEARED

**You're right to be confused!** Let me show you EXACTLY what happens at each step.

---

## PART 1: REGISTRATION (Sign Up)

### What User Enters:
```
Username: "bharath@example.com"
Password: "MySecurePassword123"
```

### What Happens BEHIND THE SCENES:

#### Step 1: Device Derives Secret Key
```
Device takes the password: "MySecurePassword123"
Device applies cryptographic function: SHA-256 (or similar)
Result: x = some very large number (256-bit)

Example (simplified):
x = 87654321098765432109876543210 (secret key derived from password)
```

**Important:** This `x` is derived FROM the password, not the password itself.

---

#### Step 2: Device Calculates Public Key
```
Device calculates:
y = g^x mod p

Where:
g = 2 (or large generator in real system)
x = the secret from Step 1
p = large prime number

Example:
y = 2^87654321098765432109876543210 mod 10^18+7
y = 512 (simplified example)

Result: y is a PUBLIC KEY
```

---

#### Step 3: Device Stores Secret Locally
```
On User's Device (ENCRYPTED storage):
- x = 87654321098765432109876543210 (NEVER leaves device)
- password = "MySecurePassword123" (for unlocking)
```

---

#### Step 4: Server Stores Public Data
```
In Database (SAFE to store publicly):

Table: users
┌──────────────────────┬──────────────────────┬──────────────────┐
│ username             │ public_key (y)       │ g                │
├──────────────────────┼──────────────────────┼──────────────────┤
│ bharath@example.com  │ 512                  │ 2                │
└──────────────────────┴──────────────────────┴──────────────────┘

Server DOES NOT store:
- ✗ Password
- ✗ Secret x
- ✗ Anything that can directly authenticate
```

---

### Registration Summary:

```
USER PROVIDES:           DEVICE DOES:              SERVER STORES:
┌─────────────┐         ┌──────────────┐          ┌─────────────┐
│ Username    │──────>  │ Hash password │────────> │ Username    │
│ Password    │         │ Get secret x  │          │ Public key  │
└─────────────┘         │ Calculate y   │          │             │
                        │ Encrypt x     │          └─────────────┘
                        │ locally       │
                        └──────────────┘
                             │
                             v
                        ┌─────────────┐
                        │ Secret x    │
                        │ (encrypted  │
                        │  on device) │
                        └─────────────┘
```

---

## PART 2: LOGIN (Sign In)

### What User Enters:
```
Username: "bharath@example.com"
Password: "MySecurePassword123"
```

### LOGIN FLOW - STEP BY STEP:

---

### Step 1: User Submits Username
```
Browser sends to server:
POST /login
{
  "username": "bharath@example.com"
}

Server:
- Looks up user in database
- Finds: y = 512
- Sends back: "Ready for ZKP authentication"
```

---

### Step 2: Device Recovers Secret x from Password
```
User's Device receives login request with username

Device does:
1. Take entered password: "MySecurePassword123"
2. Apply same hash function: SHA-256
3. Decrypt stored secret x
4. Result: x = 87654321098765432109876543210

Now device HAS the secret x in memory (temporarily)
```

**IMPORTANT:** The password is ONLY used to unlock the secret on the device. 
**It is NEVER sent to the server.**

---

### Step 3: Device Initiates ZKP Proof
```
Device randomly picks: r = 4
Device calculates: t = g^r = 2^4 = 16

Device sends to server:
POST /zkp/proof-start
{
  "username": "bharath@example.com",
  "t": 16
}

Server response:
- Stores t temporarily
- Sends back random challenge: c = 7
```

---

### Step 4: Device Calculates Proof
```
Device has:
- r = 4 (random, only on device)
- x = 87654321098765432109876543210 (secret, only on device)
- c = 7 (from server's challenge)

Device calculates:
s = r + c × x
s = 4 + 7 × 87654321098765432109876543210
s = 4 + 612580247689756824176903950470
s = 612580247689756824176903950474

Device sends to server:
POST /zkp/proof-submit
{
  "username": "bharath@example.com",
  "s": 612580247689756824176903950474
}

CRUCIAL: s is sent, but x is NEVER sent!
```

---

### Step 5: Server Verifies
```
Server has:
- y = 512 (public key from database)
- t = 16 (received in step 3)
- c = 7 (sent in step 3)
- s = 612580247689756824176903950474 (received in step 4)

Server calculates:
Left side:  g^s = 2^612580247689756824176903950474 = HUGE NUMBER
Right side: t × y^c = 16 × 512^7 = HUGE NUMBER

If both sides are EQUAL:
✓ Authentication SUCCESS
✓ User logged in
✓ Session created

If they don't match:
✗ Authentication FAILED
✗ "Invalid credentials"
```

---

## COMPARISON: What Makes ZKP Different?

### Traditional Password Login:

```
User sends password to server:
┌──────────────┐                    ┌──────────────┐
│  "MySecure   │  ────RISKY───>    │ Store hash   │
│ Password123" │                    │ in database  │
└──────────────┘                    └──────────────┘

PROBLEMS:
✗ If server is hacked, password hash is stolen
✗ Man-in-the-middle can intercept password
✗ Server knows the password
```

### ZKP Login:

```
User proves they know the secret (WITHOUT sending it):
┌──────────────┐                    ┌──────────────┐
│ Password     │                    │ Only stores  │
│ (unlocks x)  │  ────SAFE───>     │ public key y │
│              │                    │ (can share)  │
└──────────────┘                    └──────────────┘

SECURITY:
✓ Password NEVER sent
✓ Secret x NEVER sent
✓ Even if server is hacked, no password to steal
✓ Even with intercepted proof, x cannot be recovered
```

---

## COMPLETE DATABASE VIEW

### What's Actually Stored in Database:

```
Table: users
┌─────────────────────────┬──────────────┬─────────────────────┐
│ username                │ public_key   │ created_at          │
├─────────────────────────┼──────────────┼─────────────────────┤
│ bharath@example.com     │ 512          │ 2025-11-21 10:30:00 │
│ ravi@example.com        │ 823          │ 2025-11-21 11:45:00 │
│ priya@example.com       │ 441          │ 2025-11-21 12:15:00 │
└─────────────────────────┴──────────────┴─────────────────────┘

Table: zkp_sessions (temporary, cleared after login)
┌────────────────────────┬──────────────┬──────────────┐
│ username               │ challenge (c) │ t_value     │
├────────────────────────┼──────────────┼──────────────┤
│ bharath@example.com    │ 7            │ 16          │
└────────────────────────┴──────────────┴──────────────┘

NOTHING stored about:
- Passwords
- Secrets (x values)
- Proofs (s values)
```

---

## VISUAL TIMELINE: Registration to Login

```
═══════════════════════════════════════════════════════════════

REGISTRATION DAY
═══════════════════════════════════════════════════════════════

User: "bharath@example.com" + "Password123"
                    ↓
Device: Hash password → get secret x
                    ↓
Device: Calculate public key y = g^x
                    ↓
Device: Store x (encrypted) locally
                    ↓
Server: Store only (username, y, g)

═══════════════════════════════════════════════════════════════

LOGIN DAY (Week Later)
═══════════════════════════════════════════════════════════════

User: "bharath@example.com" + "Password123"
                    ↓
Device: Hash password → recover secret x
                    ↓
Device: Generate random r, send t = g^r
                    ↓
Server: Send random challenge c
                    ↓
Device: Calculate proof s = r + c×x
                    ↓
Server: Verify g^s ?= t × y^c
                    ↓
✓ SUCCESS or ✗ FAIL

═══════════════════════════════════════════════════════════════
```

---

## KEY POINTS (SUPER CLEAR):

### 1. Why User Enters Password at Login?
```
✓ To unlock/recover the secret x from device storage
✓ NOT to send to server
✓ Password is ONLY used on the user's device
```

### 2. How is ZKP Used?
```
✓ After password recovers x, ZKP proof is calculated
✓ The proof (s) is what's sent for authentication
✓ Server never sees x or the password
```

### 3. How are Credentials Stored?
```
DATABASE:
- Username ✓ (public)
- Public key y ✓ (public)
- Base g ✓ (public)

NOT STORED:
- Password ✗ (never sent to server)
- Secret x ✗ (stays on user device)
- Proof s ✗ (temporary, verified once)
```

### 4. What if Someone Steals the Database?
```
Hacker gets: (username, y, g)

Hacker CANNOT:
✗ Calculate x from y (mathematically hard)
✗ Forge proofs without x
✗ Login to accounts

Why?
Because y = g^x is one-way. You can't reverse it.
```

---

## FLOW DIAGRAM: What Goes Where?

```
                    DEVICE                          SERVER
                   ┌─────────┐                    ┌──────────┐
                   │ Password │                   │Database  │
                   │   x      │                   │username: │
                   │   r      │                   │   y      │
                   │   g      │                   │   g      │
                   └─────────┘                    └──────────┘
                       │                              │
                       │──1. Send username──────────>│
                       │                              │
                       │<──2. Send challenge c────────│
                       │                              │
                       │  (Calculate s locally)       │
                       │                              │
                       │──3. Send proof s────────────>│
                       │                              │
                       │<──4. ✓ Authentication────────│
                       │                              │
                   ┌─────────┐                    ┌──────────┐
                   │Logged In!│                   │Session   │
                   │(New Tab) │                   │Created   │
                   └─────────┘                    └──────────┘
```

---

## STEP-BY-STEP EXAMPLE WITH REAL NUMBERS

### Registration:
```
User enters:
- Username: bharath@example.com
- Password: Password123

Device calculates:
- x = SHA-256("Password123") = 12345678901234567890123456789012 (256-bit)
- y = 2^12345678901234567890123456789012 mod (large prime)
- y = 987654321 (result, simplified)

Database stores:
| bharath@example.com | 987654321 | 2 |

Device stores (encrypted):
| x = 12345678901234567890123456789012 |
```

### Login:
```
User enters:
- Username: bharath@example.com
- Password: Password123

Device:
1. x = SHA-256("Password123") = 12345678901234567890123456789012 ✓ (matches!)
2. r = 42 (random)
3. t = 2^42 = 4398046511104
4. Send: (username, t)

Server:
5. c = 9 (random challenge)
6. Send: c

Device:
7. s = 42 + 9 × 12345678901234567890123456789012
8. s = 111111111101111111111111111111130 (result)
9. Send: s

Server:
10. Verify: 2^111111111101111111111111111111130 ?= 4398046511104 × 987654321^9
11. ✓ MATCH! Authentication successful!
```

---

## SUMMARY TABLE

| Phase | User Enters | Device Does | Server Does | Stored in DB |
|-------|---|---|---|---|
| **Register** | username + password | Hash pwd → x, calc y | Receive y | username, y |
| **Login** | username + password | Hash pwd → recover x | Receive username | (temp session) |
| **Proof Start** | (nothing) | Calc t = g^r | Send challenge c | (temp) |
| **Proof Submit** | (nothing) | Calc s = r+c×x | Verify g^s=t×y^c | (cleared) |
| **Result** | (nothing) | Session created | Session created | Session token |

---

## FINAL ANSWER TO YOUR QUESTIONS

### Q1: During registration, what happens?
```
User gives: username + password
Device derives: secret x from password, calculates public y
Server stores: only username and y (not password, not x)
```

### Q2: During login, what happens?
```
User gives: username + password
Device recovers: secret x using password
Device proves: knowledge of x using ZKP (sends proof s, not x)
Server verifies: proof using public y
Server accepts: if proof is valid
```

### Q3: How is ZKP used?
```
ZKP is the proof mechanism:
- Device calculates proof s based on secret x
- Server verifies proof using public y
- Secret x is never revealed
```

### Q4: How are credentials stored?
```
Server stores: username, public key y, base g
Server does NOT store: password, secret x, proof s
Device stores (encrypted): secret x
```

---

## SECURITY GUARANTEE

Even if:
- ✗ Server is hacked → Attacker gets (username, y)
- ✗ Network is intercepted → Attacker sees (t, c, s)
- ✗ Multiple logins observed → Attacker sees different (t, c, s) each time

**Attacker STILL cannot:**
- ✗ Calculate x from y (one-way function)
- ✗ Forge proof s without knowing x
- ✗ Login to accounts
- ✗ Recover the original password

This is why ZKP is secure! 🎯
