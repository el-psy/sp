在上小说网站时，经常出现广告，一章分成多页，url写错等各种问题。
同时在爬虫时就在想能否解决这些。
于是在这里，将这些网站通过爬虫的方式，将内容爬下来，再通过vue3展示。

# 爬虫

目录：/src/spider

其中xpath.ts 实现xpath的功能。
/site/site.ts 爬虫模块的核心。
/reload 保存爬下来的目录内容

在调查node爬虫时，没有寻找到合心的爬虫库，于是自己实现了xpath.ts

# 后端

基于koa2 + ts

十分简单，app.ts + api_router.ts 结束。

可以通过postman import 查看 novel.postman_collection.json

# 前端

vue3 + ts ，已经build完成放在dist文件夹。

# 使用

大概

```
npm i
node --loader ts-node/esm "app.ts"
```
即可？

# 对于编码问题

有一些网站可能有奇怪的编码，比如GBK2312。而node天生不支持这种东西。 
可以通过iconv-lite库。 
但是使用过程为 
请求 =》 获得二进制信息 =》 编码转换。 
在axios中这个细节被隐藏在./node_modules/axios/lib/adapters/http.js中。 
通过ctrl+f responseEncoding ,可以找到。 
可以将
```
responseData = responseData.toString(config.responseEncoding);
```
改为
```
responseData = iconv.decode(responseData, config.responseEncoding);
```