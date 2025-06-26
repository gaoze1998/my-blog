---
title: "MIT 6.828 - Lab 1 - primes实现"

date: "2025-06-26"

description: "这篇文章贴出MIT 6.828 - Lab 1 - primes实现"

---

# MIT 6.828 - Lab 1 - primes实现
废话不多说，直接看代码

```C
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

void unit(int infd)
{
loop:
    int first = 1;
    int firstd;
    int innerfirst = 1;
    int d;
    int *outfdarray = (int *)malloc(2 * sizeof(int));
    pipe(outfdarray);

    while (read(infd, &d, sizeof(int)) > 0)
    {
        if (first)
        {
            firstd = d;
            printf("prime %d\n", d);
            first = 0;
        }
        else
        {
            if (d % firstd != 0)
            {
                write(outfdarray[1], &d, sizeof(int));
                if (innerfirst)
                {
                    if (fork() == 0)
                    {
                        close(outfdarray[1]);
                        infd = outfdarray[0];
                        goto loop;
                    }
                    else
                    {
                        close(outfdarray[0]);
                        innerfirst = 0;
                    }
                }
            }
        }
    }
}

int main(int argc, char *argv)
{
    int *fda = (int *)malloc(2 * sizeof(int));
    pipe(fda);
    int first = 1;

    for (int i = 2; i < 36; ++i)
    {
        write(fda[1], &i, sizeof(int));
        if (first)
        {
            if (fork() == 0)
            {
                close(fda[1]);
                unit(fda[0]);
            }
            else
            {
                close(fda[0]);
                first = 0;
            }
        }
    }

    sleep(30);
    exit(0);
}
```

## 代码解释
整体模型是这样的：

main(2, 3, 4, ..., 35) __> process1 (3, 5, 7, ...) __> process2 __> ...

1. 首先看main函数

    创建一个双向pipe；

    循环2到35（实验要求）；

    将数字填入pipe写端；

    when 是第一个数字的时候
    
    fork出一个新的进程，关闭pipe写端（节约资源），调用unit函数（是每个进程要考虑的过程，放在此函数中）；

    父进程关闭读端；

    end when

    sleep 30 ticks，等待所有子进程完成处理；

    返回正常。

2. 再来看下每个工作进程要考虑的过程函数unit

每个进程的模型如下：

__> 读 process 写 __>

    tips: 为了减少每个进程的栈空间占用，使用goto loop直接覆盖栈，而不是递归调用unit

本人太懒，写到这里发现unit解释会过于浪费时间，不解释了，直接放到llm中让它来解释下吧，hhhhhh