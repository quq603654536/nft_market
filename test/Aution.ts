import { expect } from "chai";
import { ethers } from "hardhat";


describe("Aution System", function () {
    let owner: any
    let seller: any
    let bidder1: any
    let bidder2: any

    let nftContract: any
    let factoryContract: any
    let auctionContract: any

    const tokenURI = "https://peach-gentle-barracuda-756.mypinata.cloud/ipfs/bafkreibehmhttzuikx2cxlnfgmes73o5a2d4u7ficjga5ezgzixmuagrie";
    const tokenId = 1;
    const startingPrice = ethers.parseEther("0.1");

    this.beforeEach(async () => {
        [owner, seller, bidder1, bidder2] = await ethers.getSigners()

        // 部署NFT合约
        const nftFactory = await ethers.getContractFactory("NFT")
        nftContract = await nftFactory.deploy()
        await nftContract.waitForDeployment()
        console.log("NFT合约地址", nftContract.target)

        // 铸币
        await nftContract.connect(owner).sendNFT(seller.address, tokenURI)

        // 部署工厂合约
        const factoryFactory = await ethers.getContractFactory("AutionFactory")
        factoryContract = await factoryFactory.deploy()
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

            const aution = await ethers.getContractFactory("Aution")
            auctionContract = aution.attach(auctionAddress)
        })
    })
    
    it("应该正确创建拍卖", async () => {
        expect(await auctionContract.seller()).to.equal(seller.address);
        expect(await auctionContract.nftContract()).to.equal(nftContract.target);
        expect(await auctionContract.nftTokenId()).to.equal(tokenId);
        expect(await auctionContract.startPrice()).to.equal(startingPrice);
        expect(await nftContract.ownerOf(tokenId)).to.equal(auctionContract.target)
    })
})