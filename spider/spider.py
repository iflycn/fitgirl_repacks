import os
import csv
import requests
import time
import random
from bs4 import BeautifulSoup
from datetime import datetime

site_url = "https://fitgirl-repacks.site"

# 获取页码范围
start_page = 1
end_page = 0
response = requests.get(site_url)
soup = BeautifulSoup(response.text, "html.parser")
page_links = soup.find_all("a", class_="page-numbers")
for link in page_links:
    page_text = link.get_text()
    if page_text.isdigit():
        page_number = int(page_text)
        end_page = max(end_page, page_number)
if end_page < start_page:
    print("\n未获取到有效页码，程序中止")
    os._exit(0)

# 爬取数据
data_list = []
failed_attempts = 0
while start_page <= end_page:
    # 开始爬取数据
    print(f"\n正在爬取第 {start_page}/{end_page} 页")
    url = f"{site_url}/page/{start_page}"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    articles = soup.find_all("article")

    # 检查是否成功爬取到数据
    if not articles:
        failed_attempts += 1
        if failed_attempts > 3:
            print("\n已连续失败 3 次，程序中止")
            os._exit(0)
        print("\n爬取数据失败，暂停 5 分钟后重试")
        time.sleep(300)
        continue

    # 解析爬取到的数据
    now_article = 0
    for article in articles:
        now_article += 1
        article_title_element = article.find("h1", class_="entry-title")
        article_time_element = article.find("time", class_="entry-date")
        article_link_element = article.find("a", href=lambda href: href and href.startswith("magnet:"))
        article_description_element = article.find("h3", string="Repack Features")
        article_content_element = article.find("div", class_="su-spoiler-content")
        if article_link_element:
            article_id = article.get("id").split("-")[-1]
            print(f"√ 已保存第 {now_article}/{len(articles)} 条数据")
            article_title = article_title_element.text.strip() if article_title_element else None
            article_time = article_time_element.get("datetime") if article_time_element else None
            article_link = article_link_element.get("href")
            article_description = article_description_element.find_next_sibling().text.strip() if article_description_element else None
            article_content = article_content_element.text.strip() if article_content_element else None
            data_list.append([article_id, article_title, article_time, article_link, article_description, article_content])
        else:
            print(f"× 抛弃第 {now_article}/{len(articles)} 条数据")

    # 每循环3次随机暂停
    if failed_attempts == 0 and start_page % 3 == 0:
        pause_time = random.randint(3, 5)
        print(f"\n暂停 {pause_time} 秒")
        time.sleep(pause_time)

    # 重置失败次数计数器
    failed_attempts = 0

    # 继续下一次循环
    start_page += 1

# 读取上次更新条数
config_file = "./config.txt"
if os.path.exists(config_file):
    with open(config_file, "r") as f:
        previous_count = int(f.read())
else:
    previous_count = 0
print(f"\n共获取到 {len(data_list)} 条有效数据，上次 {previous_count} 条")

# 检查是否满足写入条件
if len(data_list) >= previous_count:
    # 更新数据文件
    save_path = "../data"
    os.makedirs(save_path, exist_ok=True)
    current_time = datetime.now().strftime("%Y%m%d%H%M%S")
    csv_file = os.path.join(save_path, f"repacks-{current_time}.csv")
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["ID", "标题", "时间", "链接", "说明", "简介"])
        writer.writerows(data_list)
    print(f"\n数据文件 {csv_file} 已更新")

    # 更新配置文件
    with open(config_file, "w") as f:
        f.write(str(len(data_list)))
    print(f"配置文件 {config_file} 已更新")

    # 更新 README 文件
    template_file = "./readme.txt"
    md_file = "../README.md"
    with open(template_file, "r", encoding="utf-8") as f:
        template_content = f.read()
    template_content = template_content.replace("{{lastupdated}}", f"{current_time[:4]}-{current_time[4:6]}-{current_time[6:8]}")
    template_content = template_content.replace("{{datalength}}", str(len(data_list)))
    for i in range(min(10, len(data_list))):
        template_content = template_content.replace("{{articletitle}}", data_list[i][1], 1)
    with open(md_file, "w", encoding="utf-8") as f:
        f.write(template_content)
    print(f"README 文件 {md_file} 已更新")

    # 更新 HTML 模板
    template_file = "./template.txt"
    html_file = "../index.htm"
    with open(template_file, "r", encoding="utf-8") as f:
        template_content = f.read()
    template_content = template_content.replace("{{lastupdated}}", current_time)
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(template_content)
    print(f"HTML 模板 {html_file} 已更新")
else:
    print("\n爬取内容不完整，放弃数据更新")