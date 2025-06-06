let id_data = [];
let RSA_up, RSA_down;
// const server_URL = 'http://192.168.216.128:8080/';
const server_URL = 'https://api.ycl.cool/tool/webnotepad/';
const errtext = document.getElementById('error-text');
const crypt = new JSEncrypt();

// 读取本地密钥
Promise.all([
    indexedDBControl.getFromIndexedDB('Webnotepad', 'rsa', 'up').catch(e => ErrorShow('Info0', e.stack, 4)),
    indexedDBControl.getFromIndexedDB('Webnotepad', 'rsa', 'down').catch(e => ErrorShow('Info1', e.stack, 5))
])
    .then(([upKey, downKey]) => {
        if (upKey !== undefined) {
            RSA_up = upKey;
            console.log('上行公钥成功读取');
            document.getElementById('RSA0-info').innerText = 'OK';
            document.getElementById('RSA0-info').style.color = 'green';
        }
        if (downKey !== undefined) {
            RSA_down = downKey;
            console.log('下行私钥成功读取');
            document.getElementById('RSA1-info').innerText = 'OK';
            document.getElementById('RSA1-info').style.color = 'green';
        }
        GetItem();
    });
// 密钥选择函数
function RSAChoose(event, isUpload = false) {
    const id = isUpload ? '0' : '1';
    const file = event.target.files;
    const info = document.getElementById(`RSA${id}-info`);
    const save = document.getElementById(`RSA${id}-save`).checked;
    info.innerText = "Loading...";
    info.style.color = "gray";
    if (file.length === 0) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        info.innerText = "OK";
        info.style.color = "green";
        const result = e.target.result;
        if (isUpload) {
            RSA_up = result;
            if (save) {
                indexedDBControl.saveToIndexedDB('Webnotepad', 'rsa', 'up', result)
                    .then(() => console.log('上行公钥已存储到本地'))
                    .catch(error => ErrorShow('Info0', error.stack, 2))
            }
        } else {
            RSA_down = result;
            if (save) {
                indexedDBControl.saveToIndexedDB('Webnotepad', 'rsa', 'down', result)
                    .then(() => console.log('下行私钥已存储到本地'))
                    .catch(error => ErrorShow('Info1', error.stack, 3))
            }
        }
    };
    reader.onerror = e => ErrorShow(`Info${id}`, e.target.error.message, isUpload ? 0 : 1);
    reader.readAsText(file[0]);
}

// 添加项目
async function AddItem() {
    try {
        // token
        const token = GetToken();
        if (!token) {
            ErrorShow('Info1', '当前上行密钥:' + RSA_up, 6);
            return
        }

        // 生成并加密AES密钥
        const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true, ["encrypt", "decrypt"]
        );
        const Key_export = await crypto.subtle.exportKey('raw', key);
        const key_crypt = crypt.encrypt(ArrayToBase64(Key_export));
        if (!key_crypt) {
            ErrorShow('Info0', `当前上行密钥为:\n${RSA_up}`, 12);
            return
        }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const iv_crypt = crypt.encrypt(ArrayToBase64(iv));
        if (!iv_crypt) {
            ErrorShow('Info0', `当前上行密钥为:\n${RSA_up}`, 13);
            return
        }

        // 处理文字
        const txt_enc = new TextEncoder();
        const txt_crypt = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key, txt_enc.encode(document.getElementById('Input-text').value)
        );
        const txt_crypt_ut8 = new Uint8Array(txt_crypt);

        // 发送请求
        let text;
        try {
            const data = new FormData();
            data.append('key', key_crypt);
            data.append('iv', iv_crypt);
            data.append('img', document.getElementById('Input-img').files[0] || false);
            data.append('txt', btoa(String.fromCharCode(...txt_crypt_ut8)));
            const response = await fetch(server_URL, {
                method: 'POST',
                headers: { 'token': token },
                body: data
            });
            if (!response.ok) {
                ErrorShow('Info0', '查看控制台以获取详细信息...', 10, `${response.status} ${response.statusText}`);
                console.log(response);
                return
            }
            text = await response.text();
        } catch (error) {
            ErrorShow('Info0', error.stack + '\n查看控制台以获取更多信息...', 11);
            console.log(error);
            return
        }
        const info = document.getElementById('Info0');
        info.style = '';
        info.innerText = text;
        setTimeout(() => {
            info.style.display = "none";
            location.reload();
        }, 2000)
    }
    catch (error) {
        ErrorShow('Info0', '查看控制台以获取详细信息...', -1);
        console.log(error)
    }
}

// 获取项目
async function GetItem() {
    try {
        const token = GetToken();
        if (!token) {
            ErrorShow('Info1', '当前上行密钥:' + RSA_up, 6);
            return
        }

        // 获取列表
        let json;
        try {
            const response = await fetch(server_URL, {
                method: 'GET',
                headers: { 'token': token }
            });
            if (!response.ok) {
                ErrorShow('Info1', '查看控制台以获取详细信息...', 12, `${response.status} ${response.statusText}`);
                return
            };
            json = await response.json();
            if (json.length === 0) {
                document.getElementsByClassName('container download')[0].style.display = "none";
                return
            }
        } catch (error) {
            ErrorShow('Info1', error.stack + '\n查看控制台以获取更多信息...', 11);
            console.log(error);
            return
        }

        // 迭代处理响应数据
        let iserror = false;
        Object.keys(json).forEach(async (subName, i) => {
            const item = json[subName];

            // 回加密id数据
            crypt.setPrivateKey(RSA_down);
            const id_enc = crypt.decrypt(subName);
            if (!id_enc) {
                ErrorShow('Info1', `当前下行密钥为:\n${RSA_down}`, 9);
                iserror = true;
                return
            }
            crypt.setPublicKey(RSA_up);
            const data_enc = crypt.encrypt(id_enc.replace(/^["]|["]$/g, ''));
            if (!data_enc) {
                ErrorShow('Info1', `当前下行密钥为:\n${RSA_up}`, 10);
                iserror = true;
                return
            }
            id_data[i] = data_enc;

            // 获取AES密钥和初始化向量
            crypt.setPrivateKey(RSA_down);
            const iv_data = crypt.decrypt(item.iv);
            const iv = Base64ToArray(iv_data);
            const key_dec = crypt.decrypt(item.key);
            const key_data = Base64ToArray(key_dec);
            const key = await crypto.subtle.importKey(
                'raw', key_data,
                'AES-GCM', true, ['decrypt']
            );

            // 解密数据
            const decrypt_Data = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key, Base64ToArray(item.text)
            );
            const dec = new TextDecoder();
            const text = dec.decode(decrypt_Data);

            // 处理时间信息
            const time_Date = crypt.decrypt(item.time);
            const time = JSON.parse(time_Date);
            const date_Data = new Date(parseInt(time.date));
            // 计算本地时间偏移（分钟）
            const timeOffset = time.offset * 60;
            const localTime = new Date(date_Data.getTime() + timeOffset * 60000);
            // 格式化日期和时间
            const year = localTime.getUTCFullYear();
            const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
            const day = String(localTime.getUTCDate()).padStart(2, '0');
            const hour = String(localTime.getUTCHours()).padStart(2, '0');
            const minute = String(localTime.getUTCMinutes()).padStart(2, '0');
            // 构建日期字符串
            const data_txt = `${year}-${month}-${day} ${hour}:${minute}`;

            // 添加到页面
            const div = document.createElement('div');
            div.classList = "container item";
            div.id = `Item${i}`;
            div.innerHTML = `
                <b>${data_txt}&emsp;${time.zone}&nbsp;(UTC${time.offset >= 0 ? '+' + time.offset : time.offset})</b>
                <input type="text" value="${item.userAgent}" readonly>
                <hr>
                <div class="text">
                    <textarea readonly>${text}</textarea>
                </div>
                ${item.img ? `<img src="${server_URL}Data/${item.img}">` : ''}
                <div class="container button">
                    <button onclick="DelItem(${i})">删除笔记</button><br>
                    <a id="Item-info${i}"></a>
                </div>`;
            document.body.appendChild(div);
        });
        if (!iserror) document.getElementsByClassName('container download')[0].style.display = "none"
    } catch (error) {
        ErrorShow('Info1', error.stack, -1);
        console.log(error)
    }
}

// 删除项目
async function DelItem(id) {
    const token = GetToken();
    if (!token) {
        ErrorShow(`Item-info${id}`, '当前上行密钥:' + RSA_up, 6);
        return
    }
    try {
        const response = await fetch(server_URL, {
            method: 'DELETE',
            headers: { 'token': token },
            body: id_data[id]
        });
        document.getElementById(`Item-info${id}`).innerText = `${response.status} ${response.statusText ? response.statusText : 'OK'}`;
        setTimeout(() => document.getElementById(`Item${id}`).style.display = "none", 1500)
    } catch (error) {
        ErrorShow(`Item-info${id}`, error.stack + '\n查看控制台以获取更多信息...', 11);
        console.log(error)
    }
}

// token生成
function GetToken() {
    const now = Date.now();
    const offset = new Date().getTimezoneOffset() / -60;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tokenText = `{"time":{"date":${now},"zone":"${zone}","offset":${offset}},"random":"${RandomString()}"}`;
    crypt.setPublicKey(RSA_up);
    return crypt.encrypt(tokenText)
}

// 错误信息显示
function ErrorShow(divID, infoText, TitleID, replace = '') {
    const infoTitle = [
        '-1.1 上行密钥文件读取错误', // 0

        '-1.2 下行密钥文件读取错误',
        '-2.1 尝试将上行公钥存储到本地失败',
        '-2.2 尝试将下行私钥存储到本地失败',
        '-2.3 无法从本地读取上行公钥',
        '-2.4 无法从本地读取下行私钥', // 5

        '-3.1 token加密失败',
        '-3.2 AES密钥加密失败',
        '-3.2 AES初始化向量加密失败',
        '-3.3 响应数据解密失败',
        '-3.4 响应数据回加密失败', // 10

        '-6.1 未知请求错误',
        '-6.2 Http $Code$',
    ];
    const warn = [2, 3, 4, 5];
    const title = (infoTitle[TitleID] || '-100 未知错误').replace(/\$\w+\$/g, replace);
    const info = document.getElementById(divID);
    info.innerText = title;
    info.style.color = warn.includes(TitleID) ? "#ff0" : "red";
    errtext.value += Date() + "\n";
    errtext.value += title + "\n";
    errtext.value += "--------------------------\n";
    errtext.value += infoText + "\n\n";
    document.getElementsByClassName('error')[0].style.display = 'block';
}

// 错误信息div控制
function ErrorDiv(isup) {
    document.getElementById('error-info').style.display = isup ? 'block' : 'none';
    document.getElementById('arrow-down').style.display = isup ? 'block' : 'none';
    document.getElementById('arrow-up').style.display = isup ? 'none' : 'block';
}

// 将 Base64 转换为 ArrayBuffer
function Base64ToArray(base64) {
    const String = window.atob(base64);
    const bytes = new Uint8Array(String.length);
    for (let i = 0; i < String.length; i++) {
        bytes[i] = String.charCodeAt(i);
    }
    return bytes.buffer;
}

// 将 ArrayBuffer 转换为 Base64
function ArrayToBase64(array) {
    let binary = '';
    const bytes = new Uint8Array(array);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary);
}
