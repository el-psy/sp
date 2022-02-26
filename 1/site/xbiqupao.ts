import axios from "axios";
// import fs from 'fs';
import Spider from '../xpath.ts';
import path from 'path';

interface Random_int {
	(min:number, max:number): number;
}

interface Info {
	title:string,
	author:string
}

let base_url: string = 'https://www.xbiqupao.com/';
let __dirname = path.resolve();



// let random_int:Random_int = function (min: number, max: number):number {
// 	return Math.floor(Math.random() * (max - min) ) + min;
// }

let get_page_url = function(idx: string|number):string {
	// let rand_int = random_int(0, 100);
	return base_url + 'book/' + idx.toString();
}

let base_info = async function(url: string){
	let xpath = '/html/body/div[@id="wrapper"]/div[@class="box_con"]/div[@id="maininfo"]/div[@id="info"]';
	let response:any = await axios.get(url, {
		responseEncoding:'utf-8',
		timeout:10000
	}).catch(function (error) {
		if(error.message.includes('timeout')){
			return 'timeout';
		}
		if(error.response.status == 500){
			return 'over'
		}
	});
	let res:any;
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

	let title = Spider.to_text(parser.node_data[0]).replace('\n', '');
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
	let xpath = '/html/body/div[@id="wrapper"]/div[@class="box_con"]/div[@id="maininfo"]/div[@id="info"]';
	let {data:res} = await axios.get(url, {
		responseEncoding:'utf-8'
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

	let title = Spider.to_text(parser.node_data[0]).replace('\n', '');
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
					url: url,
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

export default {
	base_info,
	index_base_info,
	all_info,
	index_all_info,
	get_page_url
};

let test = async function(){
	// let url = get_page_url(25725);
	// https://www.zhhbqg.com/25_45725/
	// url = get_page_url(45725);
	// let reload_path:Reload_path = {
	// 	new:'zhhbpg_new.json',
	// 	old:'zhhbpg_old.json'
	// }


	let info = await index_base_info(25725);

	console.log(info);

}

test();