require("dotenv").config();

async function main() {
    const hre = require("hardhat");
    const ethers = hre.ethers;
    const contractAddress = process.env.ADDRESS;
    if (!contractAddress) {
        throw new Error("Contract address not found in .env file. Ensure ADDRESS is set.");
    }

    // Загрузка контракта
    const logistics = await ethers.getContractAt("Logistics", contractAddress);
    console.log("Contract loaded:", await logistics.getAddress());
    console.log('\n');

    //Проверка баланса
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance:", ethers.formatEther(contractBalance), "ETH");
    console.log('\n');

    //Регистрация пользователей
    const [deployer, user1, user2] = await ethers.getSigners();
    tx = await logistics.connect(user1).register({ value: ethers.parseEther("15") });
    await tx.wait();
    console.log("User registered!");
    const memberData = await logistics.membersData(user1.address);
    console.log("User balance:", ethers.formatEther(memberData.balance));
    console.log("User reputation:", memberData.reputation);
    console.log('\n');

    //Создание запроса на доставку
    const hashedDeliveryDetails = ethers.id("SampleDeliveryDetails");
    tx = await logistics.connect(user1).requestForDelivery(hashedDeliveryDetails, {
    value: ethers.parseEther("2"),});
    await tx.wait();
    console.log("Delivery request created!");
    const deliveryData = await logistics.deliveryData(hashedDeliveryDetails);
    console.log("Delivery status:", deliveryData.status); // Should show 0 (pending)
    console.log("Delivery fee:", ethers.formatEther(deliveryData.deliveryFee));
    console.log("Hashed delivery data:", deliveryData.hashedDeliveryDetails);
    console.log('\n');

    //Ответ на запрос на доставку
    tx = await logistics.connect(user2).register({ value: ethers.parseEther("10") });
    tx = await logistics.connect(user2).respondToDeliveryRequest(hashedDeliveryDetails);
    await tx.wait();
    console.log("Delivery request accepted!");
    updatedDelivery = await logistics.deliveryData(hashedDeliveryDetails);
    console.log("Delivery status:", updatedDelivery.status);
    console.log("Assisting member:", updatedDelivery.assistingMember);
    console.log('\n')

    //Отметка доставки как законченной
    tx = await logistics.connect(user2).markDeliveryAsCompleted(hashedDeliveryDetails);
    await tx.wait();
    console.log("Delivery marked as completed!");
    updatedDelivery = await logistics.deliveryData(hashedDeliveryDetails);
    console.log("Delivery status:", updatedDelivery.status);
    console.log('\n') 

    //Отметка доставки как принятой
    tx = await logistics.connect(user1).markDeliveryAsConfirmed(hashedDeliveryDetails);
    await tx.wait();
    console.log("Delivery confirmed!");
    assistingMemberData = await logistics.membersData(user2.address);
    console.log("Assisting member balance:", ethers.formatEther(assistingMemberData.balance));
    console.log("Assisting member reputation:", assistingMemberData.reputation);
}

// Call the main function
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
