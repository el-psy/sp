const _sp = require('./src/spider/site/site.ts');

// console.log(sp);

let _test = async function(){

	// let site_name = 'xbiqupao';
	// let action = 'search';
	// let param = {
	// 	type:'author',
	// 	key:'厌笔萧生'
	// };
	// console.log(sp(site_name, action, param));


	let site_name = 'zhhbqg';
	let action = 'info';
	let param = 5545;
	console.log(await _sp(site_name, action, param));

	// console.log(await sp('', 'name', ''));

	// let site_name = 'xbiqupao';
	// let action = 'page';
	// let param = '/book/65451/6062608.html';
	// // await core(site_name, action, param)
	// console.log(await sp(site_name, action, param));
}

_test();