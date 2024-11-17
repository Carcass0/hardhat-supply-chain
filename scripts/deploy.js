const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();


async function main() {
    // Get the contract factory
    const Logistics = await ethers.getContractFactory("Logistics");

    // Deploy the contract with initial funds
    const logistics = await Logistics.deploy({ value: ethers.parseEther("10") }); // Use ethers.utils.parseEther

    await logistics.waitForDeployment();

    console.log("Logistics contract deployed to:", await logistics.getAddress());

    const envPath = path.resolve(__dirname, "../.env");
    
    let envContent = "";
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
    }

    // Update or add the ADDRESS property
    const updatedEnvContent = envContent
        .split("\n")
        .filter((line) => !line.startsWith("ADDRESS="))
        .concat(`ADDRESS=${await logistics.getAddress()}`)
        .join("\n");

    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, updatedEnvContent);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
