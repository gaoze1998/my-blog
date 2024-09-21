---

title: "自我介绍"

date: "2024-09-21"

description: "这是我的第一篇博客文章。"

---

# 我的TCP IP：直发Ethernet帧

在网络编程中，控制网络数据包的构造和发送可以为开发者提供更高的灵活性和深度的网络协议理解。本篇文章将通过一个实际的C语言示例，详细讲解如何在Linux系统下使用原始套接字（Raw Socket）发送自定义的以太网帧。

## 引言

在传统的网络编程中，数据包的发送和接收通常通过高级别的协议（如TCP、UDP）进行封装和处理。然而，有时候我们需要直接操作底层的网络协议，以实现更精细的控制，例如网络测试、安全工具开发、协议学习等。这时候，原始套接字便成为了一个强大的工具。

本文将通过一个示例程序，展示如何在Linux系统下使用C语言，通过原始套接字发送自定义的以太网帧。

## 原始套接字概述

原始套接字（Raw Socket）允许开发者绕过操作系统的网络协议栈，直接构造和发送网络层或链路层的数据包。这为开发者提供了极大的灵活性，但同时也带来了更高的权限要求和安全风险。

在Linux中，使用原始套接字需要具备超级用户权限，因为它涉及到对网络层的直接操作。

## 代码结构与功能

以下是我们将要分析的示例代码的主要功能：

1. **获取网络接口信息**：通过接口名称获取接口的索引和MAC地址。
2. **解析目标MAC地址**：将用户输入的目标MAC地址字符串转换为字节数组。
3. **构造以太网帧**：手动构造以太网帧，包括目的MAC地址、源MAC地址、以太类型和载荷。
4. **发送以太网帧**：使用原始套接字将构造的以太网帧发送到指定的目标MAC地址。

## 代码详解

下面我们逐步解析代码的各个部分。

### 获取网络接口信息

```c
int get_interface_info(const char* ifname, int* ifindex, unsigned char* mac) {
    int fd;
    struct ifreq ifr;
    fd = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ALL));
    if (fd < 0) {
        perror("socket");
        return -1;
    }
    strncpy(ifr.ifr_name, ifname, IFNAMSIZ - 1);
    if (ioctl(fd, SIOCGIFINDEX, &ifr) == -1) {
        perror("ioctl SIOCGIFINDEX");
        close(fd);
        return -1;
    }
    *ifindex = ifr.ifr_ifindex;

    if (ioctl(fd, SIOCGIFHWADDR, &ifr) == -1) {
        perror("ioctl SIOCGIFHWADDR");
        close(fd);
        return -1;
    }
    memcpy(mac, ifr.ifr_hwaddr.sa_data, 6);
    close(fd);
    return 0;
}
```

该函数通过接口名称获取接口的索引（`ifindex`）和MAC地址（`mac`）。具体步骤如下：

1. **创建套接字**：使用`AF_PACKET`和`SOCK_RAW`创建一个原始套接字，用于底层的网络操作。
2. **获取接口索引**：通过`ioctl`系统调用和`SIOCGIFINDEX`命令获取接口的索引。
3. **获取接口MAC地址**：同样通过`ioctl`和`SIOCGIFHWADDR`命令获取接口的硬件地址（MAC地址）。
4. **关闭套接字**：完成信息获取后关闭套接字，释放资源。

### 解析目标MAC地址

```c
// 解析目标MAC地址
if (sscanf(dest_mac_str, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx",
    &dest_mac[0], &dest_mac[1], &dest_mac[2],
    &dest_mac[3], &dest_mac[4], &dest_mac[5]) != 6) {
    fprintf(stderr, "Invalid MAC address format\n");
    exit(EXIT_FAILURE);
}
```

该段代码使用`sscanf`函数将用户输入的目标MAC地址字符串（例如`AA:BB:CC:DD:EE:FF`）解析为6字节的MAC地址数组`dest_mac`。如果解析失败，程序将输出错误信息并退出。

### 构造以太网帧

```c
// 构造以太网帧
unsigned char frame[1514];
memset(frame, 0, sizeof(frame));

// 目的MAC地址
memcpy(frame, dest_mac, 6);
// 源MAC地址
memcpy(frame + 6, src_mac, 6);
// 以太类型（示例使用0x0800表示IP）
frame[12] = 0x08;
frame[13] = 0x00;

// 载荷
size_t payload_len = strlen(payload);
if (payload_len > (1514 - 14)) {
    fprintf(stderr, "Payload too large\n");
    close(sockfd);
    exit(EXIT_FAILURE);
}
memcpy(frame + 14, payload, payload_len);
```

这部分代码手动构造以太网帧，包括：

1. **目的MAC地址**：复制目标MAC地址到帧的前6个字节。
2. **源MAC地址**：复制源MAC地址到帧的第7到12个字节。
3. **以太类型**：设置以太类型字段，示例中使用`0x0800`表示IP协议。以太类型字段用于指示上层协议类型。
4. **载荷**：将用户提供的载荷数据（例如字符串）复制到帧的第15字节开始的位置。注意载荷长度不能超过最大以太网帧长度（1514字节减去14字节的以太网帧头部）。

### 发送以太网帧

```c
// 准备目标地址结构
struct sockaddr_ll socket_address;
memset(&socket_address, 0, sizeof(struct sockaddr_ll));
socket_address.sll_ifindex = ifindex;
socket_address.sll_halen = ETH_ALEN;
memcpy(socket_address.sll_addr, dest_mac, 6);

// 发送帧
ssize_t sent = sendto(sockfd, frame, 14 + payload_len, 0,
    (struct sockaddr*)&socket_address, sizeof(struct sockaddr_ll));
if (sent == -1) {
    perror("sendto");
    close(sockfd);
    exit(EXIT_FAILURE);
}

printf("Sent %zd bytes\n", sent);

close(sockfd);
```

发送以太网帧的步骤包括：

1. **准备目标地址结构**：使用`sockaddr_ll`结构体指定目标接口索引和目标MAC地址。
2. **发送帧**：调用`sendto`函数，将构造的以太网帧发送到目标地址。
3. **处理发送结果**：如果发送失败，输出错误信息并退出；否则，输出发送的字节数。
4. **关闭套接字**：完成发送后关闭套接字，释放资源。

## 编译与运行

### 编译

保存代码到文件，例如`send_eth_frame.c`，使用以下命令进行编译：

```bash
gcc send_eth_frame.c -o send_eth_frame
```

### 运行

由于原始套接字需要超级用户权限，运行程序时需使用`sudo`：

```bash
sudo ./send_eth_frame <interface> <dest_mac> <payload>
```

- `<interface>`：网络接口名称，例如`eth0`、`wlan0`等。
- `<dest_mac>`：目标设备的MAC地址，格式如`AA:BB:CC:DD:EE:FF`。
- `<payload>`：要发送的数据载荷，可以是任意字符串。

**示例**：

```bash
sudo ./send_eth_frame eth0 AA:BB:CC:DD:EE:FF "Hello, Ethernet!"
```
