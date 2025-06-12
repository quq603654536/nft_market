import { ethers } from "hardhat";
import { upgrades } from "hardhat";
import { verify } from "../utils/verify";
import { saveProxyAddress } from "../utils/proxyAddress";

async function main() {
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户地址进行部署:", deployer.address);

  // CCIP Router 地址 - Sepolia 测试网
  // 这是 Chainlink CCIP 在 Sepolia 测试网上的路由器地址
  // 用于处理跨链消息传递
  const CCIP_ROUTER = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
  
  // 源链 ID - 这里使用 Solana 的链 ID 作为示例
  // 这个 ID 用于验证跨链消息的来源
  const SOURCE_CHAIN_ID = 101;

  // 部署 NFT 合约（使用 UUPS 代理模式）
  console.log("开始部署 NFT 合约...");
  const NFT = await ethers.getContractFactory("NFT");
  
  // 使用 UUPS 代理模式部署合约
  // initializer: "initialize" - 指定初始化函数名
  // kind: "uups" - 使用 UUPS 代理模式
  const nft = await upgrades.deployProxy(NFT, [CCIP_ROUTER, SOURCE_CHAIN_ID], {
    initializer: "initialize",
    kind: "uups",
  });
  // 等待部署完成
  await nft.waitForDeployment();

  // 获取部署后的合约地址
  // 这是代理合约的地址，用户将使用这个地址与合约交互
  const nftAddress = await nft.getAddress();
  console.log("NFT 合约已部署到:", nftAddress);

  // 保存代理合约地址到文件
  saveProxyAddress(nftAddress);

  // 获取实现合约地址
  // 这是实际包含合约逻辑的地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(nftAddress);
  console.log("实现合约地址:", implementationAddress);

  // 在 Etherscan 上验证实现合约
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("等待区块确认...");
    // 获取部署交易并等待 6 个区块确认
    // 这是为了确保交易被充分确认，避免验证失败
    const deploymentTx = await nft.deploymentTransaction();
    if (deploymentTx) {
      await deploymentTx.wait(6);
    }
    
    console.log("正在验证实现合约...");
    // 验证实现合约的源代码
    await verify(implementationAddress, []);
  }
}

// 执行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署过程中发生错误:", error);
    process.exit(1);
  });
