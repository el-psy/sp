import axios from "axios";
// import { contents } from "cheerio/lib/api/traversing";
import fs from 'fs';
import Spider from '../xpath.ts';
import path from 'path';

interface Random_int {
	(min:number, max:number): number;
}

interface Info {
	title:string,
	author:string
}

interface Reload_path {
	new: string,
	old: string
}

interface Store_content {
	index:string,
	data:any
}

let base_url: string = 'https://www.zhhbqg.com/';
let __dirname = path.resolve();

// let file_write = async function (str:string, file_name:string = 'try.txt') {
// 	// 同步写入
// 	fs.writeFileSync(file_name, str, {
// 		flag:'w',
// 		encoding:'utf-8'
// 	});
// }

let json_save = function(data:any, json_path:string){
    fs.writeFileSync(json_path, JSON.stringify(data), {
        encoding:'utf-8'
    });
}

let json_load = function(json_path:string){
	if(!fs.existsSync(json_path)){
		throw new Error('json path wrong');
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

let random_int:Random_int = function (min: number, max: number) {
	return Math.floor(Math.random() * (max - min) ) + min;
}

let get_page_url = function(idx: string|number){
	// https://www.zhhbqg.com/25_25725/
	let rand_int = random_int(0, 100);
	return base_url + rand_int.toString()+ '_' + idx.toString();
}

let base_info = async function(url: string){
	// console.log(url);

	let xpath = '/html/body/div[@id="book"]/div[@id="maininfo"]/div[@id="info"]';
	let response = await axios.get(url, {
		responseEncoding:'GBK',
		timeout:10000
	}).catch(function (error) {
		if(error.message.includes('timeout')){
			return 'timeout';
		}
		if(error.response.status == 500){
			return 'over'
		}
		// console.log('message', error.message);
		// console.log('code', error);
	});
	// console.log('request over');
	let res:any;
	// console.log(response);
	if(response == 'timeout'){
		return {
			point:'timeout',
			url:url
		}
	}else if(response == 'over'){
		return {
			point:'over',
			url:url
		}
	}else {
		res = response.data;
	}

	let parser = new Spider(res);
    parser.xpath_search(xpath);
	let buff_node_data = parser.node_data;

	let title_xpath = '/h1';
	parser.xpath_search(title_xpath);

	let title = Spider.to_text(parser.node_data[0]).replace('\n', '');//.split('：')[1];
	// console.log('title', title);
	parser.node_data = buff_node_data;
	
	let author_xpath = '/p[1]';
	parser.xpath_search(author_xpath)
	let author = Spider.to_text(parser.node_data[0]).split('：')[1].replace('\n', '');
	parser.node_data = buff_node_data;

	return {
		info:{
			title:title,
			author:author
		},
		point:'ok',
		url:url
	};
}

let all_info = async function (url:string) {
	// console.log(url);

	let xpath = '/html/body/div[@id="book"]/div[@id="maininfo"]/div[@id="info"]';
	let {data:res} = await axios.get(url, {
		responseEncoding:'GBK'
	}).catch((err)=>{
		return {
			data: false
		}
	});
	if(res === false){
		return {
			point: false
		}
	}

	let parser = new Spider(res);
	let root_node_data = parser.node_data;
    parser.xpath_search(xpath);
	let info_node_data = parser.node_data;

	let title_xpath = '/h1';
	parser.xpath_search(title_xpath);

	let title = Spider.to_text(parser.node_data[0]).replace('\n', '');//.split('：')[1];
	// console.log('title', title);
	parser.node_data = info_node_data;
	
	let author_xpath = '/p[1]';
	parser.xpath_search(author_xpath)
	let author = Spider.to_text(parser.node_data[0]).split('：')[1].replace('\n', '');
	parser.node_data = root_node_data;

	xpath = '/html/body/div[@class="listmain"]/dl';
	parser.xpath_search(xpath);
	let content_node_data = parser.node_data;
	let content_point = false;
	let content = [];
	for(let index in content_node_data[0].children){
		let content_node = content_node_data[0].children[index];
		// console.log(index);
		if(Spider.to_text(content_node).includes('正文卷')){
			content_point = true;
			continue;
		}
		if(content_point){
			let url = '';
			for(let _index in content_node.children){
				if(content_node.children[_index].type == 'tag' && content_node.children[_index].name == 'a'){
					url = content_node.children[_index].attribs['href']
				}
			}
			if(url === '') continue;
			content.push(
				{
					url: url, //content_node.children[0].attribs['href'],
					title:Spider.to_text(content_node).replace('\n', ''),
				}
			)
		}
	}

	return {
		info:{
			title:title,
			author:author
		},
		content:content
	};
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
		// json_data = {
		// 	data:[],
		// 	index:'0'
		// }
		// console.log(err);
		// console.log(err.message);
	}

	let {data: reload_data, index:page_index} = json_data;
	return [reload_data, parseInt(page_index)];
}

let reload_save = function(reload_data:any, page_index:string, reload_path:Reload_path, mode:string = 'timeout'){
	// let json_data = {
	// 	index: page_index,
	// 	data: reload_data
	// };
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
	// json_save(json_data, path);
}

let reload = async function(reload_path: Reload_path){
	let [reload_data, page_index] = reload_load(reload_path, 'reload');

	let res: any[] = [];
	let point = true;
	// let page_index = 1;
	let pool = [];
	let pool_size = 40;
	let lay_time = 0;
	let lay_step = 10*60*1000;
	while(point){
		if(lay_time != 0){
			await sleep(lay_time);
			page_index -= pool_size;
		}

		for(let i = 0; i<pool_size; i++){
			let url = get_page_url(page_index);
			pool.push(base_info(url));
			page_index += 1;
		}
		let buff = await Promise.all(pool);
		pool = [];
		// console.log(buff.length, page_index, lay_time);
		// console.log(buff);
		let mark = buff.some((i: { point: string; })=> i.point == 'timeout');
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
			// ###
			// console.log('timeout');
			// break;	
		}else {
			lay_time = 0;
		}
		
		mark = buff.some((i: { point: string; })=> i.point == 'over');

		if(page_index % 1000 == 0){
			console.log(page_index);
		}

		if(mark){
			buff = buff.filter((i)=> i.point=='ok');
			res = [...res, ...buff];
			reload_save(res, page_index.toString(), reload_path, 'over');
			break;
		}

		if(!mark){
			res = [...res, ...buff];
		}
		// console.log(page_index);
	}

	// json_save(res, path.join(__dirname, reload_path));
}

export default {
	base_info,
	all_info
};

let test = async function(){
	let url = get_page_url(25725);
	// https://www.zhhbqg.com/25_45725/
	url = get_page_url(45725);
	let reload_path:Reload_path = {
		new:'zhhbpg_new.json',
		old:'zhhbpg_old.json'
	}

	// await new Promise((resolve, reject)=>{
	// 	let lay_time = 1000;
	// 	setTimeout(() => {
	// 		console.log(lay_time);
	// 		resolve(lay_time);
	// 	}, lay_time);
	// })
	// console.log(1);
	// await sleep(10000);
	// console.log('delay');
	let info = await base_info(url);
	// let info = await all_info(url);
	console.log(info);
	// json_save(info, 'all_info.json');
	// let reload_data, page_index = reload_load(reload_path, 'reload');
	// console.log(page_index);
	// reload(reload_path);
}

test();