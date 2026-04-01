// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/MahjongArena.sol";

contract DeployMahjongArena is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerKey);

        MahjongArena arena = new MahjongArena();
        console.log("MahjongArena deployed at:", address(arena));

        arena.createGameLobby(0.01 ether);
        console.log("Game Lobby #0 created (0.01 BNB)");

        arena.createTournament(0.01 ether, 4, 500);
        console.log("Tournament #0 created (0.01 BNB, 4 rounds, 5% fee)");

        vm.stopBroadcast();
    }
}
