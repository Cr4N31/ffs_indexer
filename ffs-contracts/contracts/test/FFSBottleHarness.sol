// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FFSBottle} from "../FFSBottle.sol";

contract FFSBottleHarness is FFSBottle {
    uint256 private forcedThreshold;

    constructor(IERC20 token, address admin) FFSBottle(token, admin) {}

    function setForcedThreshold(uint256 threshold) external onlyOwner {
        forcedThreshold = threshold;
        secretThreshold = threshold;
    }

    function exposedSecretThreshold() external view returns (uint256) {
        return secretThreshold;
    }

    function _pickSecretThreshold() internal view override returns (uint256) {
        if (forcedThreshold != 0) return forcedThreshold;
        return super._pickSecretThreshold();
    }
}
