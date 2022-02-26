const Router = require('@koa/router');
const sp = require('./src/spider/site/site.ts');

interface ctx {
	body:any,
    res: {
        end: Function
    },
	params:any,
	request:{
		body:any
	}
}

const router = new Router({
	prefix:'/api'
});

router.get('/name', async (ctx:ctx, next: any)=>{
	ctx.body = await sp('', 'name', '')
})

router.post('/search', async (ctx:ctx, next:any)=>{
	let params = ctx.request.body;
	ctx.body = await sp(params.site_name, 'search', {
		type:params.type,
		key:params.key
	});
})

router.post('/info', async (ctx:ctx, next:any)=>{
	let params = ctx.request.body;
	ctx.body = await sp(params.site_name, 'info', params.param);
})

router.post('/page', async (ctx:ctx, next:any)=>{
	let params = ctx.request.body;
	ctx.body = await sp(params.site_name, 'page', params.param);
})

module.exports = router;
