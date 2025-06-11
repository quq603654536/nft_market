import { expect } from "chai";
import { ethers } from "hardhat";

describe('NFT Auction System', () => {
    let nftContract: any;
    let auctionFactory: any;
    let mockERC20: any;
    let owner: any;
    let seller: any;
    let bidder1: any;
    let bidder2: any;
    let tokenId: number;
    const tokenURI = "https://example.com/token/1";
    const auctionDuration = 60 * 60 * 24; // 1 day in seconds
    const startingPrice = ethers.parseEther("0.1"); // 0.1 ETH
    
    beforeEach(async () => {
        // 获取账户
        [owner, seller, bidder1, bidder2] = await ethers.getSigners();
        
        // 部署NFT合约
        const NFT = await ethers.getContractFactory("NFT");
        nftContract = await NFT.deploy();
        
        // 部署拍卖工厂合约
        const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
        auctionFactory = await AuctionFactory.deploy();
        
        // 部署模拟ERC20代币合约（用于测试ERC20出价）
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockERC20 = await MockERC20.deploy("Mock Token", "MTK");
        
        // 铸造NFT给卖家
        tokenId = await nftContract.sendNFT(seller.address, tokenURI);
        
        // 给测试账户分配ERC20代币
        await mockERC20.mint(bidder1.address, ethers.parseEther("10"));
        await mockERC20.mint(bidder2.address, ethers.parseEther("10"));
    });
    
    describe("ETH Auction", () => {
        let auctionAddress: string;
        let auction: any;
        
        beforeEach(async () => {
            // 卖家授权工厂合约转移NFT
            await nftContract.connect(seller).approve(auctionFactory.target, tokenId);
            
            // 创建拍卖
            const tx = await auctionFactory.connect(seller).createAuction(
                nftContract.target,
                tokenId,
                startingPrice,
                auctionDuration,
                ethers.ZeroAddress // 使用ETH
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'AuctionCreated'
            );
            auctionAddress = event.args[0];
            
            // 获取拍卖合约实例
            const Auction = await ethers.getContractFactory("Auction");
            auction = Auction.attach(auctionAddress);
        });
        
        it("应该正确创建拍卖", async () => {
            expect(await auction.seller()).to.equal(seller.address);
            expect(await auction.nftContract()).to.equal(nftContract.target);
            expect(await auction.tokenId()).to.equal(tokenId);
            expect(await auction.startingPrice()).to.equal(startingPrice);
            expect(await auction.state()).to.equal(1); // Active
        });
        
        it("应该允许出价并更新最高出价者", async () => {
            // 第一个出价
            await auction.connect(bidder1).placeBid({ value: ethers.parseEther("0.2") });
            expect(await auction.highestBidder()).to.equal(bidder1.address);
            expect(await auction.highestBid()).to.equal(ethers.parseEther("0.2"));
            
            // 第二个更高的出价
            await auction.connect(bidder2).placeBid({ value: ethers.parseEther("0.3") });
            expect(await auction.highestBidder()).to.equal(bidder2.address);
            expect(await auction.highestBid()).to.equal(ethers.parseEther("0.3"));
        });
        
        it("应该拒绝低于当前最高出价的出价", async () => {
            await auction.connect(bidder1).placeBid({ value: ethers.parseEther("0.2") });
            
            await expect(
                auction.connect(bidder2).placeBid({ value: ethers.parseEther("0.1") })
            ).to.be.revertedWith("Bid not high enough");
        });
    });
    
    describe("ERC20 Auction", () => {
        let auctionAddress: string;
        let auction: any;
        const tokenStartingPrice = ethers.parseEther("1"); // 1 Token
        
        beforeEach(async () => {
            // 卖家授权工厂合约转移NFT
            await nftContract.connect(seller).approve(auctionFactory.target, tokenId);
            
            // 创建拍卖
            const tx = await auctionFactory.connect(seller).createAuction(
                nftContract.target,
                tokenId,
                tokenStartingPrice,
                auctionDuration,
                mockERC20.target // 使用ERC20代币
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'AuctionCreated'
            );
            auctionAddress = event.args[0];
            
            // 获取拍卖合约实例
            const Auction = await ethers.getContractFactory("Auction");
            auction = Auction.attach(auctionAddress);
            
            // 批准拍卖合约使用代币
            await mockERC20.connect(bidder1).approve(auction.target, ethers.parseEther("5"));
            await mockERC20.connect(bidder2).approve(auction.target, ethers.parseEther("5"));
        });
        
        it("应该允许使用ERC20代币出价", async () => {
            // 第一个出价
            await auction.connect(bidder1).placeBidWithToken(ethers.parseEther("2"));
            expect(await auction.highestBidder()).to.equal(bidder1.address);
            expect(await auction.highestBid()).to.equal(ethers.parseEther("2"));
            
            // 第二个更高的出价
            await auction.connect(bidder2).placeBidWithToken(ethers.parseEther("3"));
            expect(await auction.highestBidder()).to.equal(bidder2.address);
            expect(await auction.highestBid()).to.equal(ethers.parseEther("3"));
        });
    });
});