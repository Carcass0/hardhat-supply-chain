const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
    // Получение фабрики контракта
    const Logistics = await ethers.getContractFactory("Logistics");

    // Деплой контракта с начальным балансом
    const logistics = await Logistics.deploy({ value: ethers.parseEther("10") });
    await logistics.waitForDeployment();

    console.log("Контракт Logistics развернут по адресу:", await logistics.getAddress());

    const envPath = path.resolve(__dirname, "../.env");
    
    let envContent = "";
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
    }

    // Обновление или добавление свойства ADDRESS
    const updatedEnvContent = envContent
        .split("\n")
        .filter((line) => !line.startsWith("ADDRESS="))
        .concat(`ADDRESS=${await logistics.getAddress()}`)
        .join("\n");

    // Запись обновленного содержимого обратно в файл .env
    fs.writeFileSync(envPath, updatedEnvContent);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
