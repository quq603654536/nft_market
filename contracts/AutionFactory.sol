// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Aution.sol";
import "./interfaces/IAutionFactory.sol";

//拍卖市场
// 1. 拍卖市场可以创建拍卖
contract AutionFactory is IAutionFactory {
    //所有的拍卖
    address[] public autions;
    address private marketOwner;

    event AutionCreated(address indexed autionAddress);

    constructor() {
        marketOwner = msg.sender;
    }

    //创建拍卖
    function createAution(
        address _nftContract,
        uint256 _nftTokenId,
        uint256 _startingPrice,
        uint256 _duraion
    ) public returns (address) {
        Aution aution = new Aution();

        //将NFT转让给拍卖合约
        IERC721 nftContrac = IERC721(_nftContract);
        nftContrac.safeTransferFrom(msg.sender, address(aution), _nftTokenId);

        aution.initialize(
            msg.sender,
            _nftContract,
            _nftTokenId,
            _startingPrice,
            block.timestamp,
            _duraion
        );

        address autionAddress = address(aution);

        autions.push(autionAddress);

        emit AutionCreated(autionAddress);

        return autionAddress;
    }

    // 正在拍卖的NFT数量
    function getAutionCount() public view returns (uint256) {
        return autions.length;
    }

    // 某个拍卖结束
    function autionEnd(address autionAddress) external override {
        for (uint256 i = 0; i < autions.length; i++) {
            if (autions[i] == autionAddress) {
                autions[i] = autions[autions.length - 1];
                autions.pop();
                break;
            }
        }
    }
}
