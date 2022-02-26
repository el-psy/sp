// import axios from "axios";
// // import fs from 'fs';
// import Spider from '../xpath.ts';
// import path from 'path';
// import log from '../log_tool/log.ts';

const axios = require('axios');
const Spider = require('../xpath.ts');
const path = require('path');
const log = require('../../log_tool/log.ts');

interface Random_int {
	(min:number, max:number): number;
}

interface Info {
	title:string,
	author:string
}

let base_url: string = 'https://www.zhhbqg.com/';
// let __dirname = path.resolve();
let logger =  log.getLogger('spider');

let random_int:Random_int = function (min: number, max: number):number {
	return Math.floor(Math.random() * (max - min) ) + min;
}

let url_cut = function(url:string){
	if(url_cut.length <= base_url.length){
		return url;
	}
	if(url.slice(0, base_url.length) === base_url ){
		return url.slice(base_url.length);
	}
}

let url_union = function(url:string){
	let right = base_url;
	if(right.charAt(right.length - 1) === '/'){
		right = right.slice(0, right.length-1);
	}
	if(url.charAt(0) === '/'){
		url = url.slice(1);
	}
	return right+'/'+url;
}

let get_page_url = function(idx: string|number):string {
	let rand_int = random_int(0, 100);
	return base_url + rand_int.toString()+ '_' + idx.toString();
}

let base_info = async function(url: string){
	
	let response:any = await axios.get(url, {
		responseEncoding:'GBK',
		timeout:10000
	}).catch(function (error: { response: any; }) {
		// logger.debug(error);
		// if(error.message.includes('timeout') || error.code === 'ECONNRESET'){
		// 	return error;
		// }
		// if(error.code == 500){
		// 	return 'over'
		// }
		if(error.response){
			return error.response;
		}
		return error
	});
	let res:any;
	if(response.code == 'ECONNRESET'){
		logger.debug('timeout, url', url);
		return {
			point:'timeout',
			url:url
		}
	}else if(response.status == 500){
		logger.debug('over, url', url);
		return {
			point:'over',
			url:url
		}
	}else if(response.status !== 200){
		logger.debug('error, url', url);
		logger.debug(response);
		return {
			point:'error',
			code:response
		}
	}else {
		res = response.data;
	}

	let xpath = '/html/body/div[@id="book"]/div[@id="maininfo"]/div[@id="info"]';
	let parser = Spider.to_node(res);

    parser = Spider.xpath_search(parser, xpath);
	let buff_node_data = parser;
	// console.log(parser, parser.length);

	let title_xpath = '/h1';
	parser = Spider.xpath_search(parser[0], title_xpath);
	// console.log(parser, parser.length);

	let title = Spider.to_text(parser[0]).replace('\n', '');
	parser = buff_node_data;
	
	let author_xpath = '/p[1]';
	parser = Spider.xpath_search(parser[0], author_xpath)
	let author = Spider.to_text(parser[0]).split('：')[1].replace('\n', '');
	parser = buff_node_data;

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
	
	let {data:res} = await axios.get(url, {
		responseEncoding:'GBK'
	}).catch((err: any)=>{
		return {
			data: false
		}
	});
	if(res === false){
		return {
			point: false
		}
	}

	let xpath = '/html/body/div[@id="book"]/div[@id="maininfo"]/div[@id="info"]';
	let parser = Spider.to_node(res);

	let root_node_data = parser;
    parser = Spider.xpath_search(parser, xpath);
	let info_node_data = parser;

	let title_xpath = '/h1';
	parser = Spider.xpath_search(parser[0], title_xpath);

	let title = Spider.to_text(parser[0]).replace('\n', '');
	parser = info_node_data;
	
	let author_xpath = '/p[1]';
	parser = Spider.xpath_search(parser[0], author_xpath)
	let author = Spider.to_text(parser[0]).split('：')[1].replace('\n', '');
	parser = root_node_data;

	xpath = '/html/body/div[@class="listmain"]/dl';
	parser = Spider.xpath_search(parser, xpath);
	let content_node_data = parser;
	let content_point = false;
	let content = [];
	for(let index in content_node_data[0].children){
		let content_node = content_node_data[0].children[index];
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
					url: url_cut(url),
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
		content:content,
		point:true
	};
}

let index_base_info = async function(index:number){
	let url = get_page_url(index);
	let res:any = await base_info(url);
	res.index = index;
	return res;
}

let index_all_info = async function(index:number){
	let url = get_page_url(index);
	let res:any = await all_info(url);
	res.index = index;
	return res;
}

let page_read = async function(url:string){
	url = url_union(url);
	// console.log(url);
	let {data:res} = await axios.get(url, {
		responseEncoding:'GBK'
	}).catch((err: any)=>{
		return {
			data: false
		}
	});
	if(res === false){
		return {
			title:undefined,
			novel:undefined,
			point: false
		}
	}

	let xpath = '/html/body/div[@id="book"]/div[@class="content"]';
	let parser = Spider.to_node(res);
	let root_node_data = parser;

    parser = Spider.xpath_search(parser, xpath)[0];
	let info_node_data = parser;

	parser = Spider.xpath_search(parser, '/h1')[0];
	let title = Spider.to_text(parser);

	parser = info_node_data;
	parser = Spider.xpath_search(parser, '/div[@id="content"]')[0];
	let novel:string[] = [];
	for(let index in parser.children){
		let child = parser.children[index];
		if(child.type === 'text'){
			novel.push(Spider.to_text(child));
		}
	}
	return {
		title:title,
		novel:novel,
		point:true
	};
}

// export default {
// 	base_info,
// 	index_base_info,
// 	all_info,
// 	index_all_info,
// 	get_page_url,
// 	page_read
// };

module.exports = {
	base_info,
	index_base_info,
	all_info,
	index_all_info,
	get_page_url,
	page_read
};

// let test = async function(){
//     let index = 25725;
//     let url = get_page_url(index);
//     // let res:any = await base_info(url);
//     // console.log(res);
// 	// res = await all_info(url);
// 	// console.log(res);

// 	let res = await page_read('/25_25725/510367853.html');
// 	console.log(res);
// }

// test();