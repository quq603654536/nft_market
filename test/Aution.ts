import { expect } from "chai";
import { ethers, upgrades } from "hardhat";


describe("Aution System", function () {
    let owner: any
    let seller: any
    let bidder1: any
    let bidder2: any

    let nftContract: any
    let factoryContract: any
    let auctionContract: any
    let linkToken : any

    const tokenURI = "https://peach-gentle-barracuda-756.mypinata.cloud/ipfs/bafkreibehmhttzuikx2cxlnfgmes73o5a2d4u7ficjga5ezgzixmuagrie";
    const tokenId = 1;
    const startingPrice = ethers.parseEther("0.000001");
    let LINK_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

    this.beforeEach(async () => {
        [owner, seller, bidder1, bidder2] = await ethers.getSigners()

        // 部署NFT合约
        const Factory = await ethers.getContractFactory('NFT');
        nftContract = await upgrades.deployProxy(Factory, 
            ["0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", 101],
            { initializer: 'initialize' }
        );
        await nftContract.waitForDeployment();
        console.log("NFT合约地址", nftContract.target)

        // 铸币
        await nftContract.connect(owner).sendNFT(seller.address, tokenURI)

        // 部署模拟的LINK代币
        const LinkToken = await ethers.getContractFactory("ERC20Mock") // 假设有一个ERC20Mock合约
        linkToken = await LinkToken.deploy("ChainLink Token", "LINK")
        await linkToken.waitForDeployment()
        LINK_ADDRESS = linkToken.target;

        // 给测试账户铸造一些LINK代币
        await linkToken.mint(bidder1.address, ethers.parseEther("100"))
        await linkToken.mint(bidder2.address, ethers.parseEther("100"))

        // 部署工厂合约
        const factoryFactory = await ethers.getContractFactory("AutionFactory")
        factoryContract = await factoryFactory.deploy(true, LINK_ADDRESS)
        await factoryContract.waitForDeployment()
        console.log("合约地址", factoryContract.target)

        
    })

    describe("Aution Action", () => {
        this.beforeEach(async () => {
            // 添加这一行：授权工厂合约操作NFT
            await nftContract.connect(seller).approve(factoryContract.target, tokenId)
            // 开始拍卖
            const tx = await factoryContract.connect(seller).createAution(nftContract.target, tokenId, startingPrice, 20)

            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) =>
                log.fragment && log.fragment.name === 'AutionCreated'
            );
            const auctionAddress = event.args[0];
            console.log("拍卖地址", auctionAddress)
            const aution = await ethers.getContractFactory("Aution")
            auctionContract = aution.attach(auctionAddress)
        })

        it("应该正确创建拍卖", async () => {
            expect(await auctionContract.seller()).to.equal(seller.address);
            expect(await auctionContract.nftContract()).to.equal(nftContract.target);
            expect(await auctionContract.nftTokenId()).to.equal(tokenId);
            expect(await nftContract.ownerOf(tokenId)).to.equal(auctionContract.target)
        })

        it("应该正确记录拍卖数量", async () => {
            expect(await factoryContract.getAutionCount()).to.equal(1);
        })

        it("应该正确记录拍卖ID", async () => {
            const autionId = 1;
            const autionAddress = await factoryContract.getAutionContract(autionId);
            expect(autionAddress).to.equal(auctionContract.target);
        })

        it("应该接受更高的ETH出价", async () => {
            const bidAmount = ethers.parseEther("0.000002")
            await auctionContract.connect(bidder1).placeBidWithETH({ value: bidAmount })
            expect(await auctionContract.highestBidder()).to.equal(bidder1.address)
            expect(await auctionContract.tokenAddress()).to.equal(ethers.ZeroAddress)
        })

        it("应该拒绝低于起拍价的出价", async () => {
            const bidAmount = ethers.parseEther("0.0000005")
            await expect(
                auctionContract.connect(bidder1).placeBidWithETH({ value: bidAmount })
            ).to.be.revertedWith("Bid not high enough")
        })

        it("应该拒绝低于当前最高价的出价", async () => {
            const firstBid = ethers.parseEther("0.000002")
            const secondBid = ethers.parseEther("0.0000015")

            await auctionContract.connect(bidder1).placeBidWithETH({ value: firstBid })
            await expect(
                auctionContract.connect(bidder2).placeBidWithETH({ value: secondBid })
            ).to.be.revertedWith("Bid not high enough")
        })

        it("应该正确退还之前的出价", async () => {
            const firstBid = ethers.parseEther("0.000002")
            const secondBid = ethers.parseEther("0.000003")

            const initialBalance = await ethers.provider.getBalance(bidder1.address)
            await auctionContract.connect(bidder1).placeBidWithETH({ value: firstBid })
            await auctionContract.connect(bidder2).placeBidWithETH({ value: secondBid })
            const finalBalance = await ethers.provider.getBalance(bidder1.address)

            // 考虑gas费用，余额应该接近初始余额
            expect(finalBalance).to.be.closeTo(initialBalance, ethers.parseEther("0.1"))
        })

        it("应该接受LINK代币出价", async () => {
            const linkAmount = ethers.parseEther("0.000001")
            await linkToken.connect(bidder1).approve(auctionContract.target, linkAmount)
            await auctionContract.connect(bidder1).placeBidWithERC20(LINK_ADDRESS, linkAmount)
            expect(await auctionContract.highestBidder()).to.equal(bidder1.address)
            expect(await auctionContract.tokenAddress()).to.equal(LINK_ADDRESS)
        })

        it("应该正确退还之前的LINK出价", async () => {
            const firstBid = ethers.parseEther("1")
            const secondBid = ethers.parseEther("2")
            
            await linkToken.connect(bidder1).approve(auctionContract.target, firstBid)
            await linkToken.connect(bidder2).approve(auctionContract.target, secondBid)
            
            const initialBalance = await linkToken.balanceOf(bidder1.address)
            await auctionContract.connect(bidder1).placeBidWithERC20(LINK_ADDRESS, firstBid)
            await auctionContract.connect(bidder2).placeBidWithERC20(LINK_ADDRESS, secondBid)
            const finalBalance = await linkToken.balanceOf(bidder1.address)
            
            expect(finalBalance).to.equal(initialBalance)
        })

        it("卖家应该能够取消拍卖", async () => {
            await auctionContract.connect(seller).cancelAution()
            expect(await auctionContract.isEnd()).to.be.true
            expect(await nftContract.ownerOf(tokenId)).to.equal(seller.address)
            expect(await factoryContract.getAutionCount()).to.equal(0)
        })

        it("非卖家不能取消拍卖", async () => {
            await expect(
                auctionContract.connect(bidder1).cancelAution()
            ).to.be.revertedWith("Only seller can call this function")
        })

        it("应该正确结束拍卖并转移NFT和ETH", async () => {
            const bidAmount = ethers.parseEther("0.000002")
            await auctionContract.connect(bidder1).placeBidWithETH({ value: bidAmount })
            
            const initialBalance = await ethers.provider.getBalance(seller.address)
            await auctionContract.connect(seller).endAution()
            const finalBalance = await ethers.provider.getBalance(seller.address)
            
            expect(await auctionContract.isEnd()).to.be.true
            expect(await nftContract.ownerOf(tokenId)).to.equal(bidder1.address)
            expect(await factoryContract.getAutionCount()).to.equal(0)
            // 考虑gas费用，余额应该增加接近bidAmount
            expect(finalBalance).to.be.closeTo(initialBalance + bidAmount, ethers.parseEther("0.1"))
        })

        it("应该正确结束拍卖并转移NFT和LINK", async () => {
            const linkAmount = ethers.parseEther("1")
            await linkToken.connect(bidder1).approve(auctionContract.target, linkAmount)
            await auctionContract.connect(bidder1).placeBidWithERC20(LINK_ADDRESS, linkAmount)
            
            const initialBalance = await linkToken.balanceOf(seller.address)
            await auctionContract.connect(seller).endAution()
            const finalBalance = await linkToken.balanceOf(seller.address)
            
            expect(await auctionContract.isEnd()).to.be.true
            expect(await nftContract.ownerOf(tokenId)).to.equal(bidder1.address)
            expect(await factoryContract.getAutionCount()).to.equal(0)
            expect(finalBalance).to.equal(initialBalance + linkAmount)
        })

        it("拍卖结束后不能继续出价", async () => {
            await auctionContract.connect(seller).endAution()
            const bidAmount = ethers.parseEther("0.000002")
            await expect(
                auctionContract.connect(bidder1).placeBidWithETH({ value: bidAmount })
            ).to.be.revertedWith("Aution has end")
        })
    })
})