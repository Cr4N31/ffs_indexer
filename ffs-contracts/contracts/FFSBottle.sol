// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FFSBottle is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable ffsToken;

    address public constant TREASURY_WALLET = 0x75d04bcA6B542Fe1f3EeE8196DEB2C2675dAABcb;
    uint256 public constant POUR_AMOUNT = 1_000 ether;
    uint256 public constant MIN_THRESHOLD = 50_000 ether;
    uint256 public constant MAX_THRESHOLD = 300_000 ether;
    uint256 public constant TREASURY_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public currentRound;
    uint256 public roundPours;
    uint256 public totalPours;
    uint256 public totalSips;
    bool public roundActive;

    uint256 internal secretThreshold;

    event RoundStarted(uint256 indexed round);
    event Poured(
        uint256 indexed round,
        address indexed user,
        uint256 ffsAmount,
        uint256 bottleBalance,
        uint256 roundPours
    );
    event BottleSipped(
        uint256 indexed round,
        address indexed winner,
        uint256 bottleBalance,
        uint256 winnerAmount,
        uint256 treasuryAmount
    );

    error RoundNotActive();
    error InvalidTokenAddress();

    constructor(IERC20 token_, address admin_) Ownable(admin_) {
        if (address(token_) == address(0)) revert InvalidTokenAddress();
        ffsToken = token_;
        _startRound();
    }

    /// @notice Pour 1,000 FFS into the bottle. Caller must approve POUR_AMOUNT first.
    function pour() external nonReentrant {
        if (!roundActive) revert RoundNotActive();

        ffsToken.safeTransferFrom(msg.sender, address(this), POUR_AMOUNT);

        uint256 balance = bottleBalance();
        roundPours += 1;
        totalPours += 1;

        emit Poured(currentRound, msg.sender, POUR_AMOUNT, balance, roundPours);

        if (balance >= secretThreshold) {
            _sip(msg.sender, balance);
        }
    }

    function bottleBalance() public view returns (uint256) {
        return ffsToken.balanceOf(address(this));
    }

    function fillPercent() external view returns (uint256) {
        uint256 balance = bottleBalance();
        if (balance >= MAX_THRESHOLD) return 100;
        return (balance * 100) / MAX_THRESHOLD;
    }

    function _sip(address winner, uint256 balance) internal {
        uint256 treasuryAmount = (balance * TREASURY_BPS) / BPS_DENOMINATOR;
        uint256 winnerAmount = balance - treasuryAmount;
        uint256 sippedRound = currentRound;

        totalSips += 1;
        roundActive = false;
        roundPours = 0;

        ffsToken.safeTransfer(winner, winnerAmount);
        ffsToken.safeTransfer(TREASURY_WALLET, treasuryAmount);

        emit BottleSipped(sippedRound, winner, balance, winnerAmount, treasuryAmount);

        _startRound();
    }

    function _startRound() internal {
        currentRound += 1;
        roundActive = true;
        secretThreshold = _pickSecretThreshold();

        emit RoundStarted(currentRound);
    }

    function _pickSecretThreshold() internal view virtual returns (uint256) {
        uint256 span = MAX_THRESHOLD - MIN_THRESHOLD + 1;
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    block.number,
                    currentRound,
                    address(this)
                )
            )
        );
        return MIN_THRESHOLD + (random % span);
    }
}
