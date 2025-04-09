---
title: "Redis Sentinel - 1"

date: "2025-04-09"

description: "介绍redis sentinel模式"

---
# Redis Sentinel - 1
redis sentinel是一种redis的分布式部署模式，它具有三种节点，分别是：
1. sentinel节点 （监控节点，监控master节点状态）
2. master节点 （主节点，读或写，一般为1个，多个情况暂不考虑）
3. slave节点 （备份节点，备份（同步）主节点数据，可分摊读的压力，一般有多个，但对于1个master）

这种部署模式具有以下特点：
1. redis节点易监控
2. redis节点变化可通知
3. 自动故障转移
4. sentinel节点可作为配置中心使用

## 应用场景
下面我们使用redis sentinel模式实现分布式锁的高可用

### redis sentinel的部署
我们在此使用docker以及docker compose实现快速单机部署（在实际生产中，不同节点尽量部署在不同地域的不同物理机器上，最大程度提高可用性，避免同时故障）
#### compose yaml
我们定义6个主要redis sentinel相关的节点：
1. redis-master
2. redis-slave-1
3. redis-slave-2
4. sentinel-1
5. sentinel-2
6. sentinel-3

另外包含一个便于查看集群状态的监控应用节点：redisinsight

详细的docker compose定义文件如下（compose.yaml）：
```yaml
services:
  redis-master:
    image: redis:latest
    container_name: redis-master
    hostname: redis-master
    ports:
      - "6379:6379"
    volumes:
      - ./data/master:/data
    command:
      [
        "redis-server",
        "--appendonly",
        "yes",
        "--repl-diskless-load",
        "on-empty-db",
        "--replica-announce-ip",
        "${HOST_IP}",
        "--replica-announce-port",
        "6379",
        "--protected-mode",
        "no"
      ]
    networks:
      redis-net:
        ipv4_address: 172.21.0.3


  redis-slave-1:
    image: redis:latest
    container_name: redis-slave-1
    hostname: redis-slave-1
    depends_on:
      - redis-master
    ports:
      - "6380:6379"
    volumes:
      - ./data/slave1:/data
    command:
      [
        "redis-server",
        "--appendonly",
        "yes",
        "--replicaof",
        "redis-master",
        "6379",
        "--repl-diskless-load",
        "on-empty-db",
        "--replica-announce-ip",
        "${HOST_IP}",
        "--replica-announce-port",
        "6380",
        "--protected-mode",
        "no"
      ]
    networks:
      redis-net:
        ipv4_address: 172.21.0.4


  redis-slave-2:
    image: redis:latest
    container_name: redis-slave-2
    hostname: redis-slave-2
    depends_on:
      - redis-master
    ports:
      - "6381:6379"
    volumes:
      - ./data/slave2:/data
    command:
      [
        "redis-server",
        "--appendonly",
        "yes",
        "--replicaof",
        "redis-master",
        "6379",
        "--repl-diskless-load",
        "on-empty-db",
        "--replica-announce-ip",
        "${HOST_IP}",
        "--replica-announce-port",
        "6381",
        "--protected-mode",
        "no"
      ]
    networks:
      redis-net:
        ipv4_address: 172.21.0.5


  sentinel-1:
    image: redis:latest
    container_name: sentinel-1
    hostname: sentinel-1
    depends_on:
      - redis-master
    ports:
      - "26379:26379"
    command: >
      sh -c 'echo "bind 0.0.0.0" > /etc/sentinel.conf &&
            echo "sentinel monitor mymaster ${HOST_IP} 6379 2" >> /etc/sentinel.conf &&
            echo "sentinel resolve-hostnames yes" >> /etc/sentinel.conf &&
            echo "sentinel down-after-milliseconds mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel failover-timeout mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel parallel-syncs mymaster 1" >> /etc/sentinel.conf &&
            redis-sentinel /etc/sentinel.conf'
    networks:
      redis-net:
        ipv4_address: 172.21.0.6


  sentinel-2:
    image: redis:latest
    container_name: sentinel-2
    hostname: sentinel-2
    depends_on:
      - redis-master
    ports:
      - "26380:26379"
    command: >
      sh -c 'echo "bind 0.0.0.0" > /etc/sentinel.conf &&
            echo "sentinel monitor mymaster ${HOST_IP} 6379 2" >> /etc/sentinel.conf &&
            echo "sentinel resolve-hostnames yes" >> /etc/sentinel.conf &&
            echo "sentinel down-after-milliseconds mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel failover-timeout mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel parallel-syncs mymaster 1" >> /etc/sentinel.conf &&
            redis-sentinel /etc/sentinel.conf'
    networks:
      redis-net:
        ipv4_address: 172.21.0.7

  sentinel-3:
    image: redis:latest
    container_name: sentinel-3
    hostname: sentinel-3
    depends_on:
      - redis-master
    ports:
      - "26381:26379"
    command: >
      sh -c 'echo "bind 0.0.0.0" > /etc/sentinel.conf &&
            echo "sentinel monitor mymaster ${HOST_IP} 6379 2" >> /etc/sentinel.conf &&
            echo "sentinel resolve-hostnames yes" >> /etc/sentinel.conf &&
            echo "sentinel down-after-milliseconds mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel failover-timeout mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel parallel-syncs mymaster 1" >> /etc/sentinel.conf &&
            redis-sentinel /etc/sentinel.conf'
    networks:
      redis-net:
        ipv4_address: 172.21.0.8


  redisinsight:
    image: redis/redisinsight:latest
    container_name: redisinsight
    ports:
      - "5540:5540"
    networks:
      redis-net:
        ipv4_address: 172.21.0.9

networks:
  redis-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16
```
--replica-announce-ip 指示节点对外开放的ip地址

--replica-announce-port 指示节点对外开放的端口

--replicaof redis-master 6379 指示slave节点复制哪个主节点的数据

```yaml
command: >
      sh -c 'echo "bind 0.0.0.0" > /etc/sentinel.conf &&
            echo "sentinel monitor mymaster ${HOST_IP} 6379 2" >> /etc/sentinel.conf &&
            echo "sentinel resolve-hostnames yes" >> /etc/sentinel.conf &&
            echo "sentinel down-after-milliseconds mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel failover-timeout mymaster 10000" >> /etc/sentinel.conf &&
            echo "sentinel parallel-syncs mymaster 1" >> /etc/sentinel.conf &&
            redis-sentinel /etc/sentinel.conf'
```
这段配置，对sentinel节点进行配置

echo "xxx" > /etc/sentinel.conf，表示将xxx写入文件/etc/sentinel.conf

bind 0.0.0.0，指示sentinel监听所有ip地址的访问请求

sentinel monitor mymaster ${HOST_IP} 6379 2 表示此sentinel节点要监控一个名为mymaster的主节点，其ip:port紧随其后，2表示议会大小（议会概念后面会介绍）

sentinel down-after-milliseconds mymaster 10000，表示sentinel节点在10000ms（10s）后没有检测到mymaster健康状态将其标记为sdown（后面会介绍sdown是什么？odown又是什么？）

sentinel failover-timeout mymaster 10000，表示在此sentinel节点投票选举另一个sentinel节点复制故障转移后10000ms后，还是没有监控到mymaster健康，则它自己会尝试对mymaster进行故障转移

sentinel parallel-syncs mymaster 1，表示在故障转移过程中，可同时接收新master数据同步的slave的数量为1，此设置在slave还在提供旧数据的读的时候有用，因为在故障转移中，大量数据同步的时候，slave不能提供数据读，也就是阻塞的，但小量数据是非阻塞的

#### 执行docker compose
```bash
docker-compose --env-file .env up 
```

.env文件是环境变量定义文件，此处只需包含一个本机的外部ip地址，可通过搜索引擎查询ip或ipconfig（or ifconfig）来获取

```text
HOST_IP=192.168.0.103
```

等待命令执行结束

未完待续
