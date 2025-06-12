import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL as string,
      accounts: [
        process.env.ACCOUNT_1_PRIVATE_KEY as string,
        process.env.ACCOUNT_2_PRIVATE_KEY as string,
        process.env.ACCOUNT_3_PRIVATE_KEY as string,
        process.env.ACCOUNT_4_PRIVATE_KEY as string,
      ]
    }
  }
};

export default config;
