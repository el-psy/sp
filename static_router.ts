const Router = require('@koa/router');
const server = require('koa-static')

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

const sta_router = new Router({
	prefix:'/'
});

sta_router.get('/*', server('./dist'));

module.exports = sta_router;
