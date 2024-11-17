// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

contract Logistics {
    // Адрес аккаунта, который запустил смарт-контракт
    address initiator;

    // Данные для каждого участника, зарегистрированного в контракте
    struct memberState {
        uint balance;
        uint reputation;
    }

    // Состояние данных для каждой транзакции доставки, выполненной через смарт-контракт
    // Коды статусов:
    // 0 = ожидается, 1 = в процессе, 2 = завершено, 3 = подтверждено
    struct deliveryState {
        uint deliveryFee;
        uint status;
        uint hashedDeliveryDetails;
        address owner;
        address assistingMember;
    }

    // Маппинги участников и данных о доставке
    mapping(address => memberState) public membersData;
    mapping(address => uint) members;
    mapping(uint => deliveryState) public deliveryData;

    // Модификаторы
    modifier onlyMember {
        require(members[msg.sender] == 1, "Not a registered member");
        _;
    }

    // Ошибки
    error notAuthorized(string reason);
    error insufficientFee(string reason, uint registrationFee);

    constructor() payable {
        initiator = msg.sender;
        require(msg.value >= 10 ether, "Minimum deposit of 10 ETH required");
        // Регистрация инициатора как участника
        members[msg.sender] = 1;
        membersData[msg.sender].balance = msg.value;
        membersData[msg.sender].reputation = 10;
    }

    function register() public payable {
        uint registrationFee = msg.value;
        address newMember = msg.sender;
        if (registrationFee < 10 ether) {
            revert insufficientFee({
                reason: "Ether value is less than the required registration fee",
                registrationFee: 10 ether
            });
        }
        members[newMember] = 1;
        membersData[newMember].balance = msg.value;
        membersData[newMember].reputation = 10;
    }

    function requestForDelivery(uint hashedDeliveryDetails) public payable onlyMember {
        uint senderReputation = membersData[msg.sender].reputation;
        if (senderReputation < 7) {
            revert notAuthorized({
                reason: "You have a low reputation. Complete more deliveries to increase your reputation"
            });
        }

        // Установка данных доставки
        deliveryData[hashedDeliveryDetails].deliveryFee = msg.value;
        deliveryData[hashedDeliveryDetails].status = 0;
        deliveryData[hashedDeliveryDetails].hashedDeliveryDetails = hashedDeliveryDetails;
        deliveryData[hashedDeliveryDetails].owner = msg.sender;

        // Увеличение баланса участника
        membersData[msg.sender].balance += msg.value;
    }

    function respondToDeliveryRequest(uint hashedDeliveryDetails) public onlyMember {
        uint memberReputation = membersData[msg.sender].reputation;
        if (memberReputation < 1) {
            revert notAuthorized({
                reason: "You have exhausted your reputation"
            });
        }
        uint deliveryStatus = deliveryData[hashedDeliveryDetails].status;
        if (deliveryStatus != 0) {
            revert notAuthorized({
                reason: "This delivery is no longer available"
            });
        }

        // Обновление статуса доставки и добавление ассистирующего участника
        deliveryData[hashedDeliveryDetails].status = 1;
        deliveryData[hashedDeliveryDetails].assistingMember = msg.sender;
    }

    function markDeliveryAsCompleted(uint hashedDeliveryDetails) public onlyMember {
        address assistingMember = deliveryData[hashedDeliveryDetails].assistingMember;
        if (assistingMember != msg.sender) {
            revert notAuthorized({
                reason: "You don't have access to update this delivery"
            });
        }
        // Обновление статуса доставки как завершенной
        deliveryData[hashedDeliveryDetails].status = 2;
    }

    function markDeliveryAsCancelled(uint hashedDeliveryDetails) public onlyMember {
        address assistingMember = deliveryData[hashedDeliveryDetails].assistingMember;
        address deliveryOwner = deliveryData[hashedDeliveryDetails].owner;
        if (assistingMember != msg.sender && msg.sender != deliveryOwner) {
            revert notAuthorized({
                reason: "You don't have access to update this delivery"
            });
        }

        // Сброс статуса доставки
        deliveryData[hashedDeliveryDetails].status = 0;

        // Уменьшение репутации участника за отмену
        if (assistingMember == msg.sender) {
            membersData[msg.sender].reputation -= 5;
        }

        if (msg.sender == initiator) {
            membersData[msg.sender].reputation -= 6;
        }
    }

    function markDeliveryAsConfirmed(uint hashedDeliveryDetails) public onlyMember {
        address deliveryOwner = deliveryData[hashedDeliveryDetails].owner;
        if (deliveryOwner != msg.sender && msg.sender != initiator) {
            revert notAuthorized({
                reason: "You don't have access to confirm this delivery"
            });
        }

        // Подтверждение доставки
        deliveryData[hashedDeliveryDetails].status = 3;

        // Перевод средств за доставку
        address assistingMember = deliveryData[hashedDeliveryDetails].assistingMember;
        uint deliveryFee = deliveryData[hashedDeliveryDetails].deliveryFee;

        membersData[deliveryOwner].balance -= deliveryFee;

        membersData[assistingMember].reputation += 1;
        membersData[assistingMember].balance += deliveryFee;
    }

    function withdraw(uint amount) public onlyMember {
        uint balance = membersData[msg.sender].balance;

        require(balance >= amount, "Insufficient balance to withdraw");
        require(balance - amount >= 10 ether, "Withdrawal would reduce balance below 10 ETH");
        require(amount > 0, "Withdrawal amount must be greater than 0");

        // Уменьшение баланса участника
        membersData[msg.sender].balance -= amount;

        // Перевод средств участнику
        payable(msg.sender).transfer(amount);
    }
}
