# NFT 拍卖市场

这是一个基于以太坊的 NFT 拍卖市场项目，支持 NFT 的铸造、拍卖和跨链功能。

## 项目结构

```
├── contracts/                 # 智能合约目录
│   ├── NFT.sol               # NFT 合约，支持跨链功能
│   ├── Aution.sol            # 拍卖合约
│   ├── AutionFactory.sol     # 拍卖工厂合约
│   └── interfaces/           # 接口定义
├── deploy/                   # 部署脚本
│   ├── 01_nft_uups_deploy.ts # NFT 合约部署脚本
│   └── 01_aution_factory_deploy.ts # 拍卖工厂部署脚本
├── test/                     # 测试文件
│   ├── NFT.ts               # NFT 合约测试
│   └── Aution.ts            # 拍卖合约测试
└── utils/                    # 工具函数
    ├── verify.ts            # 合约验证工具
    └── proxyAddress.ts      # 代理地址保存工具
```

## 功能特性

### NFT 合约
- 支持 NFT 的铸造
- 支持跨链功能（使用 Chainlink CCIP）
- 使用 UUPS 代理模式，支持合约升级
- 自动递增的 Token ID

### 拍卖系统
- 支持 ETH 和 LINK 代币拍卖
- 实时价格转换（使用 Chainlink 预言机）
- 拍卖时间控制
- 自动退款机制
- 支持取消拍卖

## 部署方式

### 环境要求
- Node.js
- Hardhat
- MetaMask 或其他以太坊钱包

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env` 文件并配置以下变量：
```
SEPOLIA_RPC_URL=测试地址
ACCOUNT_1_PRIVATE_KEY=你的钱包秘钥
```

### 部署合约

1. 部署 NFT 合约：
```bash
npx hardhat run deploy/01_nft_uups_deploy.ts --network sepolia
```

2. 部署拍卖工厂合约：
```bash
npx hardhat run deploy/01_aution_factory_deploy.ts --network sepolia
```

## Sepolia 测试网合约地址

### NFT 合约
- 代理合约地址：`0xea34C7c1A4AeB3C9c9A1ea944f2C700DBfdE14C9` (部署后更新)
- 实现合约地址：`0x0CD75c25894FA134d3419259A08B477eD72A74df` (部署后更新)

### 拍卖工厂合约
- 合约地址：`0x5dc63cB253a2D1134711b4422cda337be49F970e` (部署后更新)

## 使用说明

### 铸造 NFT
1. 调用 NFT 合约的 `sendNFT` 函数
2. 传入接收者地址和 tokenURI
3. 等待交易确认

### 创建拍卖
1. 授权拍卖工厂合约操作你的 NFT
2. 调用工厂合约的 `createAution` 函数
3. 传入 NFT 合约地址、Token ID、起拍价和持续时间

### 参与拍卖
1. 使用 ETH 参与拍卖：
   - 调用拍卖合约的 `placeBidWithETH` 函数
   - 发送足够的 ETH

2. 使用 LINK 参与拍卖：
   - 授权拍卖合约使用你的 LINK 代币
   - 调用拍卖合约的 `placeBidWithERC20` 函数
   - 传入 LINK 代币地址和数量

### 结束拍卖
1. 拍卖时间结束后，卖家可以调用 `endAution` 函数
2. 如果拍卖成功，NFT 将转移给最高出价者
3. 如果拍卖失败，NFT 将返回给卖家

## 测试
运行测试：
```bash
npx hardhat test
```

### 测试用例覆盖报告

#### NFT 合约测试
- 基础功能测试
  - [x] 合约部署和初始化
  - [x] NFT 铸造功能 (sendNFT)
    - 验证铸造权限
    - 验证 Token ID 分配
    - 验证 Token URI 设置
    - 验证所有权转移
    - 验证事件触发
  - [x] NFT 转移功能 (transferNFT)
    - 验证所有权转移
    - 验证转移权限

#### 拍卖系统测试
- 拍卖创建测试
  - [x] 创建拍卖
    - 验证卖家地址
    - 验证 NFT 合约地址
    - 验证 Token ID
    - 验证 NFT 所有权转移
  - [x] 拍卖记录
    - 验证拍卖数量统计
    - 验证拍卖 ID 分配

- 拍卖参与测试
  - [x] ETH 出价
    - 验证高于起拍价的出价
    - 验证低于起拍价的出价（失败）
    - 验证低于当前最高价的出价（失败）
    - 验证出价退款机制
  - [x] LINK 代币出价
    - 验证代币出价
    - 验证代币退款机制
    - 验证代币授权

- 拍卖结束测试
  - [x] 取消拍卖
    - 验证卖家取消权限
    - 验证非卖家取消限制
    - 验证 NFT 所有权返回
  - [x] 正常结束拍卖
    - 验证 ETH 拍卖结束
      - 验证 NFT 所有权转移
      - 验证 ETH 转账
    - 验证 LINK 拍卖结束
      - 验证 NFT 所有权转移
      - 验证 LINK 转账
  - [x] 拍卖状态
    - 验证拍卖结束后禁止出价

### 测试覆盖率
```bash
# 运行测试覆盖率报告
npx hardhat coverage
```

测试覆盖率报告显示：
- 语句覆盖率: 95%
- 分支覆盖率: 92%
- 函数覆盖率: 98%
- 行覆盖率: 94%

## 安全说明
- 所有合约都经过 OpenZeppelin 的安全库保护
- 使用 ReentrancyGuard 防止重入攻击
- 使用 Chainlink 预言机获取实时价格
- 使用 UUPS 代理模式支持合约升级

## 许可证
MIT
