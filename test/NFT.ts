import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

const tokenURI = "https://peach-gentle-barracuda-756.mypinata.cloud/ipfs/bafkreibehmhttzuikx2cxlnfgmes73o5a2d4u7ficjga5ezgzixmuagrie";
const tokenId = 1;

describe('Market', () => {
    console.log("开始测试")

    let nftContract: any;
    let account: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async () => {
        console.log("开始部署合约")
        const accounts = await ethers.getSigners();
        account = accounts[0];
        addr1 = accounts[1];
        addr2 = accounts[2];
        
        // 使用 UUPS 代理模式部署合约
        const Factory = await ethers.getContractFactory('NFT');
        nftContract = await upgrades.deployProxy(Factory, 
            ["0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", 101],
            { initializer: 'initialize' }
        );
        await nftContract.waitForDeployment();
        console.log("部署合约成功", nftContract.target);
    });

    it("deploy success", async () => {
        expect(nftContract).to.be.ok;
    })

    describe("sendNFT", () => {
        it("发送NFT成功", async () => {
            await expect(nftContract.connect(account).sendNFT(addr1.address, tokenURI))
                .to.emit(nftContract, "SendNFT")
                .withArgs(addr1.address, tokenURI, tokenId);

            // 断言tokenId为1的NFT属于addr1.address
            expect(await nftContract.ownerOf(tokenId)).to.equal(addr1.address);
            // 断言tokenId为1的NFT的URI为tokenURI  
            expect(await nftContract.tokenURI(tokenId)).to.equal(tokenURI);
        })

        it("只有合约拥有者可以发送NFT", async () => {
            await expect(nftContract.connect(addr1).sendNFT(addr2.address, tokenURI))
                .to.be.revertedWith("Only owner can call this function");
        });
    })

    describe("transferNFT", () => {
        beforeEach(async () => {
            await nftContract.connect(account).sendNFT(addr1.address, tokenURI)
        })

        it("转移NFT成功", async () => {
            await nftContract.connect(addr1).transferNFT(addr2.address, tokenId)
            expect(await nftContract.ownerOf(tokenId)).to.equal(addr2.address);
        })
    })
})