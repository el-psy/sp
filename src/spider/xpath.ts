// import axios from "axios";
// import { html } from "cheerio/lib/api/manipulation";
// import htmlparser2 from 'htmlparser2';

const axios = require('axios');
const htmlparser2 = require('htmlparser2');

interface Node {
	type: string | undefined;
	data: string | undefined;
	attribs: any;
	name: string | undefined;
	index: string | number | undefined;
	children: Node[];
}

interface Parser {
	type: string | undefined;
	data?: string | undefined;
	attribs?: any;
	name?: string | undefined;
	children: any[];
}

let child_parser = function(xpath:string){
	if(xpath.slice(0, 2) == '//'){
		xpath = xpath.slice(2);
		return {
			filter:{
				'type':'child',
				'filter':'all'
			},
			xpath:xpath
		};
	}else if(xpath.slice(0, 1) == '/'){
		xpath = xpath.slice(1);
		return {
			filter:{
				'type':'child',
				'filter':'child'
			},
			xpath:xpath
		};
	}else {
		throw new Error('xpath parse child parse wrong xpath head'+xpath);
	}
}

let select_parser = function(xpath:string) {
	let filter_message = xpath.slice(0, xpath.indexOf(']')+1);
	xpath = xpath.slice(xpath.indexOf(']')+1);
	filter_message = filter_message.slice(1, filter_message.length-1);
	if(filter_message[0] === '@'){
		let attr:any = {}
		let buff = filter_message.split('@');
		for(let index in buff){
			if(buff[index].length == 0){
				continue;
			}
			let key = buff[index].split('=')[0];
			let value = buff[index].split('=')[1];
			if((value[0]=="'" && value[value.length-1]=="'") || (value[0]=='"' && value[value.length-1]=='"')){
				value = value.slice(1, value.length-1);
			}
			attr[key as string] = value;
		}
		return {
			filter: {
				'type':'attr',
				'attr':attr
			},
			xpath
		};
	}else if(/^[0-9]*$/.test(filter_message)){
		return {
			filter:{
				'type':'index',
				'index':parseInt(filter_message)
			},
			xpath:xpath
		};
	}else {
		throw new Error('xpath select parser wrong xpath'+xpath);
	}
}

let xpath_parser = function(xpath: string): any[]{
	// xpath => xpath parser object

	let buff_path = xpath;
	let res = [];
	let times = 0;

	while(buff_path.length > 0){
		let filter:any;
		if(buff_path[0] === '/'){
			let buff = child_parser(buff_path);
			filter = buff.filter; buff_path = buff.xpath;

			// console.log(buff);
			// break;
		}else if(buff_path[0] === '['){
			let buff = select_parser(buff_path);
			filter = buff.filter; buff_path = buff.xpath;
		}else {
			// if(buff_path.indexOf('/') != -1 || buff_path.indexOf('[') != -1){
				let left:number = buff_path.length;
				if(buff_path.indexOf('/')!=-1){
					left = buff_path.indexOf('/')
				}
				if(buff_path.indexOf('[')!=-1 && buff_path.indexOf('[') < left){
					left = buff_path.indexOf('[')
				}
				
				filter = {
					'type':'tag',
					'tag':buff_path.slice(0, left)
				};
				buff_path = buff_path.slice(left);
			// }
		}
		res.push(filter);
	}

	return res;
}

let req_deal = function(parser : Parser, index = '0'):Node {
	// html_parser => node
	let node: Node = {
		type:undefined,
		data:undefined,
		attribs:undefined,
		name:undefined,
		index: undefined,
		children:[]
	};
	node.type = parser.type;
	node.data = parser.data;
	node.attribs = parser.attribs;
	node.name = parser.name;
	node.index = index;
	let child_index = 0;
	for(let index in parser.children){
		let child = parser.children[index];
		node.children.push(req_deal(parser.children[index], child_index.toString()));
		if(child.type === 'tag'){
			child_index += 1;
		}
		// node.children.push(this.req_deal(parser.children[index]));
	}
	return node;
}

let child_match = function(node_data:Node[], filter:any){
	let res = [];

	if(filter.filter === 'child'){
		for(let node_index in node_data){
			let node = node_data[node_index];
			res.push(node.children);
			// for(let child_index in node.children){
			// 	let child = node.children[child_index];
			// 	res.push(child);
			// }
		}
	}else if(filter.filter === 'all'){
		let level_buff = [...node_data];
		while(level_buff.length != 0){
			// console.log(level_buff.length);
			let new_buff = [];
			for(let level_index in level_buff){
				let node = level_buff[level_index];
				res.push(node.children);
				for(let child_index in node.children){
					let child = node.children[child_index];
					new_buff.push(child);

					// res.push(child);
				}
			}
			level_buff = new_buff;
			}
	}else {
		throw new Error('wrong filter type:'+filter.type+' filter:'+filter.filter);
	}

	return res;
}

let tag_match = function(node_data:Node[], filter:any){
	let res = [];
	for(let node_index in node_data){
		let node = node_data[node_index];
		if(node.type === 'tag' && node.name === filter.tag){
			res.push(node);
		}
	}
	return res
}

let attr_match = function(node_data:Node[], filter:any){
	let res = [];
	for(let node_index in node_data){
		let node = node_data[node_index];
		if(node.type != 'tag'){
			continue;
		}
		let point = true;
		for(let key of Object.keys(filter.attr)){
			// console.log(key);
			if(!(node.attribs[key] === filter.attr[key])){
				point = false;
				continue;
			}
		}
		if(point){
			res.push(node);
		}
	}
	return res;
}

let index_match = function(node_data:Node[], filter:any){
	let index = 1;
	for(let node_index in node_data){
		let node = node_data[node_index];
		if(node.type != 'tag' || node.name === 'script'){
			continue;
		}else if(index === filter.index){
			return [node];
		}else {
			index+=1;
		}
	}
	return [];
}

let xpath_search = function(node_data:Node, xpath: string) {
	// use xpath to search get node[]
	
	let xpath_parsed = xpath_parser(xpath);
	// console.log(xpath_parsed);

	let xpath_buff:any[][] = [];
	let xpath_node: any[] = [];
	for(let index in xpath_parsed){
		let xpath = xpath_parsed[index];
		if(xpath.filter === 'child'){
			if(xpath_node.length > 0){
				xpath_buff.push(xpath_node);
			}
			xpath_node = [];
		}
		xpath_node.push(xpath);
	}
	if(xpath_node.length > 0){
		xpath_buff.push(xpath_node);
	}
	xpath_parsed = xpath_buff;
	// console.log(xpath_buff);
	// return 0;
	// console.log('xpath');
	// console.log(xpath_parsed);

	let res:Node[] = [node_data];
	// let buff:Node[] = [];
	for(let index in xpath_parsed){
		let filter_list = xpath_parsed[index];
		let res_buff:Node[][] = [];
		for(let filter_index in filter_list){
			let filter = filter_list[filter_index];
			// console.log(filter);
			// console.log(res_buff, res, res[0].children);
			if(filter.type === 'child'){
				res_buff = child_match(res as Node[], filter);
				// console.log(res_buff)
			}else if(filter.type === 'tag'){
				res_buff = res_buff.map((i:Node[])=> tag_match(i, filter));
				// console.log(res_buff)
			}else if(filter.type === 'attr'){
				res_buff = res_buff.map((i:Node[])=> attr_match(i, filter));
				// console.log(res_buff)
			}else if(filter.type === 'index'){
				res_buff = res_buff.map((i:Node[])=> index_match(i, filter));
				// console.log(res_buff)
			}
			// console.log(res_buff);
			res = res_buff.reduce((pre, cur, index, array)=> [...pre, ...cur], []);
		}
		
		// console.log(res);
		// break;
		// if(filter.type === 'child'){
		// 	res = child_match(res, filter);
		// }else if(filter.type === 'tag'){
		// 	res = tag_match(res, filter);
		// }else if(filter.type === 'attr'){

		// }

		// res = buff;
		// buff = [];

	}
	
	return res;
}

let to_html = function(node: Node, level = 0):string {
	// let node = this.node_data;
	let head = '';
	for(let i = 0; i<level; i++){
		head = head + '  ';
	}
	if(node.type === 'tag' || node.type === 'root'){
		
		let attr: any[] | string = [];
		for(let key of Object.keys(node.attribs)){
			attr.push(`${key}="${node.attribs[key]}"`);
		}
		attr = attr.join(' ');
		let pre = head + `<${node.name} ${attr}>\n`;

		let mid:string = node.children.map((i: Node)=> to_html(i, level+1)).join(''); // function(node.children, level+1);
		let end = head + `</${node.name}>\n`
		return pre+mid+end;
	}else if(node.type === 'text'){
		// if(node.data === '\n'){
		//     return '';
		// }
		if(/^[\n|\t]+$/.test(node.data as string)){
			return '';
		}
		return head + node.data + '\n';
	}
	return '';
}

let to_text = function(node: Node):string {
	// let node = this.node_data;
	if(node.type === 'tag' || node.type === 'root'){
	
		return node.children.map((i: Node)=> to_text(i)).join('') as string; // function(node.children, level+1);

	}else if(node.type === 'text'){
		// if(node.data === '\n'){
		//     return '';
		// }
		if(/^[\n|\t]+$/.test(node.data as string)){
			return '';
		}
		return node.data + '\n' as string;
	}
	return '';
}

let to_node = function(response:string){
	let html_data = htmlparser2.parseDocument(response);
    let node_data = req_deal(html_data);
	return node_data;
}

// export default {
// 	to_node,
// 	xpath_search,
// 	to_html,
// 	to_text
// };

module.exports = {
	to_node,
	xpath_search,
	to_html,
	to_text
};

let test = async function(){
	// let xpath = '/html/body/div[4][@class="listmain"]';
	// console.log(xpath_parser(xpath));

	let url = 'https://www.zhhbqg.com/32_25726';
	let xpath = '/html/body/div[@class="listmain"]';

	let {data:res} = await axios.get(url, {
		responseEncoding:'GBK'
	});
    // let html_data = htmlparser2.parseDocument(res);
    // let node_data = req_deal(html_data);
	let node_data = to_node(res);
	// console.log(xpath_search(node_data, xpath));
}

// test();