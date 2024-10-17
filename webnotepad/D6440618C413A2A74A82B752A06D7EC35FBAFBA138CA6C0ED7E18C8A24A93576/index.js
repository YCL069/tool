let base64 = document.getElementById('base64');
// 用户代理字串
document.getElementById('UA').value = navigator.userAgent;
// 访问设备
var uap = new UAParser();
uap.setUA(window.navigator.userAgent);
document.getElementById('devices').innerText = uap.getResult().os.name;
// 处理存储数据
for (let i = 0; i < allfile.length; i++) {
    var data = ReadJson('https://api.ycl.cool/tool/webnotepad/D6440618C413A2A74A82B752A06D7EC35FBAFBA138CA6C0ED7E18C8A24A93576/Data/' + allfile[i] + '.json', null, null, true, null);
    var devices = document.createElement('a');
    var textdiv = document.createElement('div');
    var UAtext = document.createElement('input');
    var delbtn = document.createElement('button');
    var time = document.createElement('a');
    var info = document.createElement('a');
    var text = document.createElement('textarea');
    var box = document.getElementById('box');
    var div = document.createElement('div');
    var br = document.createElement('br');
    var hr = document.createElement('hr');
    var UA = document.createElement('a');
    div.id = `note${i}`;
    div.classList = "note";
    time.innerText = getDate(data['timestamp']);
    devices.innerText = `设备: ${data['devices']}`;
    UA.innerText = "UserAgent:";
    UAtext.type = "text";
    UAtext.style.width = "calc(100% - 170px)";
    UAtext.readOnly = "readOnly";
    UAtext.value = data['userAgent'];
    hr.style.marginLeft = 0;
    hr.style.width = "94%";
    hr.style.margin = "0 auto";
    textdiv.style.marginLeft = 0;
    textdiv.style.textAlign = "center";
    text.style.width = "94%";
    text.style.height = "100px";
    text.style.marginLeft = 0;
    text.style.backgroundColor = "#70898daa";
    text.readOnly = "readOnly";
    text.value = data['text'];
    delbtn.style.marginLeft = 0;
    delbtn.innerText = "删除项目";
    delbtn.style.fontSize = "medium";
    delbtn.onclick = () => {
        Control(false, allfile[i], xhr => {
            document.getElementById(`delinfo${i}`).innerText = xhr.responseText;
            if (xhr.status == 200) { setTimeout(() => { document.getElementById(`note${i}`).style.display = 'none' }, 1000) }
        });
    };
    info.id = `delinfo${i}`;

    textdiv.appendChild(text);
    if (data['fileExtension'] != "?") {
        var img = document.createElement('img');
        img.style.width = "95%";
        img.style.marginLeft = 0;
        img.src = "https://api.ycl.cool/tool/webnotepad/D6440618C413A2A74A82B752A06D7EC35FBAFBA138CA6C0ED7E18C8A24A93576/Data/" + allfile[i] + "." + data['fileExtension']
        textdiv.appendChild(img);
    }
    textdiv.appendChild(delbtn);
    textdiv.appendChild(info);
    div.appendChild(time);
    div.appendChild(devices);
    div.appendChild(br);
    div.appendChild(UA);
    div.appendChild(UAtext);
    div.appendChild(hr);
    div.appendChild(textdiv);
    box.appendChild(div);
}

function getDate(timestamp) {
    // 将时间戳转换为日期时间
    const date = new Date(timestamp * 1000); // 将秒转换为毫秒
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);
    const seconds = ("0" + date.getSeconds()).slice(-2);
    // yyyy-mm-dd hh:mm:ss
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function Control(isAdd, DeleteID, DelCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.ycl.cool/tool/webnotepad/D6440618C413A2A74A82B752A06D7EC35FBAFBA138CA6C0ED7E18C8A24A93576/control.php', true);
    if (isAdd) {
        document.getElementById('return').style.display = null;
        document.getElementById('return').innerText = "Uploading...";
        // 设置请求头
        xhr.setRequestHeader('User-Device', uap.getResult().os.name);
        xhr.onreadystatechange = () => {
            document.getElementById('return').innerText = xhr.responseText;
            setTimeout(() => { location.reload() }, 500)
        }
        // 准备要发送的数据
        var formData = new FormData();
        var file = document.getElementById('inputImage').files[0];
        if (file !== undefined) {
            var fileSize = file.size;
            var maxSize = 10 * 1024 * 1024;
            if (fileSize > maxSize) { // 文件大小超过 10MB
                var errinfo = document.getElementById('return');
                errinfo.style.display = null;
                errinfo.innerHTML = "<a style='color:red'>文件大小超过 10MB, 请选择一个较小的文件。</a>";
                return;
            }
            formData.append('img', file);
        }
        formData.append('text', document.getElementById('inputText').value);
        xhr.send(formData);// 发送请求
    } else {
        // 设置请求头
        xhr.setRequestHeader('DELETEID', DeleteID);
        xhr.onreadystatechange = () => {
            DelCallback(xhr);
        }
        // 发送请求
        xhr.send();
    }
}
