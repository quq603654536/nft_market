
import { expect } from "chai";
import { ethers } from "hardhat";

const tokenURI = "https://peach-gentle-barracuda-756.mypinata.cloud/ipfs/bafkreibehmhttzuikx2cxlnfgmes73o5a2d4u7ficjga5ezgzixmuagrie";
const tokenId = 1;

describe('Market', () => {
    console.log("开始测试")

    let marketContract : any;
    let account : any;
    let addr1 : any;
    let addr2 : any;
    
    beforeEach(async () => {
        console.log("开始部署合约")
        const accounts = await ethers.getSigners();
        account = accounts[0];
        addr1 = accounts[1];
        addr2 = accounts[2];
        const marketFactory = await ethers.getContractFactory('Market');
        marketContract = await marketFactory.deploy();
        await marketContract.waitForDeployment();
        console.log("部署合约成功", marketContract.target)
    });

    it("deploy success", async () => {
        expect(marketContract).to.be.ok;
    })

    describe("sendNFT", () => {
        it("发送NFT成功", async () => {
            await expect(marketContract.connect(account).sendNFT(addr1.address, tokenURI))
                                .to.emit(marketContract, "SendNFT") //断言会有event事件，且参数为addr1.address和tokenURI
                                .withArgs(addr1.address, tokenURI);

            
            // 断言tokenId为1的NFT属于addr1.address
            expect(await marketContract.ownerOf(tokenId)).to.equal(addr1.address);     
            // 断言tokenId为1的NFT的URI为tokenURI  
            expect(await marketContract.tokenURI(tokenId)).to.equal(tokenURI); 
        })

        it("只有合约拥有者可以发送NFT", async () => {
            await expect(marketContract.connect(addr1).sendNFT(addr2.address, tokenURI))
            .to.be.revertedWith("Only owner can call this function");
        });
    })

    describe("transferNFT", () => {
        beforeEach(async () => {
            await marketContract.connect(account).sendNFT(addr1.address, tokenURI)
        })

        it("转移NFT成功", async () => {
            await marketContract.connect(addr1).transferNFT(addr2.address, tokenId)
            expect(await marketContract.ownerOf(tokenId)).to.equal(addr2.address);
        })
    })
})