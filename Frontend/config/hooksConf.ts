import { Address } from "viem";

// =============================================================================
// ChainPot v3 — Base Sepolia (chainId 84532)
//
// Active deployment matching smart-contracts/v3/. See smart-contracts/v3/DEPLOYMENT.md
// for the audit-fix coverage matrix and AUDIT_REPORT_v3.md for the underlying findings.
//
// IMPORTANT v3 behavior changes that the frontend must respect:
//   * USDC approval target for cycle payments is now Escrow (not AuctionEngine).
//   * `registerMember(address)` requires address == msg.sender.
//   * `hasPaidForCycle` is keyed (cycleId, member), not (potId, member).
//   * Removed in v3: hasMemberPaidForCycle, USDC_DECIMALS, getUserStats, getWinRate,
//     getTopMembers, previewRandomWinner, compoundInterest.
//   * Added in v3: harvestRemainder, distributeRemainderTo, cancelStuckVRFCycle.
// =============================================================================

export const CONTRACT_ADDRESSES = {
    memberAccountManager: "0x570B34fd586ef4FeFD9884F3b8D47555D4990De3" as Address,
    auctionEngine: "0x904214aDEd4A24c5a6Fd918908CcC07Ab8CF455B" as Address,
    lottery: "0x17313EA008bA8FC7Ceb58D64C6cE549b723c0A0c" as Address,
    escrow: "0x47a90F4df79afF2fe837B532c84742d83F4B2ca7" as Address,
    compoundV3Integrator: "0xcCfb46105d72eAD3a771687D7499cA1737075B0a" as Address,
    usdc_token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e" as Address,
};

export const CONTRACT_ABIS = {
    memberAccountManager:     [
        {
            "type": "constructor",
            "inputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "INITIAL_REPUTATION",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "REPUTATION_BID",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "REPUTATION_DEFAULT_PENALTY",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "REPUTATION_PARTICIPATION",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "REPUTATION_WIN",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "addAuthorizedCaller",
            "inputs": [
                {
                    "name": "caller",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "authorizedCallers",
            "inputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCycleParticipation",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple",
                    "internalType": "struct MemberAccountManagerV3.CycleParticipation",
                    "components": [
                        {
                            "name": "cycleId",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "contribution",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "bidAmount",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "didBid",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "won",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "timestamp",
                            "type": "uint256",
                            "internalType": "uint256"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getMemberByIndex",
            "inputs": [
                {
                    "name": "index",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getMemberProfile",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "registered",
                    "type": "bool",
                    "internalType": "bool"
                },
                {
                    "name": "totalCyclesParticipated",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "totalCyclesWon",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "totalContribution",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "reputationScore",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "registrationTimestamp",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "lastActivityTimestamp",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "createdPots",
                    "type": "uint256[]",
                    "internalType": "uint256[]"
                },
                {
                    "name": "joinedPots",
                    "type": "uint256[]",
                    "internalType": "uint256[]"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPotCycles",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256[]",
                    "internalType": "uint256[]"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getReputationScore",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getTotalMembers",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "isPotCreator",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "isRegistered",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "markAsDefaulter",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "markAsWinner",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "registerMember",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "registerMember",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "removeAuthorizedCaller",
            "inputs": [
                {
                    "name": "caller",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "removeFromPot",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "updateBidInfo",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "bidAmount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "didBid",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "updateParticipation",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "contribution",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "isCreator",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "AuthorizedCallerAdded",
            "inputs": [
                {
                    "name": "caller",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "AuthorizedCallerRemoved",
            "inputs": [
                {
                    "name": "caller",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "BidUpdated",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "bidAmount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "didBid",
                    "type": "bool",
                    "indexed": false,
                    "internalType": "bool"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "MemberDefaulted",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "MemberLeftPot",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "MemberRegistered",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "timestamp",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "ParticipationUpdated",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "contribution",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "ReputationUpdated",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newScore",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "reason",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "WinnerMarked",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "AlreadyMarkedWinner",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "AlreadyRegistered",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "CycleNotFound",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "InvalidAddress",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycleId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidPotId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotAuthorized",
            "inputs": [
                {
                    "name": "caller",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "PotNotFound",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "SelfRegistrationOnly",
            "inputs": []
        },
        {
            "type": "error",
            "name": "UserNotRegistered",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        }
    ] as const,
    auctionEngine:     [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_usdc",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_memberManager",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_lotteryEngine",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_escrow",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "CREATOR_GRACE_PERIOD",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MAX_CYCLE_DURATION",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MAX_MEMBERS",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MAX_NAME_LENGTH",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MIN_BID_DEADLINE",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MIN_CYCLE_DURATION",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "USDC",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract IERC20"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "VRF_TIMEOUT",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "cancelStuckVRFCycle",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "chainPots",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "name",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "creator",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amountPerCycle",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleDuration",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleCount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "completedCycles",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "frequency",
                    "type": "uint8",
                    "internalType": "enum AuctionEngineV3.CycleFrequency"
                },
                {
                    "name": "bidDepositDeadline",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "status",
                    "type": "uint8",
                    "internalType": "enum AuctionEngineV3.PotStatus"
                },
                {
                    "name": "createdAt",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "minMembers",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "maxMembers",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "checkAndSetVRFWinner",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "closeBidding",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "completeCycle",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "createPot",
            "inputs": [
                {
                    "name": "name",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "amountPerCycle",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleDuration",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleCount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "frequency",
                    "type": "uint8",
                    "internalType": "enum AuctionEngineV3.CycleFrequency"
                },
                {
                    "name": "bidDepositDeadline",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "minMembers",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "maxMembers",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "cycleCounter",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "declareWinner",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "winner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "escrow",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract EscrowV3"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "fulfillRandomWinner",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "winner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "getCurrentCycleCount",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCurrentPotCount",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCycleInfo",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "startTime",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "endTime",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "winner",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "winningBid",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "status",
                    "type": "uint8",
                    "internalType": "enum AuctionEngineV3.CycleStatus"
                },
                {
                    "name": "bidderCount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "totalCollected",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPotInfo",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "name",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "creator",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amountPerCycle",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleDuration",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleCount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "completedCycles",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "frequency",
                    "type": "uint8",
                    "internalType": "enum AuctionEngineV3.CycleFrequency"
                },
                {
                    "name": "bidDepositDeadline",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "status",
                    "type": "uint8",
                    "internalType": "enum AuctionEngineV3.PotStatus"
                },
                {
                    "name": "members",
                    "type": "address[]",
                    "internalType": "address[]"
                },
                {
                    "name": "cycleIds",
                    "type": "uint256[]",
                    "internalType": "uint256[]"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPotMemberCount",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getUserBid",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getUserPots",
            "inputs": [
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256[]",
                    "internalType": "uint256[]"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "hasJoinedPot",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "hasPaidForCycle",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "isPotMember",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "user",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "joinPot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "leavePot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "lotteryEngine",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract LotteryEngineV3"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "memberManager",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract MemberAccountManagerV3"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "pause",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "pausePot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "paused",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "payForCycle",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "placeBid",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "bidAmount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "potCounter",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "requestIdToCycle",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "resumePot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "startCycle",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "unpause",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "userPots",
            "inputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "event",
            "name": "BidPlaced",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "bidder",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "BiddingClosed",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "timestamp",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CycleCancelled",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CycleCompleted",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CycleStarted",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "startTime",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "endTime",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "DiscountAndInterestDistributed",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "totalDistributed",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "perMember",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "remainder",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "JoinedPot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "LeftPot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "user",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "MemberPaidForCycle",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "member",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Paused",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "PotCreated",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "name",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                },
                {
                    "name": "creator",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amountPerCycle",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "PotStatusChanged",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "status",
                    "type": "uint8",
                    "indexed": false,
                    "internalType": "enum AuctionEngineV3.PotStatus"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Unpaused",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "VRFRequested",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "requestId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "WinnerDeclared",
            "inputs": [
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "winner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "AllCyclesCompleted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "AlreadyCompleted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "AlreadyJoined",
            "inputs": []
        },
        {
            "type": "error",
            "name": "AlreadyPaidForCycle",
            "inputs": []
        },
        {
            "type": "error",
            "name": "BidDeadlinePassed",
            "inputs": []
        },
        {
            "type": "error",
            "name": "BiddingNotClosed",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CannotLeaveAfterStarted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CreatorCannotLeave",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CycleNotActive",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CycleNotEnded",
            "inputs": []
        },
        {
            "type": "error",
            "name": "EmptyName",
            "inputs": []
        },
        {
            "type": "error",
            "name": "EnforcedPause",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ExpectedPause",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidAddress",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidAmount",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidBidAmount",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidBidDeadline",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycle",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycleCount",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycleDuration",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycleStatus",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidMemberLimits",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidPot",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NameTooLong",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotAMember",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotAuthorizedOrTooEarly",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotEnoughMembers",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotLotteryEngine",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotMemberOrCreator",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotPaidForCycle",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotPotCreator",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotRegistered",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "PotAlreadyStarted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "PotDoesNotExist",
            "inputs": []
        },
        {
            "type": "error",
            "name": "PotFull",
            "inputs": []
        },
        {
            "type": "error",
            "name": "PotNotActive",
            "inputs": []
        },
        {
            "type": "error",
            "name": "PreviousCycleNotComplete",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ReentrancyGuardReentrantCall",
            "inputs": []
        },
        {
            "type": "error",
            "name": "TooEarlyToClose",
            "inputs": []
        },
        {
            "type": "error",
            "name": "TooManyMembers",
            "inputs": []
        },
        {
            "type": "error",
            "name": "VRFRequestNotFound",
            "inputs": []
        },
        {
            "type": "error",
            "name": "VRFTimeoutNotReached",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WinnerAlreadySet",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WinnerNotDeclared",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WinnerNotPotMember",
            "inputs": []
        }
    ] as const,
    lottery:     [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_vrfCoordinator",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_subscriptionId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_keyHash",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "MAX_PARTICIPANTS",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "NUM_WORDS",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint32",
                    "internalType": "uint32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "acceptOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "authorizedRequesters",
            "inputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "callbackGasLimit",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint32",
                    "internalType": "uint32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getRequest",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "participants",
                    "type": "address[]",
                    "internalType": "address[]"
                },
                {
                    "name": "requester",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "fulfilled",
                    "type": "bool",
                    "internalType": "bool"
                },
                {
                    "name": "randomWord",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getWinner",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "isRequestFulfilled",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "keyHash",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "rawFulfillRandomWords",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "randomWords",
                    "type": "uint256[]",
                    "internalType": "uint256[]"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "requestConfirmations",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint16",
                    "internalType": "uint16"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "requestRandomWinner",
            "inputs": [
                {
                    "name": "participants",
                    "type": "address[]",
                    "internalType": "address[]"
                }
            ],
            "outputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "requests",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "requester",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "fulfilled",
                    "type": "bool",
                    "internalType": "bool"
                },
                {
                    "name": "randomWord",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "s_vrfCoordinator",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract IVRFCoordinatorV2Plus"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "setAuthorizedRequester",
            "inputs": [
                {
                    "name": "requester",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "authorized",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setCoordinator",
            "inputs": [
                {
                    "name": "_vrfCoordinator",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setVRFConfig",
            "inputs": [
                {
                    "name": "_subscriptionId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_keyHash",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                {
                    "name": "_callbackGasLimit",
                    "type": "uint32",
                    "internalType": "uint32"
                },
                {
                    "name": "_requestConfirmations",
                    "type": "uint16",
                    "internalType": "uint16"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "subscriptionId",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "to",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "winners",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "event",
            "name": "AuthorizedRequesterUpdated",
            "inputs": [
                {
                    "name": "requester",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "authorized",
                    "type": "bool",
                    "indexed": false,
                    "internalType": "bool"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CallbackFailed",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "requester",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CoordinatorSet",
            "inputs": [
                {
                    "name": "vrfCoordinator",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferRequested",
            "inputs": [
                {
                    "name": "from",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "to",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "from",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "to",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "RandomWinnerRequested",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "requester",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "numParticipants",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "RandomWinnerSelected",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "winner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "randomWord",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "VRFConfigUpdated",
            "inputs": [
                {
                    "name": "subscriptionId",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "keyHash",
                    "type": "bytes32",
                    "indexed": false,
                    "internalType": "bytes32"
                },
                {
                    "name": "callbackGasLimit",
                    "type": "uint32",
                    "indexed": false,
                    "internalType": "uint32"
                },
                {
                    "name": "requestConfirmations",
                    "type": "uint16",
                    "indexed": false,
                    "internalType": "uint16"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "AlreadyFulfilled",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "InvalidAddress",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidKeyHash",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidSubscriptionId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NoParticipants",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotFulfilled",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "OnlyCoordinatorCanFulfill",
            "inputs": [
                {
                    "name": "have",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "want",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OnlyOwnerOrCoordinator",
            "inputs": [
                {
                    "name": "have",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "coordinator",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "RequestNotFound",
            "inputs": [
                {
                    "name": "requestId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "TooManyParticipants",
            "inputs": []
        },
        {
            "type": "error",
            "name": "UnauthorizedRequester",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ZeroAddress",
            "inputs": []
        }
    ] as const,
    escrow:     [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_usdc",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_compoundIntegrator",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "USDC",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract IERC20"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "auctionEngine",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "compoundIntegrator",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract CompoundIntegratorV3"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "depositFromMember",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "member",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "distributeRemainderTo",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "recipient",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "emergencyWithdrawUSDC",
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "to",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "getCycleFunds",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "totalDeposited",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "winnerPaid",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "remainderHarvested",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "remainderDistributed",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleCompleted",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCycleInterestEstimate",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getMemberContribution",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "member",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPotFunds",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "totalDeposited",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "totalWithdrawn",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "harvestRemainder",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "markCycleCompleted",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "pause",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "paused",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "releaseFundsToWinner",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "winner",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setAuctionEngine",
            "inputs": [
                {
                    "name": "_auctionEngine",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setCompoundIntegrator",
            "inputs": [
                {
                    "name": "_compoundIntegrator",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "totalUSDCDeposited",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "totalUSDCWithdrawn",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "unpause",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "AuctionEngineUpdated",
            "inputs": [
                {
                    "name": "oldEngine",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newEngine",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CompoundIntegratorUpdated",
            "inputs": [
                {
                    "name": "oldIntegrator",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newIntegrator",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "CycleCompleted",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Deposited",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "member",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "EmergencyWithdrawal",
            "inputs": [
                {
                    "name": "to",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Paused",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "RemainderDistributed",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "recipient",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "RemainderHarvested",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Unpaused",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "WinnerPaid",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "winner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "AddressEmptyCode",
            "inputs": [
                {
                    "name": "target",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "AddressInsufficientBalance",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "AmountExceedsBalance",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CycleAlreadyCompleted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "EnforcedPause",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ExpectedPause",
            "inputs": []
        },
        {
            "type": "error",
            "name": "FailedInnerCall",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InsufficientCycleBalance",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InsufficientRemainder",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidAddress",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidAmount",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycleId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidPotId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "ReentrancyGuardReentrantCall",
            "inputs": []
        },
        {
            "type": "error",
            "name": "RemainderNotHarvested",
            "inputs": []
        },
        {
            "type": "error",
            "name": "SafeERC20FailedOperation",
            "inputs": [
                {
                    "name": "token",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "UnauthorizedCaller",
            "inputs": []
        }
    ] as const,
    compoundV3Integrator:     [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_comet",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_usdc",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "COMET",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract IComet"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "USDC",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract IERC20"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "claimComp",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "cometRewards",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract ICometRewards"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "convertToAssets",
            "inputs": [
                {
                    "name": "shares",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "convertToShares",
            "inputs": [
                {
                    "name": "assets",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "emergencyWithdrawAll",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "emergencyWithdrawUSDC",
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "escrow",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCompoundUSDCBalance",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCurrentSupplyAPY1e18",
            "inputs": [],
            "outputs": [
                {
                    "name": "apy1e18",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCycleDeposit",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "shares",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "principalDeposited",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "withdrawnPrincipal",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "withdrawnInterest",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "timestamp",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "active",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCycleInterest",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getCycleValue",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPotStats",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "totalSharesPot",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "totalPrincipalPot",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "lastUpdateTime",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "pause",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "paused",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "rescueTokens",
            "inputs": [
                {
                    "name": "token",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setCometRewards",
            "inputs": [
                {
                    "name": "_rewards",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setEscrow",
            "inputs": [
                {
                    "name": "_escrow",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "supplyUSDCForPot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "totalAssets",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "totalPrincipal",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "totalShares",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "unpause",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "withdrawCycleRemainder",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "remainderAmount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "withdrawUSDCForPot",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "CometRewardsUpdated",
            "inputs": [
                {
                    "name": "newRewards",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "EmergencyWithdrawal",
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "recipient",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "EscrowUpdated",
            "inputs": [
                {
                    "name": "newEscrow",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Paused",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "RewardsClaimed",
            "inputs": [
                {
                    "name": "to",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "SuppliedToCompound",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "sharesMinted",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Unpaused",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "indexed": false,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "WithdrawnInterest",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "sharesBurned",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "WithdrawnPrincipal",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "sharesBurned",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "WithdrawnRemainder",
            "inputs": [
                {
                    "name": "potId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "cycleId",
                    "type": "uint256",
                    "indexed": true,
                    "internalType": "uint256"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "sharesBurned",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "AddressEmptyCode",
            "inputs": [
                {
                    "name": "target",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "AddressInsufficientBalance",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "CannotRescueBaseAsset",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CometSupplyFailed",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CometWithdrawFailed",
            "inputs": []
        },
        {
            "type": "error",
            "name": "CycleNotActive",
            "inputs": []
        },
        {
            "type": "error",
            "name": "EnforcedPause",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ExpectedPause",
            "inputs": []
        },
        {
            "type": "error",
            "name": "FailedInnerCall",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InsufficientCycleValue",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidAddress",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidAmount",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidCycleId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InvalidPotId",
            "inputs": []
        },
        {
            "type": "error",
            "name": "NotAuthorized",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "ReentrancyGuardReentrantCall",
            "inputs": []
        },
        {
            "type": "error",
            "name": "SafeERC20FailedOperation",
            "inputs": [
                {
                    "name": "token",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        }
    ] as const,
} as const;

export const CONTRACT_CONFIG = {
    addresses: CONTRACT_ADDRESSES,
    abis: CONTRACT_ABIS,
};
