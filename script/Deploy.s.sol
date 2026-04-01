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
        
        // Oracle = deployer（测试阶段自己当 Oracle）
        MahjongArena arena = new MahjongArena(deployer);
        console.log("MahjongArena deployed at:", address(arena));
        
        // 创建第一个锦标赛：0.01 BNB 报名，8 局，5% 平台费
        uint256 id = arena.createTournament(0.01 ether, 8, 500);
        console.log("Tournament #0 created");
        
        vm.stopBroadcast();
    }
}
