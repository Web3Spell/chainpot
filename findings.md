## Title
[C-01] Paying is optional

## Description
The current design relies entirely on user trust and honesty to pay their dues each cycle. Becoming a member is free and instant, joining pots is unrestricted, meaning that a malicious actor can create as many wallets as they wish, become a member, join pots, lowball the auctions heavily after paying 1 cycle and then disappear. 

## Recommendation
This is a fundamental design flaw in the Chainpot, it requires heavy revision. Our recommendation would be to make pot participation via a Merkle tree so only invited/trusted parties can participate. Other than that, the `onlyRegistered` modifier is currently useless, giving false sense of security due to joining being entirely permissionless, free and instant. The protocol can't operate in the current design.


## Title
[C-02] VRF can still be spammed

## Description
The C-03 remediation gated LotteryEngineV3.requestRandomWinner behind an allowlist, but the AuctionEngine must itself be allowlisted for the protocol to work, leaving the real drain path wide open. Any user can register two free accounts, create a throwaway pot with amountPerCycle = 1 wei, start a cycle, and call closeBidding/declareWinner with zero bids — the no-bid branch of declareWinner fires a paid Chainlink VRF request. No USDC is ever staked and the steps are infinitely repeatable, so an attacker burns the protocol's LINK subscription for the cost of gas alone.

## Recommendation

Don't request VRF for a cycle that has no economic value and introduce some MIN_AMOUNT_PER_CYCLE and force the creator of the pot to also particiapte and put up funds upon cycle creation, making the attack less appealing


## Title
[H-01] Users can participate more than once

## Description
Chit funds or ROSCAs are designed so each member takes the pot exactly once. Auction winners are never stored or checked further in a pot's lifecycle. Previous winners can participate in further auctions, breaking core invariant.

## Recommendation
Forbid users who already won the pot once to participate again. 


## Title
[H-02] Random draws can choose member who already won once

## Description
Random draws (when there are no bidders) choose from the entire `pot.members`, not excluding people who already won the pot once. This violates the core design of how ROSCAs function. 

## Recommendation
Exclude previous winners from the random draw


## Title
[H-03] Users can DoS if they bid more than what's collected

## Description
Bidding is checked to be within the bounds of 0 and `amountPerCycle * numMembers`. However not all members are promised to pay. If a pot has 10 people with 100USD per cycle, only 8 pay, totalCollected = 800, bidding 900 is possible. If that happens, the cycle is bricked with the error `InsufficientCycleBalance`.

## Recommendation
Check bidding against what was collected in the cycle.

## Title
[H-04] Push over pull bricks the protocol on blacklisted winner

## Description
completeCycle pushes USDC to the winner via releaseFundsToWinner and then to every non-winner via distributeRemainderTo, all in a single transaction. Because USDC enforces a blacklist, if the winner — or any single non-winner recipient — is blacklisted, safeTransfer reverts and the whole completeCycle call reverts. The cycle can never reach Completed, and since cycles are sequential, the entire pot is permanently frozen with all member funds locked.

## Recommendation
Replace the push-payment pattern with a pull-based one: have completeCycle credit each winner/non-winner's withdrawable balance internally and let recipients claim() their funds in separate transactions.

## Title
[H-05] Dangerous 1:1 minting when shares = 0

## Description
In deposit, when convertToShares rounds down to 0 (which happens once totalAssets has grown well above totalShares, i.e. after interest accrues or inflation attack), the code falls back to shares = amount. Since amount is denominated in assets, not shares, this mints shares at a 1:1 rate that only holds on the very first deposit — massively over-inflating the depositor's share balance relative to everyone else. That depositor can then withdraw far more than they put in, draining principal and interest belonging to other pots/cycles.

## Recommendation
If shares == 0, revert the transaction instead of minting shares. 


## Title
[M-01] All bidders can change their bid at will

## Description
Auctions are won by the user who bid the lowest amount. During an auction, nothing is stopping the currently winning bidder to remove their bid by changing it to a higher value. This violates an invariant in auctions where current winners should not be allowed to withdraw their commitment, breaking a core invariant.

## Recommendation
Store lowest bidder during the auction itself, forbid the current lowest bidder to alter their participation.


## Title
[M-02] Reputation can be inflated with losing bids

## Description
The reputation parameter of each bidder increases by 1, whenever a bid is submitted. Bidding is currently unrestricted and can be performed at will. Users can submit purposefully losing bids (higher than the current lowest bid) and gain reputation, undermining the parameter as a whole.

## Recommendation
Skip the reputation gain if a user had already bid in the current cycle.


## Title
[M-03] No bid min-step

## Description
Auctions are won by the user who bid the lowest amount. These values are checked against one another, without having a meaningful minimum requirement for a difference between them. Working with amounts scaled for decimals makes this even worse since a bid of 1e18+1 will be overtaken by a bid of 1e18, while providing no meaningful value.

## Recommendation
Introduce a min-step, such as e.g 2% of the current lowest bid. 

## Title
[M-04] Reputation has no meaningful purpose

## Description
The reputation parameter does not serve any purpose - users are neither rewarded by maintaining high rep, nor penalised for having low rep. Becoming a member also doesn't cost a thing, any user with ruined reputation can just join from a new wallet.

## Recommendation
Come up with incentives for users to maintain good reputation or at least penalize low rep members by giving them worse premiums, higher bid steps, etc.

## Title
[M-05] Non-fixed member count doesn't make sense 

## Description
Having a min-max range of users does not make sense in a ROSCA as it violates the requirement that each member must win at least 1 cycle. Having 9 or 11 people on a 10-cycle pot ends up in weird states.

## Recommendation
Enforce a fixed number of participants

## Title
[M-06] Members can pay for cycle after end time

## Description
payForCycle only checks that the cycle status is Active; it never verifies block.timestamp < cycle.endTime. Because a cycle is not auto-finalized at endTime, it can linger in the Active state, allowing members to deposit their contribution after the cycle has effectively ended — and even after bidding has closed. This breaks the core invariant that all contributions for a cycle are collected within the cycle's lifetime.

## Recommendation
Add an explicit deadline check to payForCycle


## Title
[L-01] Potlist array is unbounded and freely fillable

## Description
Pots can be created by anyone and users can join them freely. This is performed by pushing the potId into an array which is accessed in a gas-heavy way in the code. Griefers can join a huge number of pots to try and DoS array look-up or waste gas.

## Recommendation
Enforce some sensible max joined pots parameter.


## Title
[L-02] Fixed members pots can be griefed

## Description
A pot where `minMembers = maxMembers`, or a fixed-number pot, can be griefed by a dishonest user who leaves every time a creator tries to start it. There are no cooldowns, penalties or creator-user blacklists to stop this. 

## Recommendation
Enforce a meaningful cooldown and/or penalty for users joining-leaving other pots.

## Title
[L-03] Emergency withdraw is too centralized

## Description
The protocol has an emergency withdraw function which transfers the entire current balance. This is not recommended in a project that aims to position themselves as a trustless place.

## Recommendation
Remove the functionality





## Title
[I] CEI not followed

## Description
EscrowV3.depositFromMember and CompoundIntegratorV3.supplyUSDCForPot do not follow the CEI pattern.

## Recommendation
Move both USDC transfers to the end of the function 



## Title
[I] Reading raw balance is dangerous

## Description
CompoundIntegratorV3.totalAssets() returns the live COMET.balanceOf(address(this)), which is the denominator for all share-price math in convertToShares/convertToAssets. Because this reads the integrator's raw Comet balance, rather than an internally tracked figure, the share price can be moved by funds outside the deposit flow — direct COMET.supply on the integrator's behalf, accrued interest, or any cross-pot balance. It is Low today only because the shares == 0 => shares = amount fallback masks the rounding path an attacker would otherwise abuse; remove that fallback and this becomes a first depositor/inflation attack.

## Recommendation
Track the total assets internally



## Title
[I] Max participants mismatch
 
## Description
AuctionEngineV3 caps pot membership at MAX_MEMBERS = 100, while LotteryEngineV3.requestRandomWinner rejects participant arrays only when participants.length > MAX_PARTICIPANTS = 200. Since the participant list passed to VRF is always a pot's member set (≤ 100), the TooManyParticipants check can never trigger and is effectively dead code. 

## Recommendation
Normalize the two constants to the same value.








