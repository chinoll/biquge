const axios = require("axios")
const cheerio = require("cheerio")
const iconv = require('iconv-lite')
const fs = require("fs")
const util = require("util")
const async = require("async")
const base_url = "https://www.bqktxt.com"
function clear_html(html) {
    let s = /<br>/g;
    return html.slice(53,-176).replace(s,"\n").replace(/&nbsp;/g," ")
}
function get_path(html) {
    $ = cheerio.load(html)
    x = $("body > div.book > div.info > div.small > span:nth-child(2)").html().slice(3)
    y = $("body > div.book > div.info > h2").html()
    console.log("正在下载",y)
    let path
    if(x == "玄幻小说")
        path = "xuanhuan/"
    else if (x == "科幻小说")
        path = "kehuan/"
    else if(x == "穿越小说")
        path = "chuanyue/"
    else if(x == "网游小说")
        path = "wangyou/"
    else if(x == "修真小说")
        path = "xiuzhen/"
    else if(x == "都市小说")
        path = "dushi/"
    else
        path = "other/"
    path += y + ".json"
    return path
}
async function download_novel(url) {
    let data = await axios({
        method:"get",
        url:url,
        responseType: "arraybuffer" 
        })

    let text = iconv.decode(data.data, 'gbk');
    let path = get_path(text)
    $ = cheerio.load(text)
    x = $("body > div.listmain > dl > dd:nth-child(2)")
    let regex = new RegExp("<a href=\".*\.html\">");
    let link = new RegExp("/.*\.html")
    let start = new RegExp("正文卷")
    let chapter_list = []
    let text_list = []
    let chapter_dict = {}
    let url_list = []
    while (x.html() != null) {
        let html = x.html()
        if (start.test(html)) {
            x = x.next()
            break
        }
        x = x.next()
    }
    while(x.html() != null) {
            let html = x.html()
            let url = base_url + html.match(link)[0]
            html = html.replace(regex,"").slice(0,-4)
            url_list.push(url)
            chapter_list.push(html)
            chapter_dict[url] = html
            x = x.next()
    }

    async.mapLimit(url_list,url_list.length,async (url) => {
            let response = await axios({
                method:'get',
                url:url,
                responseType:"arraybuffer",
                timeout:5000
            })
            let text = iconv.decode(response.data,"gbk");
            let $ = cheerio.load(text)
            let html = $("#content")
            text = chapter_dict[url] + "\n\n" + clear_html(html.html())
            return text
    },(err,results) => {
        fs.writeFile(path,JSON.stringify(results),()=>{console.log(path,"OK")})

    })
}
function check_dir() {
    let dir_list = ["xuanhuan/","hehuan/","chuanyue/","wangou/","dushi/","xiuzhen/","other/"]
    for(let i = 0;i < dir_list.length;i++) {
        fs.stat(dir_list[i],(err,stat)=>{
            if(err)
                fs.mkdir(dir_list[i],(err) => {})
        })
    }
}
check_dir()
async function download(concurrent) {
    for(let i = 3612;i <= 70000;i += concurrent) {
        let id_list = []
        for(let j = 0;j < concurrent;j++)
            id_list.push(download_novel(util.format("https://www.bqktxt.com/0_%d",i + j)))

        await Promise.all(id_list).then((value) => {
        })
    }
}
download(100)