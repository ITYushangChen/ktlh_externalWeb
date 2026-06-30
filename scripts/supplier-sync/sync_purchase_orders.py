#!/usr/bin/env python3
"""
内网采购单 → Supabase 同步脚本

在本机（内网 ERP 所在机器）运行，读取 PostgreSQL：
  tb_purchase_order / tb_purchase_order_item / tb_purchase_supplier

写入 Supabase（service_role）：
  purchase_order_snapshots / purchase_order_item_snapshots

建议 crontab（每天凌晨 1 点）：
  0 1 * * * cd /path/to/KTLH_EXTERNALWEB/scripts/supplier-sync && .venv/bin/python sync_purchase_orders.py >> /var/log/ktlh-supplier-sync.log 2>&1

用法：
  python sync_purchase_orders.py              # 全量同步
  python sync_purchase_orders.py --dry-run    # 仅统计，不写入
  python sync_purchase_orders.py --order-id 123  # 同步单笔采购单
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from supabase import Client, create_client

BUYER_COMPANY = "青岛开拓隆海智控有限公司"
BUYER_ADDRESS = "青岛胶州上合经济开发区湘江路21号"

LOG = logging.getLogger("supplier-sync")


def load_config() -> dict[str, Any]:
    load_dotenv()
    dry_run = os.getenv("DRY_RUN", "false").lower() in ("1", "true", "yes")
    lookback_days = int(os.getenv("SYNC_LOOKBACK_DAYS", "365"))

    db_url = os.getenv("INTERNAL_DATABASE_URL", "").strip()
    if not db_url:
        host = os.getenv("INTERNAL_DB_HOST", "127.0.0.1")
        port = os.getenv("INTERNAL_DB_PORT", "5432")
        name = os.getenv("INTERNAL_DB_NAME", "")
        user = os.getenv("INTERNAL_DB_USER", "")
        password = os.getenv("INTERNAL_DB_PASSWORD", "")
        if not all([name, user]):
            raise SystemExit("请配置 INTERNAL_DATABASE_URL 或 INTERNAL_DB_* 环境变量")
        db_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"

    supabase_url = os.getenv("SUPABASE_URL", "").strip() or os.getenv(
        "NEXT_PUBLIC_SUPABASE_URL", ""
    ).strip()
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supabase_url or not service_key:
        raise SystemExit("请配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY")

    return {
        "db_url": db_url,
        "supabase_url": supabase_url,
        "service_key": service_key,
        "lookback_days": lookback_days,
        "dry_run": dry_run,
    }


def to_json(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value


def connect_internal(db_url: str):
    return psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)


def fetch_synced_order_ids(sb: Client) -> set[int]:
    ids: set[int] = set()
    page_size = 1000
    offset = 0
    while True:
        resp = (
            sb.table("purchase_order_snapshots")
            .select("internal_order_id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            break
        for row in rows:
            ids.add(int(row["internal_order_id"]))
        if len(rows) < page_size:
            break
        offset += page_size
    return ids


def diagnose_zero_orders(conn) -> None:
    """查询结果为 0 时打印原因统计。"""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM tb_purchase_order")
        total = int(cur.fetchone()["n"])
        if total == 0:
            LOG.warning("内网 tb_purchase_order 表为空，请先在内网 ERP 创建采购单")
            return

        cur.execute(
            "SELECT COUNT(*) AS n FROM tb_purchase_order WHERE supplier_id IS NOT NULL"
        )
        with_supplier = int(cur.fetchone()["n"])

        cur.execute(
            """
            SELECT COUNT(*) AS n FROM tb_purchase_order po
            WHERE po.supplier_id IS NOT NULL AND po.order_status != '已取消'
            """
        )
        eligible_status = int(cur.fetchone()["n"])

        cur.execute(
            """
            SELECT COUNT(*) AS n FROM tb_purchase_order po
            WHERE po.supplier_id IS NOT NULL
              AND po.order_status != '已取消'
              AND EXISTS (
                SELECT 1 FROM tb_purchase_order_item i
                WHERE i.order_id = po.id
                  AND COALESCE(i.received_quantity, 0) < i.order_quantity
              )
            """
        )
        with_pending = int(cur.fetchone()["n"])

        LOG.warning(
            "内网共有 %d 笔采购单，其中：有供应商 %d 笔，未取消且有供应商 %d 笔，仍有未送完明细 %d 笔",
            total,
            with_supplier,
            eligible_status,
            with_pending,
        )
        if with_supplier == 0:
            LOG.warning(
                "所有采购单 supplier_id 均为空 — 请在内网 ERP 编辑采购单并选择供应商后再同步"
            )
        elif with_pending == 0:
            LOG.warning("采购单均已送完或已收货，无待同步明细")

        cur.execute(
            """
            SELECT po.id, po.order_number, po.supplier_id, po.order_status
            FROM tb_purchase_order po
            ORDER BY po.id DESC
            LIMIT 5
            """
        )
        for row in cur.fetchall():
            LOG.warning(
                "  样本 id=%s %s supplier_id=%s status=%s",
                row["id"],
                row["order_number"],
                row["supplier_id"],
                row["order_status"],
            )


def fetch_orders(conn, lookback_days: int, synced_ids: set[int], order_id: int | None):
    """拉取需要同步的采购单 ID。

    包含：
    1. 未取消、有供应商、仍有未送完明细的进行中订单
    2. 已在 Supabase 中的订单（更新状态 / 已收数量）
    3. lookback 天内的新订单
    """
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    if order_id is not None:
        sql = """
            SELECT po.id
            FROM tb_purchase_order po
            WHERE po.id = %(order_id)s
              AND po.supplier_id IS NOT NULL
              AND po.order_status != '已取消'
        """
        params = {"order_id": order_id}
    else:
        sql = """
            SELECT DISTINCT po.id
            FROM tb_purchase_order po
            WHERE po.supplier_id IS NOT NULL
              AND po.order_status != '已取消'
              AND (
                po.order_time >= %(since)s
                OR po.id = ANY(%(synced_ids)s)
                OR (
                  po.order_status NOT IN ('已完成')
                  AND EXISTS (
                    SELECT 1
                    FROM tb_purchase_order_item i
                    WHERE i.order_id = po.id
                      AND COALESCE(i.received_quantity, 0) < i.order_quantity
                  )
                )
              )
            ORDER BY po.id
        """
        params = {"since": since, "synced_ids": list(synced_ids) or [0]}

    with conn.cursor() as cur:
        cur.execute(sql, params)
        return [int(r["id"]) for r in cur.fetchall()]


def fetch_order_bundle(conn, order_ids: list[int]) -> list[dict]:
    if not order_ids:
        return []

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              po.id,
              po.order_number,
              po.supplier_id,
              po.order_time,
              po.expected_arrival_time,
              po.order_amount,
              po.payment_status,
              po.order_status,
              po.responsible_person,
              po.remark,
              ps.supplier_name,
              ps.contact_person,
              ps.contact_phone,
              ps.email AS supplier_email,
              ps.address AS supplier_address
            FROM tb_purchase_order po
            LEFT JOIN tb_purchase_supplier ps ON ps.id = po.supplier_id
            WHERE po.id = ANY(%(ids)s)
            ORDER BY po.id
            """,
            {"ids": order_ids},
        )
        orders = [dict(r) for r in cur.fetchall()]

        cur.execute(
            """
            SELECT
              i.id,
              i.order_id,
              i.material_code,
              i.material_name,
              i.material_spec,
              i.unit,
              i.unit_price,
              i.order_quantity,
              COALESCE(i.received_quantity, 0) AS received_quantity,
              i.item_amount,
              i.remark
            FROM tb_purchase_order_item i
            WHERE i.order_id = ANY(%(ids)s)
            ORDER BY i.order_id, i.id
            """,
            {"ids": order_ids},
        )
        items_by_order: dict[int, list[dict]] = {}
        for row in cur.fetchall():
            item = dict(row)
            items_by_order.setdefault(int(item["order_id"]), []).append(item)

    bundles = []
    for order in orders:
        oid = int(order["id"])
        items = items_by_order.get(oid, [])
        bundles.append({"order": order, "items": items})
    return bundles


def should_sync_bundle(bundle: dict) -> bool:
    """供应商可见：至少一行 received_quantity < order_quantity，或订单已在进行中。"""
    order = bundle["order"]
    status = order.get("order_status") or ""
    if status in ("已取消",):
        return False
    items = bundle["items"]
    if not items:
        return False
    if status in ("已完成",):
        return True
    return any(
        float(i.get("received_quantity") or 0) < float(i.get("order_quantity") or 0)
        for i in items
    )


def build_order_row(order: dict, now_iso: str) -> dict:
    return {
        "internal_order_id": int(order["id"]),
        "internal_supplier_id": int(order["supplier_id"]),
        "order_number": order["order_number"],
        "order_time": to_json(order["order_time"]),
        "expected_arrival_time": to_json(order.get("expected_arrival_time")),
        "order_amount": to_json(order.get("order_amount") or 0),
        "order_status": order["order_status"],
        "payment_status": order.get("payment_status"),
        "responsible_person": order.get("responsible_person"),
        "remark": order.get("remark"),
        "buyer_company": BUYER_COMPANY,
        "buyer_address": BUYER_ADDRESS,
        "synced_at": now_iso,
    }


def build_item_rows(snapshot_order_id: str, items: list[dict], now_iso: str) -> list[dict]:
    rows = []
    for item in items:
        rows.append(
            {
                "snapshot_order_id": snapshot_order_id,
                "internal_order_item_id": int(item["id"]),
                "material_code": item.get("material_code"),
                "material_name": item["material_name"],
                "material_spec": item.get("material_spec"),
                "unit": item["unit"],
                "unit_price": to_json(item.get("unit_price") or 0),
                "order_quantity": to_json(item.get("order_quantity") or 0),
                "received_quantity": to_json(item.get("received_quantity") or 0),
                "item_amount": to_json(item.get("item_amount") or 0),
                "remark": item.get("remark"),
                "synced_at": now_iso,
            }
        )
    return rows


def upsert_supplier_profile(sb: Client, order: dict, dry_run: bool) -> None:
    """若 Supabase 已有该供应商档案，刷新联系信息（可选）。"""
    supplier_id = order.get("supplier_id")
    supplier_name = order.get("supplier_name")
    if not supplier_id or not supplier_name:
        return

    payload = {
        "internal_supplier_id": int(supplier_id),
        "supplier_name": supplier_name,
        "contact_name": order.get("contact_person"),
        "phone": order.get("contact_phone"),
        "email": order.get("supplier_email"),
        "address": order.get("supplier_address"),
    }

    if dry_run:
        LOG.info("  [dry-run] 将更新 supplier_profiles internal_supplier_id=%s", supplier_id)
        return

    existing = (
        sb.table("supplier_profiles")
        .select("id")
        .eq("internal_supplier_id", int(supplier_id))
        .execute()
    )
    if not existing.data:
        return

    sb.table("supplier_profiles").update(
        {
            "supplier_name": payload["supplier_name"],
            "contact_name": payload["contact_name"],
            "phone": payload["phone"],
            "email": payload["email"],
            "address": payload["address"],
        }
    ).eq("internal_supplier_id", int(supplier_id)).execute()


def sync_bundle(sb: Client, bundle: dict, dry_run: bool, now_iso: str) -> str:
    order = bundle["order"]
    items = bundle["items"]
    order_no = order["order_number"]
    internal_id = int(order["id"])

    if not should_sync_bundle(bundle):
        return "skipped"

    order_row = build_order_row(order, now_iso)
    item_rows = build_item_rows("__PLACEHOLDER__", items, now_iso)
    current_item_ids = {int(i["id"]) for i in items}

    if dry_run:
        LOG.info(
            "  [dry-run] upsert 采购单 %s (id=%s) 明细 %d 行",
            order_no,
            internal_id,
            len(item_rows),
        )
        return "dry-run"

    upsert_supplier_profile(sb, order, dry_run=False)

    resp = (
        sb.table("purchase_order_snapshots")
        .upsert(order_row, on_conflict="internal_order_id")
        .select("id")
        .execute()
    )
    if not resp.data:
        raise RuntimeError(f"采购单 upsert 无返回: {order_no}")

    snapshot_id = resp.data[0]["id"]
    for row in item_rows:
        row["snapshot_order_id"] = snapshot_id

    sb.table("purchase_order_item_snapshots").upsert(
        item_rows, on_conflict="internal_order_item_id"
    ).execute()

    # 删除内网已移除的明细行（保留送货单关联的历史行由 FK 约束保护）
    existing = (
        sb.table("purchase_order_item_snapshots")
        .select("id, internal_order_item_id")
        .eq("snapshot_order_id", snapshot_id)
        .execute()
    )
    stale_ids = [
        row["id"]
        for row in (existing.data or [])
        if int(row["internal_order_item_id"]) not in current_item_ids
    ]
    if stale_ids:
        sb.table("purchase_order_item_snapshots").delete().in_("id", stale_ids).execute()
        LOG.info("  删除过时明细 %d 行: %s", len(stale_ids), order_no)

    return "synced"


def run(args: argparse.Namespace) -> int:
    cfg = load_config()
    dry_run = args.dry_run or cfg["dry_run"]

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    LOG.info("开始同步%s", "（dry-run）" if dry_run else "")
    now_iso = datetime.now(timezone.utc).isoformat()

    sb = create_client(cfg["supabase_url"], cfg["service_key"])

    with connect_internal(cfg["db_url"]) as conn:
        synced_ids = fetch_synced_order_ids(sb) if not args.order_id else set()
        LOG.info("Supabase 已有采购单快照 %d 笔", len(synced_ids))

        order_ids = fetch_orders(
            conn, cfg["lookback_days"], synced_ids, args.order_id
        )
        LOG.info("内网待处理采购单 %d 笔", len(order_ids))

        if not order_ids:
            diagnose_zero_orders(conn)
            LOG.info("无数据需要同步")
            return 0

        stats = {"synced": 0, "skipped": 0, "dry-run": 0, "errors": 0}

        batch_size = 50
        for i in range(0, len(order_ids), batch_size):
            batch = order_ids[i : i + batch_size]
            bundles = fetch_order_bundle(conn, batch)
            for bundle in bundles:
                order_no = bundle["order"]["order_number"]
                try:
                    result = sync_bundle(sb, bundle, dry_run, now_iso)
                    stats[result] = stats.get(result, 0) + 1
                    if result == "synced":
                        LOG.info("已同步 %s", order_no)
                except Exception as exc:
                    stats["errors"] += 1
                    LOG.exception("同步失败 %s: %s", order_no, exc)

    LOG.info(
        "完成 synced=%d skipped=%d dry-run=%d errors=%d",
        stats.get("synced", 0),
        stats.get("skipped", 0),
        stats.get("dry-run", 0),
        stats.get("errors", 0),
    )
    return 1 if stats.get("errors") else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="内网采购单同步到 Supabase")
    parser.add_argument("--dry-run", action="store_true", help="只统计，不写入 Supabase")
    parser.add_argument("--order-id", type=int, help="仅同步指定内网采购单 ID")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()
    sys.exit(run(args))


if __name__ == "__main__":
    main()
