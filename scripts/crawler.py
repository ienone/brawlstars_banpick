"""
Brawlify 数据爬虫 - 支持增量更新
从 Brawlify 官方 API 获取英雄、地图、游戏模式数据，并将图片转换为 WebP 格式保存。

增量更新逻辑：
  - 对比当前 manifest.json 与 API 最新数据，只下载新增或本地文件缺失的资源
  - 已存在且文件完整的资源直接跳过，不重复下载

用法：
  cd brawl_ban_pick
  python scripts/crawler.py [--force]    # --force 强制重新下载所有资源
"""

import os
import sys
import json
import time
import argparse
import requests
from PIL import Image
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── 配置 ────────────────────────────────────────────────────────────────────

API_BASE    = "https://api.brawlify.com/v1"
CDN_BASE    = "https://cdn.brawlify.com"

# 项目根目录（脚本位于 scripts/，根目录在上一级）
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT  = os.path.dirname(SCRIPT_DIR)

ASSETS_DIR    = os.path.join(PROJECT_ROOT, "assets")
BRAWLERS_DIR  = os.path.join(ASSETS_DIR, "brawlers")
MAPS_DIR      = os.path.join(ASSETS_DIR, "maps")
MODES_DIR     = os.path.join(ASSETS_DIR, "gamemodes")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "manifest.json")

WEBP_QUALITY  = 90          # WebP 质量 (1-100)
MAX_WORKERS   = 16          # 并发下载线程数
REQUEST_TIMEOUT = 20        # 单次请求超时秒数
RETRY_COUNT   = 3           # 下载失败重试次数

# ─── HTTP Session ─────────────────────────────────────────────────────────────

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; BrawlBanPickCrawler/2.0)",
})

# ─── 中文名映射 ───────────────────────────────────────────────────────────────

CN_NAME_MAPPING = {
    "Shelly": "雪莉", "Nita": "妮塔", "Colt": "柯尔特", "Bull": "公牛",
    "Jessie": "杰西", "Brock": "布洛克", "Dynamike": "爆破麦克", "Bo": "阿渤",
    "Tick": "迪克", "8-Bit": "8比特", "Emz": "艾魅", "Stu": "斯图",
    "El Primo": "艾尔·普里莫", "Barley": "巴利", "Poco": "波克",
    "Rosa": "罗莎", "Rico": "瑞科", "Darryl": "达里尔", "Penny": "潘妮",
    "Carl": "卡尔", "Jacky": "雅琪", "Piper": "佩佩", "Pam": "帕姆",
    "Frank": "弗兰肯", "Bibi": "比比", "Bea": "贝亚", "Nani": "纳妮",
    "Edgar": "艾德加", "Griff": "格里夫", "Grom": "格罗姆", "Bonnie": "邦妮",
    "Mortis": "莫提斯", "Tara": "塔拉", "Gene": "吉恩", "Max": "麦克斯",
    "Mr. P": "P先生", "Sprout": "芽芽", "Byron": "拜伦", "Squeak": "史魁克",
    "Spike": "斯派克", "Crow": "黑鸦", "Leon": "里昂", "Sandy": "沙迪",
    "Amber": "琥珀", "Meg": "梅格", "Gale": "格尔", "Surge": "瑟奇",
    "Colette": "科莱特", "Lou": "小罗", "Ruffs": "拉夫上校",
    "Belle": "贝尔", "Buzz": "巴兹", "Ash": "阿灰", "Lola": "萝拉",
    "Fang": "阿方", "Eve": "伊芙", "Janet": "珍妮特", "Otis": "奥蒂斯",
    "Sam": "山姆", "Gus": "古斯", "Buster": "巴斯特", "Chester": "切斯特",
    "Gray": "格雷", "Mandy": "曼迪", "R-T": "R-T", "Willow": "薇洛",
    "Maisie": "梅奇", "Hank": "汉克", "Cordelius": "科德柳斯", "Doug": "道格",
    "Pearl": "珀尔", "Chuck": "查克", "Charlie": "查莉", "Mico": "米科",
    "Kit": "凯特", "Larry & Lawrie": "拉里和洛里", "Melodie": "美乐蒂",
    "Angelo": "安吉洛", "Draco": "德拉科", "Lily": "莉莉", "Berry": "贝里",
    "Clancy": "克兰西", "Moe": "莫", "Kenji": "健次", "Juju": "珠珠",
    "Shade": "影", "Ollie": "奥利", "Meeple": "米普尔", "Lumi": "露米",
    "Finx": "芬克斯", "Jae-Yong": "李在勇", "Kaze": "风", "Alli": "阿丽",
    "Trunk": "树干克", "Pierce": "皮尔斯", "Sirius": "天狼星", "Najia": "纳吉娅",
    "Gigi": "吉吉", "Ziggy": "兹基", "Mina": "米娜",
}

# 稀有度 ID 到名称映射（来自 API rarity.id）
RARITY_ID_MAP = {
    0: "Unknown",
    1: "Common",
    2: "Rare",
    3: "Super Rare",
    4: "Epic",
    5: "Mythic",
    6: "Legendary",
    7: "Ultra Legendary",
}

# ─── 工具函数 ─────────────────────────────────────────────────────────────────

def ensure_dirs():
    """确保所有输出目录存在"""
    for d in [BRAWLERS_DIR, MAPS_DIR, MODES_DIR]:
        os.makedirs(d, exist_ok=True)


def load_manifest() -> dict:
    """读取已有的 manifest.json，不存在则返回空结构"""
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] 读取 manifest.json 失败: {e}，将从头构建。")
    return {"brawlers": [], "maps": [], "gamemodes": []}


def save_manifest(data: dict):
    """保存 manifest.json"""
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] manifest.json 已更新 -> {MANIFEST_PATH}")


def fetch_api(endpoint: str) -> list:
    """调用 Brawlify API，返回 list 数据"""
    url = f"{API_BASE}/{endpoint}"
    print(f"[API] GET {url}")
    resp = session.get(url, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json().get("list", [])


def download_and_convert(remote_url: str, local_path: str, force: bool = False) -> tuple[bool, str]:
    """
    下载图片并转换为 WebP 格式。
    Returns (success, message)
    """
    if not force and os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return True, f"EXISTS {local_path}"

    for attempt in range(1, RETRY_COUNT + 1):
        try:
            r = session.get(remote_url, timeout=REQUEST_TIMEOUT)
            if r.status_code == 200:
                img = Image.open(BytesIO(r.content)).convert("RGBA")
                img.save(local_path, "WEBP", quality=WEBP_QUALITY)
                return True, f"SAVED  {local_path}"
            else:
                msg = f"HTTP {r.status_code} for {remote_url}"
                if attempt == RETRY_COUNT:
                    return False, f"FAILED {msg}"
                time.sleep(1)
        except Exception as e:
            msg = str(e)
            if attempt == RETRY_COUNT:
                return False, f"ERROR  {remote_url}: {msg}"
            time.sleep(1)
    return False, f"FAILED {remote_url}"


# ─── 数据解析 ─────────────────────────────────────────────────────────────────

def parse_brawlers(api_list: list) -> list:
    """
    将 API 返回的英雄列表解析为项目所需的格式。
    使用 imageUrl2（无边框版本）适合 BP 界面展示。
    """
    result = []
    for item in api_list:
        if not item.get("released", True):
            continue  # 跳过未发布英雄

        bid = item["id"]
        name_en = item["name"]
        rarity_id = item.get("rarity", {}).get("id", 0)
        rarity_name = item.get("rarity", {}).get("name", RARITY_ID_MAP.get(rarity_id, "Common"))
        rarity_color = item.get("rarity", {}).get("color", "#b9eaff")

        # imageUrl2 = borderless（无边框），更适合 BP 界面
        image_remote = item.get("imageUrl2") or item.get("imageUrl", "")

        result.append({
            "bid": bid,
            "name_en": name_en,
            "name_cn": CN_NAME_MAPPING.get(name_en, name_en),
            "rarity": rarity_name,
            "color": rarity_color,
            "image_url": f"/assets/brawlers/{bid}.webp",
            "remote_url": image_remote,
        })
    return result


def parse_maps(api_list: list) -> list:
    """将 API 返回的地图列表解析为项目所需的格式"""
    result = []
    seen = set()
    for item in api_list:
        mid = item["id"]
        if mid in seen:
            continue
        seen.add(mid)

        result.append({
            "mid": mid,
            "name": item["name"],
            "mode": item.get("gameMode", {}).get("name", ""),
            "mode_color": item.get("gameMode", {}).get("color", "#ffffff"),
            "is_active": not item.get("disabled", True),
            "image_url": f"/assets/maps/{mid}.webp",
            "remote_url": item.get("imageUrl", ""),
        })
    return result


def parse_gamemodes(api_list: list) -> list:
    """从地图列表中提取去重的游戏模式"""
    seen = set()
    result = []
    for item in api_list:
        gm = item.get("gameMode", {})
        gid = gm.get("id")
        if gid is None or gid in seen:
            continue
        seen.add(gid)
        result.append({
            "mid": gid,
            "name": gm.get("name", ""),
            "color": gm.get("color", "#ffffff"),
            "image_url": f"/assets/gamemodes/{gid}.webp",
            "remote_url": gm.get("imageUrl", ""),
        })
    return result


# ─── 增量更新逻辑 ─────────────────────────────────────────────────────────────

def build_download_tasks(
    new_brawlers: list,
    new_maps: list,
    new_modes: list,
    old_manifest: dict,
    force: bool,
) -> list[dict]:
    """
    对比新旧数据，构建需要下载的任务列表。
    每个任务包含 remote_url / local_path / label。
    """
    tasks = []

    # --- 英雄 ---
    old_brawler_ids = {b["bid"] for b in old_manifest.get("brawlers", [])}
    for b in new_brawlers:
        local = os.path.join(BRAWLERS_DIR, f"{b['bid']}.webp")
        is_new = b["bid"] not in old_brawler_ids
        file_missing = not os.path.exists(local) or os.path.getsize(local) == 0
        if force or is_new or file_missing:
            tasks.append({
                "remote_url": b["remote_url"],
                "local_path": local,
                "label": f"Brawler {b['name_en']} ({b['bid']})",
                "force": force,
            })

    # --- 地图 ---
    old_map_ids = {m["mid"] for m in old_manifest.get("maps", [])}
    for m in new_maps:
        local = os.path.join(MAPS_DIR, f"{m['mid']}.webp")
        is_new = m["mid"] not in old_map_ids
        file_missing = not os.path.exists(local) or os.path.getsize(local) == 0
        if force or is_new or file_missing:
            tasks.append({
                "remote_url": m["remote_url"],
                "local_path": local,
                "label": f"Map {m['name']} ({m['mid']})",
                "force": force,
            })

    # --- 游戏模式 ---
    old_mode_ids = {gm["mid"] for gm in old_manifest.get("gamemodes", [])}
    for gm in new_modes:
        local = os.path.join(MODES_DIR, f"{gm['mid']}.webp")
        is_new = gm["mid"] not in old_mode_ids
        file_missing = not os.path.exists(local) or os.path.getsize(local) == 0
        if force or is_new or file_missing:
            tasks.append({
                "remote_url": gm["remote_url"],
                "local_path": local,
                "label": f"Mode {gm['name']} ({gm['mid']})",
                "force": force,
            })

    return tasks


def run_downloads(tasks: list[dict]) -> tuple[int, int]:
    """并发执行下载任务，返回 (成功数, 失败数)"""
    if not tasks:
        print("[INFO] 没有需要下载的新资源。")
        return 0, 0

    print(f"\n[INFO] 开始下载 {len(tasks)} 个资源（并发={MAX_WORKERS}）...\n")
    success, fail = 0, 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(
                download_and_convert,
                t["remote_url"],
                t["local_path"],
                t["force"],
            ): t
            for t in tasks
        }
        for future in as_completed(futures):
            task = futures[future]
            ok, msg = future.result()
            status = "✓" if ok else "✗"
            print(f"  {status} [{task['label']}] {msg}")
            if ok:
                success += 1
            else:
                fail += 1

    return success, fail


# ─── 主流程 ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Brawlify 资源爬虫（支持增量更新）")
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="强制重新下载所有资源（忽略已有文件）",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Brawlify 资源爬虫  v2.0  (增量更新模式)")
    print("=" * 60)
    if args.force:
        print("[WARN] --force 模式：将重新下载所有资源\n")

    ensure_dirs()

    # 1. 读取旧 manifest（用于增量比对）
    old_manifest = load_manifest()
    old_brawler_count = len(old_manifest.get("brawlers", []))
    old_map_count = len(old_manifest.get("maps", []))
    old_mode_count = len(old_manifest.get("gamemodes", []))
    print(f"\n[INFO] 当前 manifest: {old_brawler_count} 英雄 / {old_map_count} 地图 / {old_mode_count} 模式")

    # 2. 拉取最新 API 数据
    print()
    try:
        brawler_api = fetch_api("brawlers")
        map_api = fetch_api("maps")
    except Exception as e:
        print(f"[ERROR] API 请求失败: {e}")
        sys.exit(1)

    # 3. 解析数据
    new_brawlers = parse_brawlers(brawler_api)
    new_maps = parse_maps(map_api)
    new_modes = parse_gamemodes(map_api)

    print(f"\n[API]  获取到: {len(new_brawlers)} 英雄 / {len(new_maps)} 地图 / {len(new_modes)} 模式")

    # 4. 统计增量
    old_bids = {b["bid"] for b in old_manifest.get("brawlers", [])}
    old_mids = {m["mid"] for m in old_manifest.get("maps", [])}
    old_gids = {g["mid"] for g in old_manifest.get("gamemodes", [])}

    new_brawler_ids = {b["bid"] for b in new_brawlers}
    new_map_ids = {m["mid"] for m in new_maps}
    new_mode_ids = {g["mid"] for g in new_modes}

    added_brawlers = new_brawler_ids - old_bids
    added_maps = new_map_ids - old_mids
    added_modes = new_mode_ids - old_gids

    if added_brawlers:
        names = [b["name_en"] for b in new_brawlers if b["bid"] in added_brawlers]
        print(f"  + 新增英雄 ({len(added_brawlers)}): {', '.join(names)}")
    if added_maps:
        print(f"  + 新增地图 ({len(added_maps)})")
    if added_modes:
        names = [g["name"] for g in new_modes if g["mid"] in added_modes]
        print(f"  + 新增模式 ({len(added_modes)}): {', '.join(names)}")

    if not args.force and not added_brawlers and not added_maps and not added_modes:
        # 检查是否有本地文件缺失
        missing = sum(
            1 for b in new_brawlers
            if not os.path.exists(os.path.join(BRAWLERS_DIR, f"{b['bid']}.webp"))
        )
        missing += sum(
            1 for m in new_maps
            if not os.path.exists(os.path.join(MAPS_DIR, f"{m['mid']}.webp"))
        )
        missing += sum(
            1 for g in new_modes
            if not os.path.exists(os.path.join(MODES_DIR, f"{g['mid']}.webp"))
        )
        if missing == 0:
            print("\n[INFO] 数据已是最新，无需更新。")
            # 仍然刷新 manifest（元数据可能有变动如稀有度调整）
            save_manifest({"brawlers": new_brawlers, "maps": new_maps, "gamemodes": new_modes})
            return

    # 5. 构建下载任务并执行
    tasks = build_download_tasks(new_brawlers, new_maps, new_modes, old_manifest, args.force)
    success, fail = run_downloads(tasks)

    # 6. 更新 manifest
    save_manifest({"brawlers": new_brawlers, "maps": new_maps, "gamemodes": new_modes})

    # 7. 汇总
    print("\n" + "=" * 60)
    print(f"  完成！成功: {success}  失败: {fail}")
    print(f"  英雄总数: {len(new_brawlers)}  地图总数: {len(new_maps)}  模式总数: {len(new_modes)}")
    print("=" * 60)

    if fail > 0:
        print(f"\n[WARN] {fail} 个资源下载失败，可重新运行脚本自动补全。")
        sys.exit(1)


if __name__ == "__main__":
    main()
