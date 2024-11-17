const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Logistics Contract", function () {
    async function deployLogisticsFixture() {
        const [deployer, user1, user2, user3] = await ethers.getSigners();

        const Logistics = await ethers.getContractFactory("Logistics");
        const logistics = await Logistics.deploy({ value: ethers.parseEther("10") });

        await logistics.waitForDeployment();

        return { logistics, deployer, user1, user2, user3 };
    }

    it("Деплой контракта", async function () {
        const { logistics } = await deployLogisticsFixture();

        const balance = await ethers.provider.getBalance(await logistics.getAddress());
        console.log(`Contract balance: ${ethers.formatEther(balance)} ETH`);
        expect(balance).to.equal(ethers.parseEther("10"));
    });

    it("Регистрация двух пользователей и неуспешная регистрация третьего", async function () {
        const { logistics, user1, user2, user3 } = await deployLogisticsFixture();
    
        // Регистрация первого пользователя
        await logistics.connect(user1).register({ value: ethers.parseEther("10") });
        console.log(`User1 registered with 10 ETH`);
    
        // Регистрация второго пользователя
        await logistics.connect(user2).register({ value: ethers.parseEther("15") });
        console.log(`User2 registered with 15 ETH`);
    
        // Попытка регистрации третьего пользователя с недостаточной суммой
        await expect(
            logistics.connect(user3).register({ value: ethers.parseEther("1") })
        ).to.be.revertedWithCustomError(logistics, "insufficientFee")
        .withArgs("Ether value is less than the required registration fee", ethers.parseEther("10"));
        console.log(`User3 failed to register with 1 ETH due to insufficient fee`);
    
        // Проверка данных зарегистрированных пользователей
        const user1Data = await logistics.membersData(user1.address);
        const user2Data = await logistics.membersData(user2.address);
    
        expect(user1Data.balance).to.equal(ethers.parseEther("10"));
        expect(user2Data.balance).to.equal(ethers.parseEther("15"));
    });
    

    it("Успешный полный процесс доставки", async function () {
        const { logistics, user1, user2 } = await deployLogisticsFixture();

        await logistics.connect(user1).register({ value: ethers.parseEther("10") });
        await logistics.connect(user2).register({ value: ethers.parseEther("10") });

        const deliveryHash = ethers.id("Delivery Details");

        await logistics.connect(user1).requestForDelivery(deliveryHash, {
            value: ethers.parseEther("0.5"),
        });
        console.log("Delivery request created by User1");

        await logistics.connect(user2).respondToDeliveryRequest(deliveryHash);
        console.log("User2 accepted the delivery request");

        await logistics.connect(user2).markDeliveryAsCompleted(deliveryHash);
        console.log("User2 marked delivery as completed");

        await logistics.connect(user1).markDeliveryAsConfirmed(deliveryHash);
        console.log("User1 confirmed the delivery");

        const user2Data = await logistics.membersData(user2.address);
        expect(user2Data.balance).to.equal(ethers.parseEther("10.5"));
    });

    it("Отмена доставки на этапе выполнения инициатором", async function () {
        const { logistics, user1, user2 } = await deployLogisticsFixture();

        await logistics.connect(user1).register({ value: ethers.parseEther("10") });
        await logistics.connect(user2).register({ value: ethers.parseEther("10") });

        const deliveryHash = ethers.id("Delivery Details");

        await logistics.connect(user1).requestForDelivery(deliveryHash, {
            value: ethers.parseEther("0.5"),
        });
        await logistics.connect(user2).respondToDeliveryRequest(deliveryHash);

        await logistics.connect(user1).markDeliveryAsCancelled(deliveryHash);
        console.log("User1 cancelled the delivery");

        const deliveryData = await logistics.deliveryData(deliveryHash);
        expect(deliveryData.status).to.equal(0);
    });

    it("Отмена доставки на этапе выполнения помогающей компанией", async function () {
        const { logistics, user1, user2 } = await deployLogisticsFixture();

        await logistics.connect(user1).register({ value: ethers.parseEther("10") });
        await logistics.connect(user2).register({ value: ethers.parseEther("10") });

        const deliveryHash = ethers.id("Delivery Details");

        await logistics.connect(user1).requestForDelivery(deliveryHash, {
            value: ethers.parseEther("0.5"),
        });
        await logistics.connect(user2).respondToDeliveryRequest(deliveryHash);

        await logistics.connect(user2).markDeliveryAsCancelled(deliveryHash);
        console.log("User2 cancelled the delivery");

        const deliveryData = await logistics.deliveryData(deliveryHash);
        expect(deliveryData.status).to.equal(0);
    });

    it("Отказ в запросе доставки из-за низкой репутации", async function () {
        const { logistics, user1, user2 } = await deployLogisticsFixture();
        await logistics.connect(user1).register({ value: ethers.parseEther("10") });
        await logistics.connect(user2).register({ value: ethers.parseEther("10") });
        deliveryHash = ethers.id("Delivery Details");
        await logistics.connect(user1).requestForDelivery(deliveryHash, {value: ethers.parseEther("0.5"),});
        await logistics.connect(user2).respondToDeliveryRequest(deliveryHash);
        await logistics.connect(user2).markDeliveryAsCancelled(deliveryHash);

        user2Data = await logistics.membersData(user2.address)
        console.log("User2's reputation: ", user2Data.reputation.toString())
        deliveryHash = ethers.id("Delivery Details");
        await expect(
            logistics.connect(user2).requestForDelivery(deliveryHash, {
                value: ethers.parseEther("0.5"),
            })
        ).to.be.revertedWithCustomError(logistics, "notAuthorized")
        .withArgs("You have a low reputation. Complete more deliveries to increase your reputation");
    });

    it("Успешный вывод средств", async function () {
        const { logistics, user1 } = await deployLogisticsFixture();

        await logistics.connect(user1).register({ value: ethers.parseEther("15") });

        await logistics.connect(user1).withdraw(ethers.parseEther("5"));
        console.log("User1 successfully withdrew 5 ETH");

        const user1Data = await logistics.membersData(user1.address);
        expect(user1Data.balance).to.equal(ethers.parseEther("10"));
    });

    it("Отказ в выводе средств, уменьшающем баланс до <10 ETH", async function () {
        const { logistics, user1 } = await deployLogisticsFixture();

        await logistics.connect(user1).register({ value: ethers.parseEther("15") });

        await expect(
            logistics.connect(user1).withdraw(ethers.parseEther("6"))
        ).to.be.revertedWith("Withdrawal would reduce balance below 10 ETH");
        console.log("Withdrawal rejected because it would leave balance <10 ETH");
    });
});
