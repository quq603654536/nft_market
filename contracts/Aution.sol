// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAutionFactory.sol";

// 拍卖合约
// 支持货币 ETH USDT
contract Aution is ReentrancyGuard {
    // 拍卖市场地址
    address public factory;
    // NFT拍卖发起人地址
    address public seller;
    // NFT合约地址
    address public nftContract;
    // NFT TokenId
    uint256 public nftTokenId;
    // 开始时间
    uint256 public startTime;
    // 结束时间
    uint256 public endTime;
    // 起拍价
    uint256 public startPrice;
    // 当前最高出价
    uint256 public highestBid;
    // 当前最高出价者
    address public highestBidder;

    bool public isEnd;

    //出价记录
    mapping(address => uint256) public bidsData;

    modifier onlyMarket() {
        require(msg.sender == factory, "Only market can call this function");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }

    modifier timeToBid() {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Aution not start or end"
        );
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor() {
        factory = msg.sender;
    }

    // 初始化拍卖
    function initialize(
        address _seller,
        address _nftContract,
        uint256 _nftTokenId,
        uint256 _startPrice,
        uint256 _startTime,
        uint256 _duration
    ) external onlyMarket {
        seller = _seller;
        nftContract = _nftContract;
        nftTokenId = _nftTokenId;
        startPrice = _startPrice;
        startTime = _startTime;
        endTime = _startTime + _duration;
    }

    // 拍卖出价
    function placeBid() external payable nonReentrant timeToBid {
        //判断出价是否大于当前最高出价
        require(
            msg.value > highestBid && msg.value >= startPrice,
            "Bid not high enough"
        );
        require(!isEnd, "Aution has end");
        // 如果有最高出价者，将最高出价退回
        if (highestBidder != address(0)) {
            payable(highestBidder).transfer(highestBid);
        }

        // 更新最高出价者和最高出价
        highestBidder = msg.sender;
        highestBid = msg.value;

        // 更新出价记录
        bidsData[msg.sender] = msg.value;
    }

    // 取消拍卖
    function cancelAution() external onlySeller timeToBid {
        isEnd = true;
        // 将 NFT 转让给发起人
        IERC721(nftContract).transferFrom(address(this), seller, nftTokenId);

        // 退还最高出价
        if (highestBidder != address(0)) {
            payable(highestBidder).transfer(highestBid);
        }

        IAutionFactory(factory).autionEnd(address(this));
    }

    function endAution() external onlySeller timeToBid {
        require(!isEnd, "Aution has end");
        isEnd = true;

        // 如果有最高出价者，将 NFT 转让给最高出价者
        if (highestBidder != address(0)) {
            IERC721(nftContract).transferFrom(
                address(this),
                highestBidder,
                nftTokenId
            );
            // 将拍卖资金转给发起人
            payable(seller).transfer(highestBid);
        } else {
            // 如果没有最高出价者，将 NFT 转让给发起人
            IERC721(nftContract).transferFrom(
                address(this),
                seller,
                nftTokenId
            );
        }

        IAutionFactory(factory).autionEnd(address(this));
    }

    // 如果没有实现这个方法，使用 safeTransferFrom 将NFT转移到拍卖合约时会失败，导致拍卖无法创建。
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
