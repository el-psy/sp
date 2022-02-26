import axios from "axios";
import htmlparser2 from 'htmlparser2';

// import {Document} from 'domhandler';
// import fs from 'fs';

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

interface Xpath {
	search_mode: string;
	tag_name: string;
	select_message: any;
	index_message: string;
}

// typeof Req_parser (
// 	parser:Parser
// ): Node;

class Spider {
	html_data: Node;
	node_data: Node[];

	constructor(html_data: string){
		let parser: Parser = htmlparser2.parseDocument(html_data);
		this.html_data = this.req_deal(parser);
		this.node_data = [this.html_data]
		// if(this.html_data.type === 'root' && !Array.isArray(this.html_data)){
		// 	this.node_data = [this.html_data]
		// }
		// this.node_data = this.html_data;
	}

	req_deal(parser : Parser, index = '0'):Node {
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
			node.children.push(this.req_deal(parser.children[index], child_index.toString()));
			if(child.type === 'tag'){
				child_index += 1;
			}
			// node.children.push(this.req_deal(parser.children[index]));
		}
		return node;
	}

	select_parser(select_message:string): Xpath {
		// xpath node select message parser

		let res:any = {};
		let buff: string|string[]  = select_message //.slice(1, select_message.length-2);
		buff = buff.split('@');
		for(let index in buff){
			if(buff[index].length == 0){
				continue;
			}
			let key = buff[index].split('=')[0];
			let value = buff[index].split('=')[1];
			if((value[0]=="'" && value[value.length-1]=="'") || (value[0]=='"' && value[value.length-1]=='"')){
				value = value.slice(1, value.length-1);
			}
			res[key as string] = value;
	
		}
		return res;
	}

	xpath_parse(xpath: string): any[]{
		// xpath => xpath parser object

		let buff_path = xpath;
		let res = [];

		while(buff_path.length > 0){
			let search_mode = '';
			if(buff_path.slice(0, 2) == '//'){
				search_mode = 'all';
				buff_path = buff_path.slice(2);
			}else if(buff_path.slice(0, 1) == '/'){
				search_mode = 'only_child';
				buff_path = buff_path.slice(1);
			}else {
				search_mode = 'only_child';
			}

			let tag_message = ''
			
			if(buff_path.indexOf('/') == -1){
				tag_message = buff_path;
				buff_path = '';
			}else {
				tag_message = buff_path.slice(0, buff_path.indexOf('/'));
				buff_path = buff_path.slice(buff_path.indexOf('/'));
			}

			
			let tag_name = '';
			let select_message = '';
			let index_message = '';
			let buff = '';

			if(tag_message.indexOf('[') != -1){
				tag_name = tag_message.slice(0, tag_message.indexOf('['));

				buff = tag_message.slice(tag_message.indexOf('['), tag_message.indexOf(']')+1);
				buff = buff.slice(1, buff.length-1);

				if(/^[0-9]*$/.test(buff)){
					index_message = buff;
				}else {
					select_message = buff;
				}
				if(tag_message.length != tag_message.indexOf(']') + 1){
					buff = tag_message.slice(tag_message.indexOf(']') + 1);
					buff = buff.slice(1, buff.length-1)

					if(/^[0-9]*$/.test(buff)){
						index_message = buff;
					}else {
						select_message = buff;
					}
				}
				
			}else {
				tag_name = tag_message;
			}

			res.push({
				search_mode: search_mode,
				tag_name : tag_name,
				select_message: this.select_parser(select_message),
				index_message: index_message,
			})

		}

		return res;
	}

	node_match(node: Node, search_obj: any): boolean{
		// console.log('node match');
		// console.log(search_obj);
		// console.log(child_index);
		// console.log(node.type, node.name)
	
		if(!(node.type === 'tag' && node.name === search_obj.tag_name)){
			return false;
		}
		for(let key of Object.keys(search_obj.select_message)){
			// console.log(key);
			if(!(node.attribs[key] === search_obj.select_message[key])){
				return false;
			}
		}
		if(search_obj.index_message !== '' && search_obj.index_message !== node.index){
			return false;
		}
		
		return true;
	}
	
	xpath_search(xpath: string):void {
		// use xpath to search get node[]
		
		let xpath_parsed = this.xpath_parse(xpath);
		// console.log('xpath');
		console.log(xpath_parsed);
		let res = this.node_data;
		// if(res.type === 'root' && !Array.isArray(res)){
		// 	res = [res]
		// }
		let buff = [];
		for(let index in xpath_parsed){
			let xpath = xpath_parsed[index];

			if(xpath.search_mode === 'only_child'){
				for(let node_index in res){
					let node = res[node_index];
					for(let child_index in node.children){
						let child = node.children[child_index];
						if(this.node_match(child, xpath)){
							buff.push(child);
						}
					}
				}

			}else if(xpath.search_mode === 'all'){
				let level_buff = [...res];
				while(level_buff.length != 0){
					// console.log(level_buff.length);
					let new_buff = [];
					for(let level_index in level_buff){
						let node = level_buff[level_index];
						for(let child_index in node.children){
							let child = node.children[child_index];
							new_buff.push(child);

							if(this.node_match(child, xpath)){
								buff.push(child);
							}
						}
					}
					level_buff = new_buff;
				}
			}

			res = buff;
			buff = [];

		}
		
		this.node_data = res;
	}

	static to_html(node: Node, level = 0):string {
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

			let mid:string = node.children.map((i: Node)=> Spider.to_html(i, level+1)).join(''); // function(node.children, level+1);
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

	static to_text(node: Node):string {
		// let node = this.node_data;
		if(node.type === 'tag' || node.type === 'root'){
        
			return node.children.map((i: Node)=> Spider.to_text(i)).join('') as string; // function(node.children, level+1);
	
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
}


export default Spider;


let test = async function(){
	let url = 'https://www.zhhbqg.com/32_25726';
	let xpath = '/html/body/div[@class="listmain"]';
	let {data:res} = await axios.get(url, {
		responseEncoding:'GBK'
	});
    let parser = new Spider(res);
    parser.xpath_search(xpath);
	// console.log(Spider.to_html(parser.node_data[0]));
}

test();


