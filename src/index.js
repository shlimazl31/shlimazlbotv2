const { ClusterManager } = require("discord-hybrid-sharding");
require("dotenv").config();
const api = require("./api");

const manager = new ClusterManager(`${__dirname}/clients/manager.js`, {
    totalShards: "auto",
    shardsPerClusters: 2,
    totalClusters: "auto",
    mode: "process",
    token: process.env.TOKEN,
    respawn: true
});

manager.on("clusterCreate", (cluster) => {
    console.log(`[INFO] Launched cluster ${cluster.id}`);
    
    // Her cluster hazır olduğunda API'yi başlat
    cluster.on('ready', () => {
        console.log(`[INFO] Cluster ${cluster.id} is ready, starting API...`);
        // Cluster'ı API'ye ilet
        api.start(cluster);
    });

    // Cluster hata verdiğinde
    cluster.on('error', (error) => {
        console.error(`[ERROR] Cluster ${cluster.id} error:`, error);
    });
});

manager.spawn({ timeout: -1 });