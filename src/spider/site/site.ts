// import zhhbqg  from './zhhbqg.ts';
// import xbiqupao from './xbiqupao.ts';
// import fs from 'fs';
// import log from '../log_tool/log.ts';

const zhhbqg = require('./zhhbqg.ts');
const xbiqupao = require('./xbiqupao.ts');
const fs = require('fs');
const log = require('../../log_tool/log.ts');

interface Reload_path {
	new: string,
	old: string
}

interface Store_content {
	index:string,
	data:any
}

let logger = log.getLogger('spider');

let json_save = function(data:any, json_path:string){
    fs.writeFileSync(json_path, JSON.stringify(data, null, '\t'), {
        encoding:'utf-8'
    });
}

let json_load = function(json_path:string){
	if(!fs.existsSync(json_path)){
		throw new Error('json path wrong '+json_path);
	}
	let res = fs.readFileSync(json_path, {
		encoding: 'utf-8'
	});
	return JSON.parse(res);
}

let sleep = async function (delay:number){
	return await new Promise((resolve, reject)=>{
		// let delay = 1000;
		setTimeout(() => {
			// console.log(delay);
			resolve(delay);
		}, delay);
	})
}


let reload_load = function(reload_path: Reload_path, mode:string = 'read'){
	let path:string;
	if(mode == 'reload'){
		path = reload_path.new;
	}else if(mode == 'read'){
		path = reload_path.old;
	}else {
		throw new Error('reload_load wrong mode'+mode.toString());
	}
	let json_data: Store_content
	try{
		json_data = json_load(path);
	}catch(err:any) {
		if(err.message = 'json path wrong'){
			json_data = {
				data:[],
				index:'1'
			}
		}else {
			throw new Error(err.message);
		}
	}

	let {data: reload_data, index:page_index} = json_data;
	return [reload_data, parseInt(page_index)];
}

let reload_save = function(reload_data:any, page_index:string, reload_path:Reload_path, mode:string = 'timeout'){
	let path:string;
	if(mode == 'timeout'){
		path = reload_path.new;
		let new_data = reload_load(reload_path, 'reload')[0];
		let json_data: Store_content = {
			index:page_index,
			data:[...new_data, ...reload_data]
		}
		json_save(json_data, path);
	}else if(mode == 'over'){
		path = reload_path.new;
		let new_data = reload_load(reload_path, 'reload')[0];
		let json_data: Store_content = {
			index:page_index,
			data:[...new_data, ...reload_data]
		}
		json_save(json_data, path);
		path = reload_path.old;
		json_save(json_data, path);
	}else {
		throw new Error('reload_save wrong mode');
	}
}

let reload = async function(reload_path: Reload_path, site_obj: any){
	// let get_page_url = site_obj.get_page_url;
	let base_info = site_obj.index_base_info;

	let [reload_data, page_index] = reload_load(reload_path, 'reload');

	let res: any[] = [];
	let point = true;
	let pool = [];
	let pool_size = 30;
	let lay_time = 0;
	let lay_step = 20*1000;
	let save_step = 1000;
	let save_point = 0;
	while(point){
		if(lay_time != 0){
			logger.debug('sleep lay_time'+lay_time.toString()+'page_index'+page_index.toString());
			console.log('sleep lay_time'+lay_time.toString()+'page_index'+page_index.toString());
			await sleep(lay_time);
			page_index -= pool_size;
		}
		// let url_to_index:any = {}
		for(let i = 0; i<pool_size; i++){
			// let url = get_page_url(page_index);
			// url_to_index[url] = page_index;
			pool.push(base_info(page_index));
			page_index += 1;
		}
		let buff = await Promise.all(pool);
		pool = [];
		let mark = false;
		mark = buff.some((i: { point: string; })=> i.point == 'timeout');
		if(mark){
			if(lay_time == 0){
				lay_time = lay_time+lay_step
			}else if(lay_time == lay_step*4){
				break;
			}else{
				lay_time = lay_time*2;
			}
			reload_save(res, (page_index-pool_size).toString(), reload_path, 'timeout');
			res = [];
			continue;
		}else {
			lay_time = 0;
		}
		
		mark = buff.some((i: { point: string; })=> i.point == 'over') || buff.every((i: { point: string; })=> i.point == 'error');

		// if(page_index % 10 == 0){
		// 	console.log(page_index);
		// }

		if(mark){
			buff = buff.filter((i)=> i.point=='ok');
			res = [...res, ...buff];
			buff = buff.map((i)=>i.index);
			// page_index = Math.max(...buff.map((i)=>i.page_index))
			reload_save(res, Math.max(...buff as number[]).toString(), reload_path, 'over');
			break;
		}

		mark = buff.some((i: { point: string; })=> i.point !== 'ok');
		if(mark){
			res = [...res, ...buff];
			buff = buff.map((i)=>i.index);
			reload_save(res, (Math.max(...buff as number[])-pool_size).toString(), reload_path, 'over');
			res = [];
			console.log('error', page_index);
			continue;
		}

		if(!mark){
			res = [...res, ...buff];
		}

		if(page_index - save_point > save_step){
			buff = buff.map((i)=>i.index);
			reload_save(res, Math.max(...buff as number[]).toString(), reload_path, 'timeout');
			res = [];
			save_point += save_step;
		}
	}
}

let search = function(reload_path: Reload_path, param:any){
	let search_type:string = param['type'];
	let key_word:string = param['key'];
	let path = reload_path['old'];
	let {data: data} = json_load(path);

	let res = [];
	if(search_type === 'title'){
		for(let index in data){
			let node = data[index];
			if(node.point != 'ok'){
				continue;
			}
			if(node.info.title.includes(key_word)){
				res.push(node);
			}
		}
	}else if(search_type === 'author'){
		for(let index in data){
			let node = data[index];
			if(node.point != 'ok'){
				continue;
			}
			if(node.info.author.includes(key_word)){
				res.push(node);
			}
		}
	}else if(search_type === 'all'){
		for(let index in data){
			let node = data[index];
			if(node.point != 'ok'){
				continue;
			}
			if(node.info.title.includes(key_word) || node.info.author.includes(key_word)){
				res.push(node);
			}
		}
	}else {
		throw new Error('search_type wrong '+search_type);
	}
	return res;
}

let site:any = {
	'zhhbqg':zhhbqg,
	'xbiqupao':xbiqupao
};

let reload_path:any = {
	'zhhbqg' : {
		new:'./src/spider/reload/zhhbqg_new.json',
		old:'./src/spider/reload/zhhbqg_old.json'
	},
	'xbiqupao' : {
		new:'./src/spider/reload/xbiqupao_new.json',
		old:'./src/spider/reload/xbiqupao_old.json'
	}
};


let core = async function(site_name:string, action:string, param:any){
	if(action == 'name'){
		return Object.keys(site);
	}else if(action === 'info'){
		return await site[site_name].index_all_info(param);
	}else if(action === 'search'){
		return search(reload_path[site_name], param)
	}else if(action === 'page'){
		return await site[site_name].page_read(param);
	}
}

module.exports = core;

let test = async function(){
	// let url = get_page_url(25725);
	// url = get_page_url(45725);
	// let reload_path:Reload_path = {
	// 	new:'xbiqupao_new.json',
	// 	old:'xbiqupao_old.json'
	// }
	// let info = await base_info(url);
	// console.log(info);
	// let get_page_url = zhhbqg.get_page_url;
	// let base_info = zhhbqg.base_info;
	// let site_name = 'xbiqupao'
	// reload(reload_path[site_name], site[site_name]);

	// let site_name = 'xbiqupao';
	// let action = 'search';
	// let param = {
	// 	type:'author',
	// 	key:'厌笔萧生'
	// };
	// console.log(core(site_name, action, param));


	let site_name = 'xbiqupao';
	let action = 'info';
	let param = 65451;
	console.log(await core(site_name, action, param));

	// console.log(await core('', 'name', ''));

	// let site_name = 'xbiqupao';
	// let action = 'page';
	// let param = '/book/65451/6062608.html';
	// await core(site_name, action, param)
	// console.log(await core(site_name, action, param));
}

// test();