import axios from "axios";
import cheerio from 'cheerio';
// import iconv from 'iconv-lite';

// console.log(axios);

// function transformResponse(data: any){
// 	console.log(data);
// 	data = iconv.decode(data, 'gbk');
// 	return data;
// }

async function sp() {
	let {data:res} = await axios.get('https://www.zhhbqg.com/25_25725/', {
		responseEncoding:'GBK'
	});

	res = cheerio.load(res);
	// console.log(res(".listmain dl").text());
	// res:{{name:String}[]};
	res = res(".listmain dl").children('dd');//.text()//.slice(0, 500);
	// console.log(res.slice(0, 10));

	// res = res.forEach((i: any)=> console.log(i));
	// res = res.filter('dd');
	console.log(cheerio.load(res[0]).html());
	// console.log(res[0].html());

	// let buff = [];

	// for(let index in res){
	// 	let item = res[index];
	// 	if(item.name == 'dd'){
	// 		buff.push(item);
	// 	}
	// }
	// console.log(buff[0])
	// console.log(cheerio.load(buff[0]).text());
	// console.log(buff.length);

}

sp();