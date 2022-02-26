import fs from 'fs';

let json_save = function(data:any, json_path:string){
    fs.writeFileSync(json_path, JSON.stringify(data, null, '\t'), {
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


let data = json_load('xbiqupao_new.json');
json_save(data, 'xbiqupao_new.json');
console.log(data.data.length);