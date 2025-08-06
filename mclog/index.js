document.addEventListener('DOMContentLoaded', function () {
    const logContainer = document.getElementById('logContainer');
    const infoCount = document.getElementById('infoCount');
    const warnCount = document.getElementById('warnCount');
    const errorCount = document.getElementById('errorCount');
    const totalCount = document.getElementById('totalCount');
    const logDefault = document.getElementById('log-default');
    const fileInput = document.getElementById('fileInput');
    const fileStatus = document.getElementById('fileStatus');


    fileInput.addEventListener('change', function () {
        const file = fileInput.files[0];
        if (!file) return;
        fileStatus.textContent = `正在读取：${file.name}`;
        logDefault.innerHTML += `<br><span class="log-date">[2/2] </span><span class="log-info">正在解析日志...</span>`;
        const reader = new FileReader();
        reader.onload = function (e) {
            parseAndDisplayLog(e.target.result);
            fileStatus.textContent = `已加载：${file.name}`;
        };
        reader.onerror = function () {
            logDefault.innerHTML = `<span class="log-error">[Error] 文件读取失败</span>`;
            fileStatus.textContent = '文件读取失败';
        };
        reader.readAsText(file, 'ansi');
    });

    // 解析日志并显示
    function parseAndDisplayLog(logContent) {
        logContainer.innerHTML = '';
        let info = 0, warn = 0, error = 0, total = 0;

        const lines = logContent.split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;

            total++;
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';

            // 添加日期高亮
            const dateMatch = line.match(/^\[(\d{2}\w{3}\d{4} \d{2}:\d{2}:\d{2}\.\d{3})\]/);
            if (dateMatch) {
                const dateStr = dateMatch[1];
                const restOfLine = line.substring(dateMatch[0].length);
                logEntry.innerHTML = `<span class="log-date">[${dateStr}]</span>${restOfLine}`;
            } else {
                logEntry.textContent = line;
            }

            // 根据日志级别设置样式
            if (line.includes('/ERROR]')) {
                logEntry.classList.add('log-error');
                error++;
            } else if (line.includes('/WARN]')) {
                logEntry.classList.add('log-warn');
                warn++;
            } else if (line.includes('/INFO]')) {
                logEntry.classList.add('log-info');
                info++;
            } else {
                logEntry.classList.add('log-default');
            }

            logContainer.appendChild(logEntry);
        });

        // 更新统计信息
        infoCount.textContent = info;
        warnCount.textContent = warn;
        errorCount.textContent = error;
        totalCount.textContent = total;

        // 滚动到底部
        logContainer.scrollTop = logContainer.scrollHeight;
    }
});