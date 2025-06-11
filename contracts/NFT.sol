// SPDX-License-Identifier: MIT
// contracts/Market.sol - Market contract
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// 一个NFT拍卖市场
contract NFT is ERC721URIStorage {
    uint256 private _nextTokenId = 0;
    address private _owner;
    constructor() ERC721("MyMarket", "MMK") {
        _owner = msg.sender;
    }

    event SendNFT(address recipient, string tokenURI);

    modifier onlyOwner() {
        require(msg.sender == _owner, "Only owner can call this function");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    // 发放一个NFT
    // 1. 生成一个新的tokenId
    // 2. 给recipient mint一个token
    // 3. 设置token的URI
    function sendNFT(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        require(recipient != address(0), "Recipient address cannot be zero");

        uint256 _tokenId = ++_nextTokenId;
        _mint(recipient, _tokenId);
        _setTokenURI(_tokenId, tokenURI);

        emit SendNFT(recipient, tokenURI);

        return _tokenId;
    }

    // 转移一个NFT
    function transferNFT(address to, uint256 tokenId) public {
        require(to != address(0), "Recipient address cannot be zero");
        // 函数会自动检查调用者是否为代币所有者、被授权者或运营商
        safeTransferFrom(msg.sender, to, tokenId);
    }
}