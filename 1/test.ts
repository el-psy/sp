import axios from "axios";
import htmlparser2 from 'htmlparser2';
import fs from 'fs';
// import { val } from "cheerio/lib/api/attributes";

let url = 'https://www.zhhbqg.com/32_25726';
// let xpath = '/html/body/div[@class="listmain"]';
let xpath = '/html/body/div[@class="listmain"]';

let base_info = async function(url: string){
	console.log(url);
	let {data:res} = await axios.get(url, {
		responseEncoding:'GBK'
	});
	let parser = htmlparser2.parseDocument(res);
	// parser.parseComplete(res);
	// console.log(parser);
    return parser;
}

let parser_deal = function(parser: any){
    let node: {
        type: undefined;
        data: undefined;
        attribs: undefined;
        name: undefined;
        children: any[];
    } = {
        type:undefined,
        data:undefined,
        attribs:undefined,
        name:undefined,
        children:[]
    };
    node.type = parser.type;
    node.data = parser.data;
    node.attribs = parser.attribs;
    node.name = parser.name;
    for(let index in parser.children){
        node.children.push(parser_deal(parser.children[index]));
    }
    return node;
}

let json_save = function(data:string, path:string){
    fs.writeFileSync(path, data, {
        encoding:'utf-8'
    });
}

// let core = async function(){
//     let parser = await base_info(url);
//     let node = parser_deal(parser);
//     // console.log(parser);
//     console.log(node);
//     json_save(JSON.stringify(node), 'node.json');
// }

// core();

let select_parser = function(select_message:string){
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

let xpath_parse = function(xpath:string){
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
            select_message: select_parser(select_message),
            index_message: index_message,
        })

    }

    return res;
}

let node_match = function(node, search_obj){
    // console.log('match');
    // console.log(node);
    // console.log(search_obj);

    if(!(node.type === 'tag' && node.name === search_obj.tag_name)){
        return false;
    }
    for(let key of Object.keys(search_obj.select_message)){
        // console.log(key);
        if(!(node.attribs[key] === search_obj.select_message[key])){
            return false;
        }
    }

    return true;
}

let xpath_search = function(node_data : any, xpath_parsed : any){
    let res = node_data;
    if(res.type === 'root' && !Array.isArray(res)){
        res = [res]
    }
    let buff = [];
    for(let index in xpath_parsed){
        let xpath = xpath_parsed[index];

        if(xpath.search_mode === 'only_child'){
            for(let node_index in res){
                let node = res[node_index];
                for(let child_index in node.children){
                    let child = node.children[child_index];
                    if(node_match(child, xpath)){
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

                        if(node_match(child, xpath)){
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
    
    return res;
}

let to_html = function(node : any, level = 0){
    // console.log(node);
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

        let mid = node.children.map((i: string)=> to_html(i, level+1)).join(''); // function(node.children, level+1);
        let end = head + `</${node.name}>\n`
        return pre+mid+end;
    }else if(node.type === 'text'){
        // if(node.data === '\n'){
        //     return '';
        // }
        if(/^[\n|\t]+$/.test(node.data)){
            return '';
        }
        return head + node.data + '\n';
    }
}

let to_text = function(node : any){
    if(node.type === 'tag' || node.type === 'root'){
        
        return node.children.map((i: string)=> to_text(i)).join(''); // function(node.children, level+1);

    }else if(node.type === 'text'){
        // if(node.data === '\n'){
        //     return '';
        // }
        if(/^[\n|\t]+$/.test(node.data)){
            return '';
        }
        return node.data + '\n';
    }
}

let core = async function(){
    let parser = await base_info(url);
    let node = parser_deal(parser);
    let xpath_parsed = xpath_parse(xpath);
    // console.log(parser);
    // console.log(node);
    // json_save(JSON.stringify(node), 'node.json');
    
    console.log(xpath_parsed);
    node = xpath_search(node, xpath_parsed);
    // console.log(node);
    // console.log(to_html(node[0]));
    // console.log(to_text(node[0]));
}

core();

// console.log(xpath_parse('/html/body/div[@class="bin"@lang="eng"][2]'));



// // const { Parser } = require("htmlparser2");
// // const { DomHandler } = require("domhandler");
// import {Parser} from 'htmlparser2';
// import { DomHandler } from 'htmlparser2';
// import fs from 'fs';
// // const rawHtml =
// //     '<div id="info">\
// // 	<h1>全职之云梦九歌</h1>\
// // 	<p>作&nbsp;&nbsp;&nbsp;&nbsp;者：一只懒散胖橘</p>\
// // 	<p>状&nbsp;&nbsp;&nbsp;&nbsp;态：连载</p>\
// // 					<p>动&nbsp;&nbsp;&nbsp;&nbsp;作：<a href="#footer" style="color:red;">直达底部</a>&nbsp;&nbsp;<a rel="nofollow" href="javascript:addBookCase(\'25726\');" style="color:red;">加入书架</a>\
// // 	<p>最后更新：2020-08-16 21:26:24</p>\
// // 	<p>最新章节：<a href="/25_25726/575705091.html">第十五章猜测？</a></p>\
// // </div>';
// let rawHtml = fs.readFileSync('try.txt', {
// 	encoding:'utf-8'
// });
// const handler = new DomHandler((error: any, dom: any) => {
//     if (error) {
//         // Handle error
//     } else {
//         // Parsing completed, do something
//         console.log(dom);
//     }
// });
// const parser = new Parser(handler);
// parser.write(rawHtml);
// parser.end();