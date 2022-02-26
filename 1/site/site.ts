import zhhbqg  from './zhhbqg.ts';
import fs from 'fs';

interface Reload_path {
	new: string,
	old: string
}

interface Store_content {
	index:string,
	data:any
}

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
	let pool_size = 40;
	let lay_time = 0;
	let lay_step = 10*60*1000;
	while(point){
		if(lay_time != 0){
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
			buff = buff.map((i)=>i.index);
			// page_index = Math.max(...buff.map((i)=>i.page_index))
			reload_save(res, Math.max(...buff as number[]).toString(), reload_path, 'over');
			break;
		}

		if(!mark){
			res = [...res, ...buff];
		}
	}
}


let test = async function(){
	// let url = get_page_url(25725);
	// url = get_page_url(45725);
	let reload_path:Reload_path = {
		new:'zhhbpg_new.json',
		old:'zhhbpg_old.json'
	}
	// let info = await base_info(url);
	// console.log(info);
	// let get_page_url = zhhbqg.get_page_url;
	// let base_info = zhhbqg.base_info;
	reload(reload_path, zhhbqg);
}

test();