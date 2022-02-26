const Koa = require('koa');
const koa_body = require('koa-body');
const cors = require('@koa/cors');
const api_router = require('./api_router.ts');
// const sta_router = require('./static_router.ts');
const server = require('koa-static');
 
let app = new Koa();

app.use(koa_body());
// response
app.use(cors());
app.use(api_router.routes()).use(api_router.allowedMethods());
app.use(server('./dist'));

// app.use((ctx: ctx) => {
//     ctx.res.end('Hello koa!');
// });
 
app.listen(3000, ()=>{
	console.log('running');
});
