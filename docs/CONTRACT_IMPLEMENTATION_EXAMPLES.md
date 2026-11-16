# 💻 Contract Implementation Examples

## 📝 COMPLETE CONTRACT STRUCTURE

### NFTCollection.sol - Struktur Lengkap
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTCollection is 
    ERC721, 
    ERC2981, 
    AccessControl, 
    Pausable, 
    ReentrancyGuard 
{
    using Strings for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ STRUCTS ============
    struct CollectionConfig {
        string name;
        string symbol;
        string baseURI;
        string unrevealedURI;
        string contractURI;
        uint256 totalMaxSupply;
        address payable treasury;
        address payable royaltyRecipient;
        uint96 royaltyPercentage;
        bool isRevealed;
        uint256 chainId;
    }

    struct MintPhase {
        string name;
        uint256 startTime;
        uint256 endTime;
        uint256 price;
        uint256 maxSupply;
        uint256 maxPerWallet;
        uint256 maxPerTransaction;
        bytes32 merkleRoot;
        bool isActive;
        bool requiresWhitelist;
        uint256 currentSupply;
    }

    // ============ STATE VARIABLES ============
    CollectionConfig public config;
    
    uint256 public currentTokenId;
    uint256 public totalMinted;
    
    mapping(uint256 => MintPhase) public mintPhases;
    uint256 public mintPhasesCount;
    
    mapping(uint256 => mapping(address => uint256)) public phaseUserMints;
    
    address payable public platformTreasury;
    uint256 public platformFeePercentage; // 250 = 2.5%
    uint256 public freeMintPlatformFee;
    bool public platformFeeEnabled;

    // ============ EVENTS ============
    event Minted(address indexed to, uint256 indexed tokenId, uint256 phaseId);
    event PhaseAdded(uint256 indexed phaseId, string name);
    event PhaseUpdated(uint256 indexed phaseId);
    event Revealed(string newBaseURI);
    event TreasuryUpdated(address indexed newTreasury);
    event RoyaltyUpdated(address indexed recipient, uint96 percentage);
    event NFTBurned(address indexed owner, uint256 indexed tokenId);

    // ============ CONSTRUCTOR ============
    constructor(
        CollectionConfig memory _config,
        address payable _platformTreasury
    ) ERC721(_config.name, _config.symbol) {
        config = _config;
        platformTreasury = _platformTreasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        _setDefaultRoyalty(_config.royaltyRecipient, _config.royaltyPercentage);
    }

    // ============ MODIFIERS ============
    modifier phaseActive(uint256 phaseId) {
        MintPhase storage phase = mintPhases[phaseId];
        require(phase.isActive, "Phase not active");
        require(block.timestamp >= phase.startTime, "Phase not started");
        require(block.timestamp <= phase.endTime, "Phase ended");
        _;
    }

    // ... (continued in next section)
}
```


### NFTCollection.sol - Core Functions (Part 2)

```solidity
    // ============ MINT PHASE MANAGEMENT ============
    
    function batchAddMintPhases(MintPhaseRequest[] memory phases) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        for (uint i = 0; i < phases.length; i++) {
            mintPhases[mintPhasesCount] = MintPhase({
                name: phases[i].name,
                startTime: phases[i].startTime,
                endTime: phases[i].endTime,
                price: phases[i].price,
                maxSupply: phases[i].maxSupply,
                maxPerWallet: phases[i].maxPerWallet,
                maxPerTransaction: phases[i].maxPerTransaction,
                merkleRoot: phases[i].merkleRoot,
                isActive: true,
                requiresWhitelist: phases[i].requiresWhitelist,
                currentSupply: 0
            });
            
            emit PhaseAdded(mintPhasesCount, phases[i].name);
            mintPhasesCount++;
        }
    }

    function getMintPhase(uint256 phaseId) 
        external 
        view 
        returns (MintPhase memory) 
    {
        require(phaseId < mintPhasesCount, "Invalid phase");
        return mintPhases[phaseId];
    }

    function getMintPhasesCount() external view returns (uint256) {
        return mintPhasesCount;
    }

    function togglePhaseActive(uint256 phaseId) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(phaseId < mintPhasesCount, "Invalid phase");
        mintPhases[phaseId].isActive = !mintPhases[phaseId].isActive;
        emit PhaseUpdated(phaseId);
    }

    function updateMintPhase(
        uint256 phaseId,
        uint256 startTime,
        uint256 endTime,
        uint256 maxPerWallet,
        bytes32 merkleRoot
    ) external onlyRole(ADMIN_ROLE) {
        require(phaseId < mintPhasesCount, "Invalid phase");
        MintPhase storage phase = mintPhases[phaseId];
        
        phase.startTime = startTime;
        phase.endTime = endTime;
        phase.maxPerWallet = maxPerWallet;
        phase.merkleRoot = merkleRoot;
        
        emit PhaseUpdated(phaseId);
    }

    // ============ MINTING ============
    
    function calculateMintCost(uint256 phaseId, uint256 quantity) 
        public 
        view 
        returns (
            uint256 mintCost,
            uint256 platformFee,
            uint256 totalCost,
            bool isFreeMint
        ) 
    {
        require(phaseId < mintPhasesCount, "Invalid phase");
        MintPhase storage phase = mintPhases[phaseId];
        
        mintCost = phase.price * quantity;
        
        if (phase.price == 0) {
            // Free mint
            platformFee = freeMintPlatformFee;
            isFreeMint = true;
        } else {
            // Paid mint
            platformFee = platformFeeEnabled 
                ? (mintCost * platformFeePercentage) / 10000 
                : 0;
            isFreeMint = false;
        }
        
        totalCost = mintCost + platformFee;
    }

    function mint(
        uint256 phaseId,
        uint256 quantity,
        bytes32[] calldata merkleProof
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        phaseActive(phaseId) 
    {
        MintPhase storage phase = mintPhases[phaseId];
        
        // Validate quantity
        require(quantity > 0, "Invalid quantity");
        require(quantity <= phase.maxPerTransaction, "Exceeds max per tx");
        
        // Validate supply
        require(
            phase.currentSupply + quantity <= phase.maxSupply,
            "Phase supply exceeded"
        );
        require(
            currentTokenId + quantity <= config.totalMaxSupply,
            "Total supply exceeded"
        );
        
        // Validate wallet limit
        require(
            phaseUserMints[phaseId][msg.sender] + quantity <= phase.maxPerWallet,
            "Wallet limit exceeded"
        );
        
        // Validate whitelist
        if (phase.requiresWhitelist) {
            bytes32 leaf = keccak256(
                abi.encodePacked(msg.sender, phase.maxPerWallet)
            );
            require(
                MerkleProof.verify(merkleProof, phase.merkleRoot, leaf),
                "Invalid merkle proof"
            );
        }
        
        // Calculate and validate payment
        (
            uint256 mintCost,
            uint256 platformFee,
            uint256 totalCost,
        ) = calculateMintCost(phaseId, quantity);
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Update counters
        phase.currentSupply += quantity;
        phaseUserMints[phaseId][msg.sender] += quantity;
        
        // Mint NFTs
        for (uint i = 0; i < quantity; i++) {
            currentTokenId++;
            _safeMint(msg.sender, currentTokenId);
            emit Minted(msg.sender, currentTokenId, phaseId);
        }
        
        totalMinted += quantity;
        
        // Distribute funds
        if (mintCost > 0) {
            config.treasury.transfer(mintCost);
        }
        if (platformFee > 0) {
            platformTreasury.transfer(platformFee);
        }
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }

    function batchMint(
        uint256 phaseId,
        address[] calldata recipients,
        uint256[] calldata quantities
    ) external onlyRole(ADMIN_ROLE) {
        require(recipients.length == quantities.length, "Length mismatch");
        
        for (uint i = 0; i < recipients.length; i++) {
            for (uint j = 0; j < quantities[i]; j++) {
                currentTokenId++;
                _safeMint(recipients[i], currentTokenId);
                emit Minted(recipients[i], currentTokenId, phaseId);
            }
            totalMinted += quantities[i];
        }
    }
```


### NFTCollection.sol - Management Functions (Part 3)

```solidity
    // ============ COLLECTION MANAGEMENT ============
    
    function updateTreasury(address payable newTreasury) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(newTreasury != address(0), "Invalid address");
        config.treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function updateRoyalty(address payable recipient, uint96 percentage) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(recipient != address(0), "Invalid address");
        require(percentage <= 1000, "Max 10%"); // 1000 = 10%
        config.royaltyRecipient = recipient;
        config.royaltyPercentage = percentage;
        _setDefaultRoyalty(recipient, percentage);
        emit RoyaltyUpdated(recipient, percentage);
    }

    function updateContractURI(string memory newContractURI) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        config.contractURI = newContractURI;
    }

    function reveal(string memory newBaseURI) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        config.baseURI = newBaseURI;
        config.isRevealed = true;
        emit Revealed(newBaseURI);
    }

    // ============ BURN ============
    
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _burn(tokenId);
        emit NFTBurned(msg.sender, tokenId);
    }

    // ============ EMERGENCY CONTROLS ============
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ METADATA ============
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_exists(tokenId), "Token does not exist");
        
        if (!config.isRevealed) {
            return config.unrevealedURI;
        }
        
        return string(
            abi.encodePacked(
                config.baseURI,
                tokenId.toString(),
                ".json"
            )
        );
    }

    function contractURI() public view returns (string memory) {
        return config.contractURI;
    }

    // ============ INTERFACE SUPPORT ============
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ============ RECEIVE ETH ============
    
    receive() external payable {}
}
```


---

## 🏭 LAUNCHPAD FACTORY IMPLEMENTATION

### LaunchpadFactory.sol - Complete Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NFTCollection.sol";

contract LaunchpadFactory is Ownable, ReentrancyGuard {
    
    // ============ STATE VARIABLES ============
    string public constant FACTORY_VERSION = "1.0.0";
    uint256 public immutable DEPLOYED_CHAIN_ID;
    
    uint256 public creationFee;
    uint256 public platformFeePercentage; // 250 = 2.5%
    uint256 public freeMintPlatformFee;
    address payable public platformTreasury;
    
    address[] public allLaunchpads;
    mapping(address => LaunchpadInfo) public launchpads;
    
    // ============ STRUCTS ============
    struct DeploymentRequest {
        string name;
        string symbol;
        string description;
        string baseURI;
        string unrevealedURI;
        string contractURI;
        string externalLink;
        uint256 totalMaxSupply;
        address payable treasury;
        address payable royaltyRecipient;
        uint96 royaltyPercentage;
    }
    
    struct LaunchpadInfo {
        address launchpadAddress;
        address creator;
        string name;
        string symbol;
        uint256 createdAt;
        uint256 totalSupply;
    }
    
    // ============ EVENTS ============
    event LaunchpadCreated(
        address indexed launchpadAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 indexed timestamp
    );
    
    event CreationFeeUpdated(uint256 newFee);
    event PlatformFeeUpdated(uint256 percentage, uint256 freeMintFee);
    
    // ============ CONSTRUCTOR ============
    constructor(
        uint256 _creationFee,
        address payable _platformTreasury
    ) {
        DEPLOYED_CHAIN_ID = block.chainid;
        creationFee = _creationFee;
        platformTreasury = _platformTreasury;
        platformFeePercentage = 250; // 2.5%
        freeMintPlatformFee = 0.001 ether;
    }
    
    // ============ MAIN FUNCTION ============
    function createLaunchpad(DeploymentRequest memory request) 
        external 
        payable 
        nonReentrant 
        returns (address) 
    {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(request.totalMaxSupply > 0, "Invalid supply");
        require(request.treasury != address(0), "Invalid treasury");
        
        // Create collection config
        NFTCollection.CollectionConfig memory config = NFTCollection.CollectionConfig({
            name: request.name,
            symbol: request.symbol,
            baseURI: request.baseURI,
            unrevealedURI: request.unrevealedURI,
            contractURI: request.contractURI,
            totalMaxSupply: request.totalMaxSupply,
            treasury: request.treasury,
            royaltyRecipient: request.royaltyRecipient,
            royaltyPercentage: request.royaltyPercentage,
            isRevealed: false,
            chainId: block.chainid
        });
        
        // Deploy new collection
        NFTCollection collection = new NFTCollection(
            config,
            platformTreasury
        );
        
        address collectionAddress = address(collection);
        
        // Store launchpad info
        launchpads[collectionAddress] = LaunchpadInfo({
            launchpadAddress: collectionAddress,
            creator: msg.sender,
            name: request.name,
            symbol: request.symbol,
            createdAt: block.timestamp,
            totalSupply: request.totalMaxSupply
        });
        
        allLaunchpads.push(collectionAddress);
        
        // Transfer creation fee to treasury
        if (creationFee > 0) {
            platformTreasury.transfer(creationFee);
        }
        
        // Refund excess
        if (msg.value > creationFee) {
            payable(msg.sender).transfer(msg.value - creationFee);
        }
        
        emit LaunchpadCreated(
            collectionAddress,
            msg.sender,
            request.name,
            request.symbol,
            request.totalMaxSupply,
            block.timestamp
        );
        
        return collectionAddress;
    }
    
    // ============ VIEW FUNCTIONS ============
    function getAllLaunchpads() external view returns (address[] memory) {
        return allLaunchpads;
    }
    
    function totalLaunchpads() external view returns (uint256) {
        return allLaunchpads.length;
    }
    
    function getLaunchpadInfo(address launchpadAddress) 
        external 
        view 
        returns (LaunchpadInfo memory) 
    {
        return launchpads[launchpadAddress];
    }
    
    function getFactoryInfo() 
        external 
        view 
        returns (
            string memory version,
            uint256 chainId,
            uint256 totalCollections,
            uint256 creationFeeAmount,
            address treasury
        ) 
    {
        return (
            FACTORY_VERSION,
            DEPLOYED_CHAIN_ID,
            allLaunchpads.length,
            creationFee,
            platformTreasury
        );
    }
    
    function getPlatformFeeInfo() 
        external 
        view 
        returns (
            uint256 percentage,
            uint256 freeMintFee,
            address treasury
        ) 
    {
        return (
            platformFeePercentage,
            freeMintPlatformFee,
            platformTreasury
        );
    }
    
    // ============ ADMIN FUNCTIONS ============
    function setCreationFee(uint256 newFee) external onlyOwner {
        creationFee = newFee;
        emit CreationFeeUpdated(newFee);
    }
    
    function setPlatformFee(uint256 percentage, uint256 freeMintFee) 
        external 
        onlyOwner 
    {
        require(percentage <= 1000, "Max 10%"); // 1000 = 10%
        platformFeePercentage = percentage;
        freeMintPlatformFee = freeMintFee;
        emit PlatformFeeUpdated(percentage, freeMintFee);
    }
    
    function setPlatformTreasury(address payable newTreasury) 
        external 
        onlyOwner 
    {
        require(newTreasury != address(0), "Invalid address");
        platformTreasury = newTreasury;
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // ============ RECEIVE ETH ============
    receive() external payable {}
}
```


---

## 🧪 TESTING EXAMPLES

### Test Script - Hardhat

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Launchpad", function () {
    let factory, collection;
    let owner, creator, user1, user2;
    let creationFee = ethers.parseEther("0.01");

    beforeEach(async function () {
        [owner, creator, user1, user2] = await ethers.getSigners();

        // Deploy Factory
        const Factory = await ethers.getContractFactory("LaunchpadFactory");
        factory = await Factory.deploy(creationFee, owner.address);
        await factory.waitForDeployment();
    });

    describe("Factory", function () {
        it("Should create launchpad with fee", async function () {
            const deploymentRequest = {
                name: "Test NFT",
                symbol: "TEST",
                description: "Test collection",
                baseURI: "ipfs://test/",
                unrevealedURI: "ipfs://unrevealed",
                contractURI: "ipfs://contract",
                externalLink: "https://test.com",
                totalMaxSupply: 10000,
                treasury: creator.address,
                royaltyRecipient: creator.address,
                royaltyPercentage: 500 // 5%
            };

            const tx = await factory.connect(creator).createLaunchpad(
                deploymentRequest,
                { value: creationFee }
            );

            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'LaunchpadCreated');
            const collectionAddress = event.args.launchpadAddress;

            expect(collectionAddress).to.not.equal(ethers.ZeroAddress);
        });

        it("Should fail without creation fee", async function () {
            const deploymentRequest = { /* ... */ };

            await expect(
                factory.connect(creator).createLaunchpad(deploymentRequest)
            ).to.be.revertedWith("Insufficient creation fee");
        });
    });

    describe("Minting", function () {
        beforeEach(async function () {
            // Create collection
            const deploymentRequest = { /* ... */ };
            const tx = await factory.connect(creator).createLaunchpad(
                deploymentRequest,
                { value: creationFee }
            );
            const receipt = await tx.wait();
            const collectionAddress = receipt.events[0].args.launchpadAddress;
            
            collection = await ethers.getContractAt("NFTCollection", collectionAddress);

            // Add phases
            const phases = [
                {
                    name: "Public Mint",
                    startTime: Math.floor(Date.now() / 1000),
                    endTime: Math.floor(Date.now() / 1000) + 86400,
                    price: ethers.parseEther("0.05"),
                    maxSupply: 1000,
                    maxPerWallet: 5,
                    maxPerTransaction: 3,
                    merkleRoot: ethers.ZeroHash,
                    requiresWhitelist: false
                }
            ];

            await collection.connect(creator).batchAddMintPhases(phases);
        });

        it("Should mint with correct payment", async function () {
            const phaseId = 0;
            const quantity = 2;
            
            const { totalCost } = await collection.calculateMintCost(phaseId, quantity);
            
            await expect(
                collection.connect(user1).mint(phaseId, quantity, [], { value: totalCost })
            ).to.emit(collection, "Minted");

            expect(await collection.balanceOf(user1.address)).to.equal(quantity);
        });

        it("Should fail with insufficient payment", async function () {
            const phaseId = 0;
            const quantity = 2;
            
            await expect(
                collection.connect(user1).mint(phaseId, quantity, [], { 
                    value: ethers.parseEther("0.01") 
                })
            ).to.be.revertedWith("Insufficient payment");
        });

        it("Should enforce wallet limit", async function () {
            const phaseId = 0;
            const quantity = 6; // Max is 5
            
            const { totalCost } = await collection.calculateMintCost(phaseId, quantity);
            
            await expect(
                collection.connect(user1).mint(phaseId, quantity, [], { value: totalCost })
            ).to.be.revertedWith("Wallet limit exceeded");
        });
    });

    describe("Whitelist", function () {
        it("Should verify merkle proof", async function () {
            // Generate merkle tree
            const { MerkleTree } = require('merkletreejs');
            const { keccak256 } = require('ethers');
            
            const addresses = [user1.address, user2.address];
            const leaves = addresses.map(addr => 
                keccak256(ethers.solidityPacked(['address', 'uint256'], [addr, 2]))
            );
            const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
            const root = tree.getHexRoot();
            
            // Add whitelist phase
            const phases = [{
                name: "Whitelist",
                startTime: Math.floor(Date.now() / 1000),
                endTime: Math.floor(Date.now() / 1000) + 86400,
                price: ethers.parseEther("0.03"),
                maxSupply: 500,
                maxPerWallet: 2,
                maxPerTransaction: 2,
                merkleRoot: root,
                requiresWhitelist: true
            }];
            
            await collection.connect(creator).batchAddMintPhases(phases);
            
            // Get proof for user1
            const leaf = keccak256(
                ethers.solidityPacked(['address', 'uint256'], [user1.address, 2])
            );
            const proof = tree.getHexProof(leaf);
            
            // Mint with proof
            const { totalCost } = await collection.calculateMintCost(0, 1);
            await expect(
                collection.connect(user1).mint(0, 1, proof, { value: totalCost })
            ).to.emit(collection, "Minted");
        });
    });
});
```


---

## 🚀 DEPLOYMENT SCRIPT

### deploy.js - Hardhat Deployment

```javascript
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting deployment...\n");

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

    // Configuration
    const CREATION_FEE = ethers.parseEther("0.01"); // 0.01 ETH
    const PLATFORM_TREASURY = deployer.address; // Change to actual treasury

    // Deploy Factory
    console.log("📦 Deploying LaunchpadFactory...");
    const Factory = await ethers.getContractFactory("LaunchpadFactory");
    const factory = await Factory.deploy(CREATION_FEE, PLATFORM_TREASURY);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("✅ LaunchpadFactory deployed to:", factoryAddress);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const factoryInfo = await factory.getFactoryInfo();
    console.log("   Version:", factoryInfo.version);
    console.log("   Chain ID:", factoryInfo.chainId.toString());
    console.log("   Creation Fee:", ethers.formatEther(factoryInfo.creationFeeAmount), "ETH");
    console.log("   Treasury:", factoryInfo.treasury);

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        factoryAddress: factoryAddress,
        creationFee: ethers.formatEther(CREATION_FEE),
        platformTreasury: PLATFORM_TREASURY,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };

    fs.writeFileSync(
        `deployments/${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n💾 Deployment info saved to deployments/" + hre.network.name + ".json");

    // Verify on Etherscan (if not localhost)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n⏳ Waiting for block confirmations...");
        await factory.deploymentTransaction().wait(5);

        console.log("🔍 Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: factoryAddress,
                constructorArguments: [CREATION_FEE, PLATFORM_TREASURY],
            });
            console.log("✅ Contract verified on Etherscan");
        } catch (error) {
            console.log("❌ Verification failed:", error.message);
        }
    }

    console.log("\n✨ Deployment complete!\n");
    console.log("📋 Summary:");
    console.log("   Factory Address:", factoryAddress);
    console.log("   Network:", hre.network.name);
    console.log("   Creation Fee:", ethers.formatEther(CREATION_FEE), "ETH");
    console.log("\n🎉 Ready to create NFT collections!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

### hardhat.config.js

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111
        },
        megaeth: {
            url: process.env.MEGAETH_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 6342
        }
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || "",
            megaeth: process.env.MEGAETH_API_KEY || ""
        }
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
```


---

## 🔧 FRONTEND INTEGRATION EXAMPLES

### React Hook - useContract.ts

```typescript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import LaunchpadFactoryABI from '@/abi/LaunchpadFactory.abi.json';
import NFTCollectionABI from '@/abi/NFTCollection.abi.json';

export function useFactoryContract(chainId: number) {
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            if (!window.ethereum) return;

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            const factoryAddress = getFactoryAddress(chainId);
            const factoryContract = new ethers.Contract(
                factoryAddress,
                LaunchpadFactoryABI,
                signer
            );

            setContract(factoryContract);
            setLoading(false);
        }

        init();
    }, [chainId]);

    return { contract, loading };
}

export function useCollectionContract(chainId: number, address: string) {
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            if (!window.ethereum || !address) return;

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            const collectionContract = new ethers.Contract(
                address,
                NFTCollectionABI,
                signer
            );

            setContract(collectionContract);
            setLoading(false);
        }

        init();
    }, [chainId, address]);

    return { contract, loading };
}
```

### Create Collection Component

```typescript
import { useState } from 'react';
import { useFactoryContract } from '@/hooks/useContract';
import { toast } from 'sonner';

export function CreateCollectionForm() {
    const { contract: factoryContract } = useFactoryContract(6342);
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        totalMaxSupply: 10000,
        treasury: '',
        royaltyRecipient: '',
        royaltyPercentage: 500
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!factoryContract) {
            toast.error('Contract not loaded');
            return;
        }

        try {
            // Get creation fee
            const creationFee = await factoryContract.creationFee();

            // Prepare deployment request
            const deploymentRequest = {
                name: formData.name,
                symbol: formData.symbol,
                description: "My NFT Collection",
                baseURI: "ipfs://...",
                unrevealedURI: "ipfs://unrevealed",
                contractURI: "ipfs://contract",
                externalLink: "https://myproject.com",
                totalMaxSupply: formData.totalMaxSupply,
                treasury: formData.treasury,
                royaltyRecipient: formData.royaltyRecipient,
                royaltyPercentage: formData.royaltyPercentage
            };

            // Deploy collection
            toast.loading('Deploying collection...');
            const tx = await factoryContract.createLaunchpad(
                deploymentRequest,
                { value: creationFee }
            );

            toast.loading('Waiting for confirmation...');
            const receipt = await tx.wait();

            // Get collection address from event
            const event = receipt.logs.find(
                (log: any) => log.eventName === 'LaunchpadCreated'
            );
            const collectionAddress = event.args.launchpadAddress;

            toast.success('Collection deployed!', {
                description: `Address: ${collectionAddress}`
            });

            // Redirect to collection page
            window.location.href = `/collection/${collectionAddress}`;

        } catch (error: any) {
            console.error('Deployment failed:', error);
            toast.error('Deployment failed', {
                description: error.message
            });
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Collection Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {/* ... other inputs ... */}
            <button type="submit">Deploy Collection</button>
        </form>
    );
}
```

### Mint Component

```typescript
import { useState, useEffect } from 'react';
import { useCollectionContract } from '@/hooks/useContract';
import { toast } from 'sonner';

export function MintComponent({ collectionAddress }: { collectionAddress: string }) {
    const { contract } = useCollectionContract(6342, collectionAddress);
    const [phases, setPhases] = useState<any[]>([]);
    const [selectedPhase, setSelectedPhase] = useState(0);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        loadPhases();
    }, [contract]);

    const loadPhases = async () => {
        if (!contract) return;

        const count = await contract.getMintPhasesCount();
        const loadedPhases = [];

        for (let i = 0; i < count; i++) {
            const phase = await contract.getMintPhase(i);
            loadedPhases.push(phase);
        }

        setPhases(loadedPhases);
    };

    const handleMint = async () => {
        if (!contract) return;

        try {
            // Calculate cost
            const { totalCost } = await contract.calculateMintCost(
                selectedPhase,
                quantity
            );

            // Get merkle proof if needed
            let merkleProof: string[] = [];
            const phase = phases[selectedPhase];
            if (phase.requiresWhitelist) {
                const response = await fetch(
                    `/api/whitelist/proof?address=${userAddress}&phaseId=${selectedPhase}`
                );
                const data = await response.json();
                merkleProof = data.proof;
            }

            // Mint
            toast.loading('Minting...');
            const tx = await contract.mint(
                selectedPhase,
                quantity,
                merkleProof,
                { value: totalCost }
            );

            toast.loading('Waiting for confirmation...');
            await tx.wait();

            toast.success('Minted successfully!');

        } catch (error: any) {
            console.error('Mint failed:', error);
            toast.error('Mint failed', {
                description: error.message
            });
        }
    };

    return (
        <div>
            <select 
                value={selectedPhase} 
                onChange={(e) => setSelectedPhase(Number(e.target.value))}
            >
                {phases.map((phase, i) => (
                    <option key={i} value={i}>
                        {phase.name} - {ethers.formatEther(phase.price)} ETH
                    </option>
                ))}
            </select>

            <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <button onClick={handleMint}>
                Mint {quantity} NFT{quantity > 1 ? 's' : ''}
            </button>
        </div>
    );
}
```

---

**📚 Complete Examples:**
- Full contract code with all features
- Comprehensive test suite
- Deployment scripts
- Frontend integration examples
- React hooks for contract interaction

**Last Updated:** 2025-01-18
