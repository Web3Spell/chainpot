// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MemberAccountManager.sol";

contract MemberAccountManagerTest is Test {
    MemberAccountManager mam;

    address owner = address(0xA11CE);
    address user1 = address(0xBEEF);
    address user2 = address(0xCAFE);
    address user3 = address(0xD00D);
    address auth = address(0x1234);

    function setUp() public {
        vm.prank(owner);
        mam = new MemberAccountManager();

        vm.prank(owner);
        mam.addAuthorizedCaller(auth);
    }

    modifier asAuth() {
        vm.startPrank(auth);
        _;
        vm.stopPrank();
    }

    function reg(address u) internal {
        mam.registerMember(u);
    }

    // ----------------------------
    // Registration
    // ----------------------------
    function testRegisterMember() public {
        mam.registerMember(user1);

        (bool registered,,,,,,,,) = mam.getMemberProfile(user1);
        assertTrue(registered, "should register user");
    }

    function testRegisterFailAlreadyRegistered() public {
        mam.registerMember(user1);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.AlreadyRegistered.selector, user1));
        mam.registerMember(user1);
    }

    function testRegisterZeroAddressReverts() public {
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.InvalidAddress.selector));
        mam.registerMember(address(0));
    }

    function testRegisterDuplicateReverts() public {
        mam.registerMember(user1);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.AlreadyRegistered.selector, user1));
        mam.registerMember(user1);
    }

    function testGetTotalMembersIncrements() public {
        assertEq(mam.getTotalMembers(), 0);
        mam.registerMember(user1);
        mam.registerMember(user2);
        mam.registerMember(user3);
        assertEq(mam.getTotalMembers(), 3);
        // ensure getMemberByIndex returns registered addresses (order not guaranteed but at least valid)
        address a = mam.getMemberByIndex(0);
        assertTrue(a == user1 || a == user2 || a == user3);
    }

    // ---------- Authorization management ----------
    function testNonOwnerCannotAddAuthorizedCaller() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        mam.addAuthorizedCaller(address(0xABC));
    }

    function testOwnerCannotAddZeroAuthorizedCaller() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.InvalidAddress.selector));
        mam.addAuthorizedCaller(address(0));
    }

    function testAddRemoveAuthorizedCallerFlow() public {
        address newAuth = address(0xCA11);
        vm.prank(owner);
        mam.addAuthorizedCaller(newAuth);
        // now newAuth should be able to call authorized functions
        vm.startPrank(newAuth);
        // register user then call updateParticipation which requires onlyAuthorized + onlyRegistered
        mam.registerMember(user1);
        // potId 1 and cycle 1 valid
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.InvalidPotId.selector, uint256(0)));
        mam.updateParticipation(user1, 0, 1, 100, false);
        vm.stopPrank();

        // remove
        vm.prank(owner);
        mam.removeAuthorizedCaller(newAuth);

        vm.prank(newAuth);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.NotAuthorized.selector, newAuth));
        mam.updateParticipation(user1, 1, 1, 100, false);
    }

    // ----------------------------
    // Participation
    // ----------------------------

    function testUpdateParticipation() public asAuth {
        mam.registerMember(user1);

        mam.updateParticipation(user1, 1, 1, 100, false);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 1, 1);

        assertEq(cp.cycleId, 1);
        assertEq(cp.contribution, 100);

        uint256 rep = mam.getReputationScore(user1);
        assertEq(rep, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION());
    }

    function testParticipationRevertIfNotRegistered1() public asAuth {
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.UserNotRegistered.selector, user1));
        mam.updateParticipation(user1, 1, 1, 100, false);
    }

    function testParticipationPotJoinOnly() public asAuth {
        mam.registerMember(user1);
        mam.updateParticipation(user1, 10, 0, 0, true);

        bool isCreator = mam.isPotCreator(user1, 10);
        assertTrue(isCreator, "pot creator flag should be set");
    }

    // ----------------------------
    // Bid Info
    // ----------------------------
    function testUpdateBid() public asAuth {
        mam.registerMember(user1);

        mam.updateParticipation(user1, 5, 1, 50, false);
        mam.updateBidInfo(user1, 5, 1, 30, true);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 5, 1);

        assertEq(cp.bidAmount, 30);
        assertTrue(cp.didBid);

        uint256 rep = mam.getReputationScore(user1);
        assertEq(rep, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION() + mam.REPUTATION_BID());
    }

    function testUpdateBidRevertNoParticipation() public asAuth {
        mam.registerMember(user1);

        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.PotNotFound.selector, 99));
        mam.updateBidInfo(user1, 99, 1, 10, true);
    }

    function testJoinPotOnlyDoesNotIncrementCycles() public asAuth {
        reg(user1);

        // join pot as creator with cycleId = 0
        mam.updateParticipation(user1, 10, 0, 0, true);

        // check createdPots contains 10 and totalCyclesParticipated is 0
        (
            bool registered,
            uint256 totalCyclesParticipated,,
            uint256 totalContribution,,,,
            uint256[] memory created,
            uint256[] memory joined
        ) = mam.getMemberProfile(user1);

        assertTrue(registered);
        assertEq(totalCyclesParticipated, 0);
        assertEq(totalContribution, 0);
        assertEq(created.length, 1);
        assertEq(created[0], 10);
        assertEq(joined.length, 0);

        // isPotCreator should be true
        assertTrue(mam.isPotCreator(user1, 10));
    }

    function testFirstContributionCreatesCycleAndUpdatesReputation() public asAuth {
        reg(user1);

        uint256 beforeRep = mam.getReputationScore(user1);
        assertEq(beforeRep, mam.INITIAL_REPUTATION());

        mam.updateParticipation(user1, 5, 1, 500, false);

        // CycleParticipation
        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 5, 1);
        assertEq(cp.cycleId, 1);
        assertEq(cp.contribution, 500);
        assertGt(cp.timestamp, 0);

        (, uint256 totalCyclesParticipated,, uint256 totalContribution, uint256 reputation,,,,) =
            mam.getMemberProfile(user1);

        assertEq(totalCyclesParticipated, 1);
        assertEq(totalContribution, 500);
        assertEq(reputation, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION());
    }

    function testMultipleContributionsSameCycleOnlyIncrementOnce() public asAuth {
        reg(user1);

        mam.updateParticipation(user1, 7, 2, 100, false);
        // second contribution to same pot & cycle
        mam.updateParticipation(user1, 7, 2, 300, false);

        (, uint256 totalCyclesParticipated,, uint256 totalContribution,,,,,) = mam.getMemberProfile(user1);

        // cycle count should be 1
        assertEq(totalCyclesParticipated, 1);
        // total contribution should be sum of both contributions
        assertEq(totalContribution, 100 + 300);

        // cycle participation recorded as last contribution value (contract sets, not adds)
        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 7, 2);
        assertEq(cp.contribution, 300);
    }

    function testInvalidPotIdReverts() public asAuth {
        reg(user1);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.InvalidPotId.selector, uint256(0)));
        mam.updateParticipation(user1, 0, 1, 10, false);
    }

    function testParticipationRevertIfNotRegistered() public asAuth {
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.UserNotRegistered.selector, user2));
        mam.updateParticipation(user2, 1, 1, 10, false);
    }

    // ---------- Bid tests ----------
    function testUpdateBidBeforeParticipationReverts() public asAuth {
        reg(user1);
        // pot 99 not created for user1
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.PotNotFound.selector, uint256(99)));
        mam.updateBidInfo(user1, 99, 1, 10, true);
    }

    function testUpdateBidWithDidBidTrueIncreasesReputation() public asAuth {
        reg(user1);
        mam.updateParticipation(user1, 11, 3, 50, false);

        uint256 repBefore = mam.getReputationScore(user1);
        mam.updateBidInfo(user1, 11, 3, 25, true);
        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 11, 3);
        assertEq(cp.bidAmount, 25);
        assertTrue(cp.didBid);

        uint256 repAfter = mam.getReputationScore(user1);
        assertEq(repAfter, repBefore + mam.REPUTATION_BID());
    }

    function testUpdateBidWithDidBidFalseDoesNotIncreaseReputation() public asAuth {
        reg(user1);
        mam.updateParticipation(user1, 12, 4, 60, false);
        uint256 repBefore = mam.getReputationScore(user1);
        mam.updateBidInfo(user1, 12, 4, 0, false);
        uint256 repAfter = mam.getReputationScore(user1);
        assertEq(repAfter, repBefore); // unchanged
    }

    function testInvalidCycleIdRevertsOnBidUpdate() public asAuth {
        reg(user1);
        mam.updateParticipation(user1, 20, 1, 100, false);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.InvalidCycleId.selector, uint256(0)));
        mam.updateBidInfo(user1, 20, 0, 10, true);
    }

    function testCycleNotFoundRevertsOnBidUpdate() public asAuth {
        reg(user1);
        // create pot but not cycle 99
        mam.updateParticipation(user1, 21, 1, 10, false);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.CycleNotFound.selector, uint256(99)));
        mam.updateBidInfo(user1, 21, 99, 5, true);
    }

    // ----------------------------
    // Winner Marking
    // ----------------------------
    function testMarkWinner() public asAuth {
        mam.registerMember(user1);

        mam.updateParticipation(user1, 2, 7, 120, false);
        mam.markAsWinner(user1, 2, 7);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 2, 7);

        assertTrue(cp.won);

        uint256 rep = mam.getReputationScore(user1);
        assertEq(rep, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION() + mam.REPUTATION_WIN());
    }

    function testMarkWinnerRevertAlreadyMarked() public asAuth {
        mam.registerMember(user1);

        mam.updateParticipation(user1, 3, 5, 100, false);
        mam.markAsWinner(user1, 3, 5);

        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.AlreadyMarkedWinner.selector, 3, 5));
        mam.markAsWinner(user1, 3, 5);
    }

    function testMarkWinnerFlowIncreasesWinsAndReputation() public asAuth {
        reg(user1);
        mam.updateParticipation(user1, 2, 7, 120, false);

        uint256 repBefore = mam.getReputationScore(user1);
        mam.markAsWinner(user1, 2, 7);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user1, 2, 7);
        assertTrue(cp.won);

        (,, uint256 totalWins, uint256 winRate, uint256 rep) = mam.getUserStats(user1);
        assertEq(totalWins, 1);
        assertEq(winRate, 10000); // 1/1 in basis points
        assertEq(rep, repBefore + mam.REPUTATION_WIN());
    }

    function testMarkWinnerTwiceReverts() public asAuth {
        reg(user1);
        mam.updateParticipation(user1, 3, 5, 100, false);
        mam.markAsWinner(user1, 3, 5);

        vm.expectRevert(
            abi.encodeWithSelector(MemberAccountManager.AlreadyMarkedWinner.selector, uint256(3), uint256(5))
        );
        mam.markAsWinner(user1, 3, 5);
    }

    function testMarkWinnerCycleNotFoundReverts() public asAuth {
        reg(user1);
        mam.updateParticipation(user1, 30, 1, 10, false);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.CycleNotFound.selector, uint256(99)));
        mam.markAsWinner(user1, 30, 99);
    }

    function testMarkWinnerPotNotFoundReverts() public asAuth {
        reg(user1);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.PotNotFound.selector, uint256(999)));
        mam.markAsWinner(user1, 999, 1);
    }

    // ----------------------------
    // Reputation / Stats
    // ----------------------------
    function testStats() public asAuth {
        mam.registerMember(user1);

        mam.updateParticipation(user1, 4, 1, 10, false);
        mam.updateParticipation(user1, 4, 2, 10, false);
        mam.markAsWinner(user1, 4, 2);

        (uint256 totalPots, uint256 totalCycles, uint256 wins, uint256 winRate, uint256 rep) = mam.getUserStats(user1);

        assertEq(totalPots, 1);
        assertEq(totalCycles, 2);
        assertEq(wins, 1);
        assertEq(winRate, 5000); // 1/2 in basis points
        assertGt(rep, 0);
    }

    // ----------------------------
    // Authorized Caller Enforcement
    // ----------------------------
    function testUnauthorizedCaller() public {
        mam.registerMember(user1);

        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.NotAuthorized.selector, user2));
        mam.updateParticipation(user1, 1, 1, 100, false);
    }

    // -------------------------------
    // Fuzz: Registration
    // -------------------------------
    function testFuzz_Register(address user) public {
        vm.assume(user != address(0));

        mam.registerMember(user);
        assertTrue(mam.isRegistered(user));
    }

    function testFuzz_RegisterDouble(address user) public {
        vm.assume(user != address(0));

        mam.registerMember(user);

        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.AlreadyRegistered.selector, user));
        mam.registerMember(user);
    }

    // -------------------------------
    // Fuzz: Participation
    // -------------------------------
    function testFuzz_Participation(address user, uint256 potId, uint256 cycleId, uint256 contribution, bool isCreator)
        public
        asAuth
    {
        vm.assume(user != address(0));
        vm.assume(potId > 0);
        vm.assume(cycleId > 0);
        vm.assume(contribution > 0);
        vm.assume(contribution < 1e30); // sanity

        mam.registerMember(user);

        mam.updateParticipation(user, potId, cycleId, contribution, isCreator);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user, potId, cycleId);

        assertEq(cp.cycleId, cycleId);
        assertEq(cp.contribution, contribution);
        assertGt(cp.timestamp, 0);

        uint256 rep = mam.getReputationScore(user);
        assertEq(rep, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION());
    }

    // -------------------------------
    // Fuzz: Bid Updates
    // -------------------------------
    function testFuzz_Bid(
        address user,
        uint256 potId,
        uint256 cycleId,
        uint256 contribution,
        uint256 bidAmount,
        bool didBid
    ) public asAuth {
        vm.assume(user != address(0));
        vm.assume(potId > 0);
        vm.assume(cycleId > 0);
        vm.assume(contribution > 0);
        vm.assume(bidAmount < 1e30);

        mam.registerMember(user);

        mam.updateParticipation(user, potId, cycleId, contribution, false);
        mam.updateBidInfo(user, potId, cycleId, bidAmount, didBid);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user, potId, cycleId);

        assertEq(cp.bidAmount, bidAmount);
        assertEq(cp.didBid, didBid);

        if (didBid) {
            uint256 rep = mam.getReputationScore(user);
            assertEq(rep, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION() + mam.REPUTATION_BID());
        }
    }

    // -------------------------------
    // Fuzz: Winner Marking
    // -------------------------------
    function testFuzz_WinnerMarking(address user, uint256 potId, uint256 cycleId, uint256 contribution) public asAuth {
        vm.assume(user != address(0));
        vm.assume(potId > 0);
        vm.assume(cycleId > 0);
        vm.assume(contribution > 0);

        mam.registerMember(user);

        mam.updateParticipation(user, potId, cycleId, contribution, false);

        mam.markAsWinner(user, potId, cycleId);

        MemberAccountManager.CycleParticipation memory cp = mam.getCycleParticipation(user, potId, cycleId);

        assertTrue(cp.won);

        uint256 rep = mam.getReputationScore(user);
        assertEq(rep, mam.INITIAL_REPUTATION() + mam.REPUTATION_PARTICIPATION() + mam.REPUTATION_WIN());
    }

    // -------------------------------
    // Fuzz: Winner double-mark revert
    // -------------------------------
    function testFuzz_WinnerDoubleMark(address user, uint256 potId, uint256 cycleId, uint256 contribution)
        public
        asAuth
    {
        vm.assume(user != address(0));
        vm.assume(potId > 0);
        vm.assume(cycleId > 0);
        vm.assume(contribution > 0);

        mam.registerMember(user);

        mam.updateParticipation(user, potId, cycleId, contribution, false);
        mam.markAsWinner(user, potId, cycleId);

        vm.expectRevert(abi.encodeWithSelector(MemberAccountManager.AlreadyMarkedWinner.selector, potId, cycleId));
        mam.markAsWinner(user, potId, cycleId);
    }

    // -------------------------------Misc
    function testGetPotCyclesAndProfilePots() public asAuth {
        reg(user1);

        mam.updateParticipation(user1, 100, 1, 5, false);
        mam.updateParticipation(user1, 100, 2, 6, false);
        mam.updateParticipation(user1, 101, 1, 7, true); // creator

        uint256[] memory cycles100 = mam.getPotCycles(user1, 100);
        assertEq(cycles100.length, 2);

        (,,,, uint256 rep,,, uint256[] memory created, uint256[] memory joined) = mam.getMemberProfile(user1);

        // created should contain 101, joined contain 100
        assertEq(created.length, 1);
        assertEq(created[0], 101);
        assertEq(joined.length, 1);
        assertEq(joined[0], 100);

        // getWinRate for user with participation but no wins = 0
        assertEq(mam.getWinRate(user1), 0);
    }

    function testGetTopMembersOrderingAndCount() public asAuth {
        // register three users and give them different reputation by different actions
        reg(user1);
        reg(user2);
        reg(user3);

        // user1: 1 participation + 1 bid + 1 win => heavy reputation
        mam.updateParticipation(user1, 200, 1, 10, false);
        mam.updateBidInfo(user1, 200, 1, 5, true);
        mam.markAsWinner(user1, 200, 1);

        // user2: 1 participation
        mam.updateParticipation(user2, 201, 1, 10, false);

        // user3: 1 participation + bid
        mam.updateParticipation(user3, 202, 1, 10, false);
        mam.updateBidInfo(user3, 202, 1, 3, true);

        // fetch top 2
        (address[] memory top2, uint256[] memory scores) = mam.getTopMembers(2);
        assertEq(top2.length, 2);
        // top member should be user1
        assertEq(top2[0], user1);
        assertTrue(scores[0] >= scores[1]);

        // request more than total -> should return all members
        (address[] memory topAll,) = mam.getTopMembers(10);
        assertEq(topAll.length, 3);
    }

    // Multi-user cross testing
    function testMultipleUsersSamePotIndependentState() public asAuth {
        reg(user1);
        reg(user2);

        // both join pot 300 and participate in different cycles
        mam.updateParticipation(user1, 300, 1, 10, false);
        mam.updateParticipation(user2, 300, 1, 50, false);

        // bids separate
        mam.updateBidInfo(user1, 300, 1, 4, true);
        mam.updateBidInfo(user2, 300, 1, 8, true);

        // mark winner for user2 only
        mam.markAsWinner(user2, 300, 1);

        MemberAccountManager.CycleParticipation memory cp1 = mam.getCycleParticipation(user1, 300, 1);
        MemberAccountManager.CycleParticipation memory cp2 = mam.getCycleParticipation(user2, 300, 1);

        assertFalse(cp1.won);
        assertTrue(cp2.won);

        // reputations independent
        uint256 rep1 = mam.getReputationScore(user1);
        uint256 rep2 = mam.getReputationScore(user2);
        assertTrue(rep2 > rep1);
    }

    // ---------- Stress-like / Larger sets ----------
    function testManyPotsAndCyclesHandlesEnumerableSet() public asAuth {
        reg(user1);

        // add 15 pots, each with 3 cycles
        for (uint256 p = 1; p <= 15; p++) {
            for (uint256 c = 1; c <= 3; c++) {
                mam.updateParticipation(user1, p, c, p * c, false);
            }
        }

        // total pots joined should be 15
        (, uint256 totalCyclesParticipated,,,,,, uint256[] memory created, uint256[] memory joined) =
            mam.getMemberProfile(user1);
        assertEq(joined.length, 15);
        // total cycles = 15 * 3
        assertEq(totalCyclesParticipated, 15 * 3);

        // topMembers should include this user if requested
        (address[] memory tops, uint256[] memory scs) = mam.getTopMembers(1);
        // since only user1 registered, it must be returned
        assertEq(tops[0], user1);
    }
}
