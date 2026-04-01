// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MahjongArena.sol";

contract DeployMahjongArena is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerKey);

        MahjongArena arena = new MahjongArena();
        console.log("MahjongArena deployed at:", address(arena));

        // 创建默认 Lobby: 0.01 BNB
        arena.createGameLobby(0.01 ether);
        console.log("Game Lobby #0 created (0.01 BNB)");

        // 创建默认锦标赛: 0.1 BNB
        arena.createTournament(0.1 ether);
        console.log("Tournament #0 created (0.1 BNB)");

        vm.stopBroadcast();
    }
}
