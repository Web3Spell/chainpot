# Architecture
![diagram-export-22-4-2025-10_52_12-pm](https://github.com/user-attachments/assets/6c9dd99d-9000-4910-9e2c-5576d935e0f1)

---
# High Level Design

![image](https://github.com/user-attachments/assets/97f7938a-158b-4a2a-89b6-f832e93c1eb0)

---

A decentralized savings and rewards platform where users deposit funds, earn yield via Compound v3, and either win through auction or randomized lottery. Built with modular smart contracts and a modern web stack.

---

## Features

- Escrow-backed user deposits
- Auction or lottery-based winner selection
- Yield earning through Compound v3
- Randomness via Pyth Entropy
- Invite-only pools for access control
- Clean frontend using TailwindCSS and Wagmi

---

## Tech Stack

| Feature          | Tool                          |
|------------------|-------------------------------|
| Smart Contracts  | Foundry                       |
| Yield Earning    | Compound v3                   |
| Randomness       | Pyth Entropy                  |
| UI Framework     | TailwindCSS                   |
| Backend          | Next.js + tRPC                |
| Authentication   | NextAuth                      |
| Database         | Prisma with PostgreSQL        |
| Wallet Integration | Wagmi + RainbowKit         |

---

## Architecture Flow

### Pool Flow

1. **Create Account**
2. **Deposit Funds** → sent to Escrow Contract → Compound v3
3. At cycle end:
   - If bids exist → highest bidder wins (Auction Engine)
   - If no bids → random winner via Pyth Entropy (Lottery Engine)
4. Winner receives yield; protocol fee deducted
5. Cycle resets

### Smart Contract Modules

| Module                 | Purpose                                       |
|------------------------|-----------------------------------------------|
| Escrow Contract        | Manages deposits, withdrawals, and payouts    |
| Member Account Manager | Handles user accounts, invites, pool joins    |
| Auction Engine         | Accepts bids and selects top bidder           |
| Lottery Engine         | Picks random winner using Oracle              |
| Compound Integrator    | Interfaces with Compound v3 for yield         |

---

## Prisma Schema

```prisma
model InviteCode {
  id        String  @id @default(cuid())
  code      String  @unique
  createdBy String
  poolId    String?
  expiresAt DateTime?
  usedBy    User[]
}

model User {
  id         String   @id @default(uuid())
  email      String   @unique
  pools      Pool[]
  usedInvite InviteCode? @relation(fields: [inviteCodeId], references: [id])
  inviteCodeId String?
}
```
---

## Setup

```bash
# Clone repository
git clone 

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Compile smart contracts
forge build

# Start development server
pnpm dev
```

