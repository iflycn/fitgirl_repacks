// 版权信息
console.log(
  '%c FR 镜像库 %c Made By ifly ',
  'background:#0d6efd;padding:1px;border-radius:3px 0 0 3px;color:#fff',
  'background:#999;padding:1px;border-radius:0 3px 3px 0;color:#fff'
);

// 定义全局变量
let rawData, renderData;

const db = new Dexie('fitgirl-repacks');

const search = document.getElementById('search');
const dataContainer = document.getElementById('dataContainer');
const pagination = document.getElementById('pagination');

const itemsPerPage = 10; // 每页显示的数据条数
let currentPage = 1; // 当前页码

// 主题切换
const theme = document.querySelector('.theme');
const isDarkTheme = () => {
  return localStorage.getItem('fitgirl-repacks-theme') === 'dark';
};

isDarkTheme() && document.body.classList.add('dark');

theme.addEventListener('click', function () {
  localStorage.setItem('fitgirl-repacks-theme', isDarkTheme() || 'dark');
  document.body.classList.toggle('dark');
});

// 初始化页面
const initPage = async () => {
  creatIndexedDB(['fileVersion', 'fileData']); // 创建缓存数据库
  const versionData = await readIndexedDB('fileVersion'); // 读取缓存数据库

  if (versionData && versionData.value === fileVersion) {
    // 缓存匹配，从缓存读取数据
    const data = await readIndexedDB('fileData');
    rawData = data.value;
  } else {
    // 缓存不匹配，从文件读取数据
    const response = await fetch(fileURL);
    const buffer = await response.arrayBuffer();
    rawData = readExcelData(buffer);
    // 写入缓存
    await writeIndexedDB('fileVersion', fileVersion);
    await writeIndexedDB('fileData', rawData);
  }
  renderData = rawData;

  // 渲染页面
  renderSearch();
  renderPage();
};

// 渲染搜索区域
const renderSearch = () => {
  // 创建搜索框
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'searchTerm';
  input.placeholder = `在 ${renderData.length} 款游戏中搜索`;

  // 用户按回车键搜索
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      const searchTerm = input.value.toLowerCase().split(' ');
      renderData = rawData.filter(item => searchTerm.every(word => item[1].toLowerCase().includes(word)));
      currentPage = 1;
      renderPage();
    }
  });

  // 将搜索框添加到页面
  search.appendChild(input);
};

// 渲染数据区域
const renderPage = () => {
  showData();
  renderPagination();
  window.scrollTo({
    top: 0
  });
};

// 生成展示数据
const showData = () => {
  dataContainer.innerHTML = ''; // 清空容器

  // 计算当前页的数据起始位置和结束位置
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  // 遍历当前页的数据
  for (let i = start; i < end && i < renderData.length; i++) {
    const item = renderData[i];

    // 创建数据块元素
    const dataBlock = document.createElement('div');
    dataBlock.classList.add('data-block');

    // 创建标题元素
    const title = document.createElement('h3');
    title.classList.add('data-title');
    title.textContent = item[1];
    dataBlock.appendChild(title);

    // 创建其他内容元素
    const time = document.createElement('p');
    time.classList.add('data-time');
    time.textContent = new Date(item[2]).toLocaleString();
    dataBlock.appendChild(time);

    const magnetLink = document.createElement('a');
    magnetLink.classList.add('data-link');
    magnetLink.href = item[3];
    magnetLink.textContent = '磁力链接';
    dataBlock.appendChild(magnetLink);

    if (item[4]) {
      const description = document.createElement('div');
      description.classList.add('data-info');
      description.innerHTML = `<h4>打包说明:</h4>${formatText(item[4], 'li')}`;
      dataBlock.appendChild(description);
    }

    if (item[5]) {
      const summary = document.createElement('div');
      summary.classList.add('data-info');
      summary.innerHTML = `<h4>游戏介绍:</h4>${formatText(item[5])}`;
      dataBlock.appendChild(summary);
    }

    // 将数据块添加到容器中
    dataContainer.appendChild(dataBlock);
  }
};

// 渲染分页
const renderPagination = () => {
  pagination.innerHTML = ''; // 清空容器

  const totalPages = Math.ceil(renderData.length / itemsPerPage); // 总页数
  const startPage = Math.max(1, currentPage - 5); // 当前页附近的开始页码
  const endPage = Math.min(totalPages, startPage + 9); // 当前页附近的结束页码

  // 创建上一页按钮
  const prevButton = document.createElement('button');
  prevButton.textContent = '上一页';
  if (currentPage <= 1) prevButton.disabled = 'disabled';
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });
  pagination.appendChild(prevButton);

  // 创建页码按钮
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    if (currentPage == i) pageButton.disabled = 'disabled';
    pageButton.addEventListener('click', event => {
      currentPage = parseInt(event.target.textContent);
      renderPage();
    });
    isMobile() || pagination.appendChild(pageButton);
  }

  // 创建下一页按钮
  const nextButton = document.createElement('button');
  nextButton.textContent = '下一页';
  if (currentPage >= totalPages) nextButton.disabled = 'disabled';
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
    }
  });
  pagination.appendChild(nextButton);
};

// 读取 Excel 文件数据
const readExcelData = buffer => {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 });

  return jsonData;
};

// 利用换行符格式化字符串
const formatText = (input, wrapperTag = 'p') => {
  const paragraphs = input.split('\n');

  // 生成包裹标签的开始和结束标记
  const startTag = `<${wrapperTag}>`;
  const endTag = `</${wrapperTag}>`;

  // 构建包含段落的 HTML 代码
  const html = paragraphs.map(paragraph => `${startTag}${paragraph}${endTag}`).join('');

  return html;
};

// 创建 IndexedDB
const creatIndexedDB = (storeNames) => {
  for (const storeName of storeNames) {
    db.version(1).stores({ [storeName]: '++id, value' });
  }
};

// 写入数据到 IndexedDB
const writeIndexedDB = async (storeName, data) => {
  await db[storeName].put({ id: 1, value: data });
};

// 从 IndexedDB 读取数据
const readIndexedDB = async (storeName) => {
  return await db[storeName].get(1);
};

// 判断是否手机端
const isMobile = () => {
  return /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

initPage();
