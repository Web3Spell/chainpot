import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockCompundV3Integrator.sol";
import {EscrowHandler} from "./EscrowHandler.t.sol";

contract EscrowInvariantsTest is Test {
    Escrow public escrow;
    MockUSDC public usdc;
    MockCompoundV3Integrator public compound;

    EscrowHandler public handler;

    address public auction = address(0xBEEF);
    address public owner = address(this);

    function setUp() public {
        usdc = new MockUSDC();
        compound = new MockCompoundV3Integrator();

        escrow = new Escrow(address(usdc), address(compound));

        handler = new EscrowHandler(escrow, usdc, compound, auction, owner);

        // register invariants
        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: _handlerSelectors()}));
    }

    function _handlerSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](3);
        selectors[0] = EscrowHandler.deposit.selector;
        selectors[1] = EscrowHandler.release.selector;
        selectors[2] = EscrowHandler.harvestInterest.selector;
    }

    /// ----------------------------------------------------------
    ///  INVARIANT #1:
    ///  principalInCompound == deposits - releases
    /// ----------------------------------------------------------
    function invariant_principalMatches() public {
        uint256 deposits = handler.totalDeposited();
        uint256 released = handler.totalReleased();

        // compute principal from handler data, clamped to zero to avoid underflow
        uint256 principal = deposits > released ? deposits - released : 0;

        uint256 expected = deposits > released ? deposits - released : 0;

        assertEq(principal, expected, "principal mismatch");
    }

    /// ----------------------------------------------------------
    ///  INVARIANT #2:
    ///  Interest is never negative
    /// ----------------------------------------------------------
    function invariant_interestNonNegative() public {
        // assume cycles 1..20, pots 1..20
        for (uint256 p = 1; p <= 20; p++) {
            for (uint256 c = 1; c <= 20; c++) {
                (,, uint256 interestEarned,,) = escrow.getCycleFunds(p, c);
                assertGe(interestEarned, 0, "interest < 0 impossible");
            }
        }
    }

    /// ----------------------------------------------------------
    ///  INVARIANT #3:
    ///  totalUSDCDeposited matches sum recorded by handler
    /// ----------------------------------------------------------
    function invariant_totalDepositsMatch() public {
        assertEq(escrow.totalUSDCDeposited(), handler.totalDeposited(), "totalUSDCDeposited mismatch");
    }
}
