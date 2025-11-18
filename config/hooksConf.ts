import { Address } from "viem";

// -------------------------
// 🔹 CONTRACT ADDRESSES
// -------------------------
export const CONTRACT_ADDRESSES = {
    memberAccountManager:
    "0xcf8490422C21F1392BEA53C4dc5ce939ce0169d1" as Address,
    auctionEngine: "0x43C3F0Ad0c66A94a3b311F62b0254E9aDf46C735" as Address,
    lottery: "0x42D6bf04129da6Cf84BCF13FcC810f698D1211d0" as Address,
    escrow: "0x5121810C9213762F55fE22fd87FA117f2c41567D" as Address,
    compoundV3Integrator: "0x1Fb760c83C2612802B79c35b06596f6D7681e92a" as Address,
    usdc_token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e" as Address,
    
};

// -------------------------
// 🔹 CONTRACT ABIs
// -------------------------
export const CONTRACT_ABIS = {
    memberAccountManager: [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "AlreadyMarkedWinner",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "AlreadyRegistered",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "CycleNotFound",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidAddress",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "InvalidAmount",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "contribution",
                    "type": "uint256"
                }
            ],
            "name": "InvalidContribution",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "InvalidCycleId",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "InvalidPotId",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "caller",
                    "type": "address"
                }
            ],
            "name": "NotAuthorized",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "OwnableInvalidOwner",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "OwnableUnauthorizedAccount",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "PotNotFound",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "UserNotRegistered",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "caller",
                    "type": "address"
                }
            ],
            "name": "AuthorizedCallerAdded",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "caller",
                    "type": "address"
                }
            ],
            "name": "AuthorizedCallerRemoved",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "bidAmount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "bool",
                    "name": "didBid",
                    "type": "bool"
                }
            ],
            "name": "BidUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "MemberRegistered",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "contribution",
                    "type": "uint256"
                }
            ],
            "name": "ParticipationUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "newScore",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "reason",
                    "type": "string"
                }
            ],
            "name": "ReputationUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "WinnerMarked",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "INITIAL_REPUTATION",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "REPUTATION_BID",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "REPUTATION_PARTICIPATION",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "REPUTATION_WIN",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "caller",
                    "type": "address"
                }
            ],
            "name": "addAuthorizedCaller",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "authorizedCallers",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "getCycleParticipation",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "cycleId",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "contribution",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "bidAmount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bool",
                            "name": "didBid",
                            "type": "bool"
                        },
                        {
                            "internalType": "bool",
                            "name": "won",
                            "type": "bool"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct MemberAccountManager.CycleParticipation",
                    "name": "",
                    "type": "tuple"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getMemberByIndex",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getMemberProfile",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "registered",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "totalCyclesParticipated",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalCyclesWon",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalContribution",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "reputationScore",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "registrationTimestamp",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "lastActivityTimestamp",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256[]",
                    "name": "createdPots",
                    "type": "uint256[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "joinedPots",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "getPotCycles",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getReputationScore",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "count",
                    "type": "uint256"
                }
            ],
            "name": "getTopMembers",
            "outputs": [
                {
                    "internalType": "address[]",
                    "name": "topMembers",
                    "type": "address[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "scores",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getTotalMembers",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getUserStats",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "totalPots",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalCycles",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalWins",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "winRate",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "reputation",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getWinRate",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "isPotCreator",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "isRegistered",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "markAsWinner",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "registerMember",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "caller",
                    "type": "address"
                }
            ],
            "name": "removeAuthorizedCaller",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "bidAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "didBid",
                    "type": "bool"
                }
            ],
            "name": "updateBidInfo",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "contribution",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "isCreator",
                    "type": "bool"
                }
            ],
            "name": "updateParticipation",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ] as const,
    auctionEngine: [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_usdc",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_memberManager",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_lotteryEngine",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_escrow",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "AllCyclesCompleted",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "AlreadyCompleted",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "AlreadyJoined",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "AlreadyPaidForCycle",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "BidDeadlinePassed",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "BiddingAlreadyClosed",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "BiddingNotClosed",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "CannotLeaveAfterStarted",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "CreatorCannotLeave",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "CycleNotActive",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "CycleNotEnded",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "EmptyName",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "EnforcedPause",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "ExpectedPause",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "FundsAlreadyReleased",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "IncorrectPayment",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InsufficientBalance",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidAmount",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidBidAmount",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidBidDeadline",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidCycle",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidCycleCount",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidCycleDuration",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidMemberLimits",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidPot",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidUSDCAddress",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotAMember",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotEnoughMembers",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotPaidForCycle",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotPotCreator",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotRegistered",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "OwnableInvalidOwner",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "OwnableUnauthorizedAccount",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "PotAlreadyStarted",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "PotDoesNotExist",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "PotFull",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "PotNotActive",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "ReentrancyGuardReentrantCall",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                }
            ],
            "name": "SafeERC20FailedOperation",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "TooEarlyToClose",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "TooManyMembers",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "WinnerNotDeclared",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "bidder",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "BidPlaced",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "bidder",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "BidRefunded",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "BiddingClosed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "CycleCompleted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "startTime",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "endTime",
                    "type": "uint256"
                }
            ],
            "name": "CycleStarted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "totalInterest",
                    "type": "uint256"
                }
            ],
            "name": "InterestDistributed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "JoinedPot",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "LeftPot",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "member",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "MemberPaidForCycle",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "Paused",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "creator",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amountPerCycle",
                    "type": "uint256"
                }
            ],
            "name": "PotCreated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "enum AuctionEngine.PotStatus",
                    "name": "status",
                    "type": "uint8"
                }
            ],
            "name": "PotStatusChanged",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "Unpaused",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "WinnerDeclared",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "MAX_CYCLE_DURATION",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "MAX_MEMBERS",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "MIN_BID_DEADLINE",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "MIN_CYCLE_DURATION",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "USDC",
            "outputs": [
                {
                    "internalType": "contract IERC20",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "USDC_DECIMALS",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "chainPots",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "internalType": "address",
                    "name": "creator",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amountPerCycle",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleDuration",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleCount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "completedCycles",
                    "type": "uint256"
                },
                {
                    "internalType": "enum AuctionEngine.CycleFrequency",
                    "name": "frequency",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "bidDepositDeadline",
                    "type": "uint256"
                },
                {
                    "internalType": "enum AuctionEngine.PotStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "createdAt",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "minMembers",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "maxMembers",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "closeBidding",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "completeCycle",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "amountPerCycle",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleDuration",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleCount",
                    "type": "uint256"
                },
                {
                    "internalType": "enum AuctionEngine.CycleFrequency",
                    "name": "frequency",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "bidDepositDeadline",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "minMembers",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "maxMembers",
                    "type": "uint256"
                }
            ],
            "name": "createPot",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "cycleCounter",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "declareWinner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                }
            ],
            "name": "emergencyWithdrawUSDC",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "escrow",
            "outputs": [
                {
                    "internalType": "contract Escrow",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getCurrentCycleCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getCurrentPotCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "getCycleInfo",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "startTime",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "endTime",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "winningBid",
                    "type": "uint256"
                },
                {
                    "internalType": "enum AuctionEngine.CycleStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "bidderCount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalCollected",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "getPotInfo",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "internalType": "address",
                    "name": "creator",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amountPerCycle",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleDuration",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "cycleCount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "completedCycles",
                    "type": "uint256"
                },
                {
                    "internalType": "enum AuctionEngine.CycleFrequency",
                    "name": "frequency",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "bidDepositDeadline",
                    "type": "uint256"
                },
                {
                    "internalType": "enum AuctionEngine.PotStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "address[]",
                    "name": "members",
                    "type": "address[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "cycleIds",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "getPotMemberCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getUserBid",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "getUserPots",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "hasJoinedPot",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "member",
                    "type": "address"
                }
            ],
            "name": "hasMemberPaidForCycle",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "hasPaidForCycle",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                }
            ],
            "name": "isPotMember",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "joinPot",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "leavePot",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "lotteryEngine",
            "outputs": [
                {
                    "internalType": "contract LotteryEngine",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "memberManager",
            "outputs": [
                {
                    "internalType": "contract MemberAccountManager",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "pause",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "pausePot",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "paused",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                }
            ],
            "name": "payForCycle",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "cycleId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "bidAmount",
                    "type": "uint256"
                }
            ],
            "name": "placeBid",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "potCounter",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "preApproveEscrow",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "resumePot",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "potId",
                    "type": "uint256"
                }
            ],
            "name": "startCycle",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "unpause",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "userPots",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ] as const ,
};

// -------------------------
// 🔹 EXPORT DEFAULT CONFIG
// -------------------------
export const CONTRACT_CONFIG = {
  addresses: CONTRACT_ADDRESSES,
  abis: CONTRACT_ABIS,
};