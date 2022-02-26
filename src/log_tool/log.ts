// import log4js from 'log4js';
const log4js = require('log4js');

log4js.configure({
	appenders:{
		'spider':{
			type:'file',
			filename:'./log/spider.log'
		},
		'net':{
			type:'file',
			filename:'./log/net.log'
		},
		'default':{
			type:'console'
		}
	},
	categories:{
		spider:{
			appenders:['spider'],
			level:'debug'
		},
		net:{
			appenders:['net'],
			level:'debug'
		},
		default:{
			appenders:['default'],
			level:'debug'
		}
	}
})

// let logger = log4js.getLogger('spider');
// logger.debug('Time: ', new Date());
// console.log('ods');
// export default log4js;
module.exports = log4js;