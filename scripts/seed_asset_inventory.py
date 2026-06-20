"""Seed dummy assets into the 'ort' client's database.

Run from workspace root:
    python scripts/seed_asset_inventory.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime
import uuid

from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.database.platform import engine as platform_engine
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.asset_management.models import AssetCategory, AssetSubCategory
from backend.app.modules.asset_management.inventory_models import Asset, AssetActivity


def _uuid():
    return str(uuid.uuid4())


def _num(n):
    return f"AST-{n:06d}"


def seed():
    platform_db = Session(platform_engine)

    # ── Find ORT client ──────────────────────────────────────────────────────
    from backend.app.modules.client_management.models import Client, ClientDbConnection
    client = platform_db.query(Client).filter(
        Client.is_deleted.is_(False)
    ).order_by(Client.created_at).first()
    if not client:
        print("❌  No clients found. Create a client first via the superadmin UI.")
        return

    conn = platform_db.query(ClientDbConnection).filter(
        ClientDbConnection.client_id == client.id
    ).first()
    if not conn:
        print("❌  No DB connection for ORT client. Provision it first.")
        return

    print(f"✅  Client: {client.company_name}  (id={client.id})")

    # ── Resolve category / sub-category ids from platform DB ─────────────────
    cats    = {c.category_code: c for c in platform_db.query(AssetCategory).all()}
    subcats = {s.sub_category_code: s for s in platform_db.query(AssetSubCategory).all()}

    def cat(code):
        c = cats.get(code)
        return (c.id, c.category_name) if c else (None, code)

    def sc(code):
        s = subcats.get(code)
        return (s.id, s.sub_category_name) if s else (None, code)

    # ── Connect to client DB ──────────────────────────────────────────────────
    url = build_client_db_url(conn)
    provision_portal_schema(url, force=True)
    db  = make_client_session(url)

    existing = db.query(Asset).filter(Asset.client_id == client.id, Asset.is_deleted.is_(False)).count()
    if existing:
        print(f"ℹ️   {existing} asset(s) already exist — skipping seed (delete them first if you want a fresh seed).")
        db.close(); platform_db.close()
        return

    cid = client.id

    cat_it,   cn_it   = cat("IT")
    cat_furn, cn_furn = cat("FURN")
    cat_sw,   cn_sw   = cat("SW")
    cat_elec, cn_elec = cat("ELEC")
    cat_net,  cn_net  = cat("NET")
    cat_ofc,  cn_ofc  = cat("OFC")

    sc_lap, sn_lap = sc("IT-LAP")
    sc_mon, sn_mon = sc("IT-MON")
    sc_des, sn_des = sc("IT-DES")
    sc_prt, sn_prt = sc("IT-PRN")
    sc_chr, sn_chr = sc("FU-CHR")
    sc_tbl, sn_tbl = sc("FU-TBL")
    sc_mob, sn_mob = sc("EL-MOB")
    sc_m365, sn_m365 = sc("SW-M365")
    sc_av,  sn_av  = sc("SW-AV")

    NOW = datetime.utcnow

    assets = [
        # 1 — Laptop Assigned
        Asset(id=_uuid(), client_id=cid, asset_number=_num(1), asset_uuid=_uuid(),
              asset_name="Dell Latitude 5440",
              category_id=cat_it, category_name=cn_it,
              sub_category_id=sc_lap, sub_category_name=sn_lap,
              status="Assigned", brand="Dell", manufacturer="Dell Technologies",
              model_number="Latitude 5440", serial_number="SN-DELL-001",
              purchase_date=date(2023, 6, 15), purchase_cost=85000, currency="INR",
              vendor_name="Dell India Pvt Ltd", invoice_number="INV-DELL-2023-001",
              warranty_available=True, warranty_start_date=date(2023, 6, 15),
              warranty_end_date=date(2026, 6, 14), warranty_provider="Dell",
              assigned_employee_name="Ravi Sharma",
              assigned_date=date(2024, 1, 10), expected_return_date=date(2025, 1, 10),
              created_at=NOW(), updated_at=NOW()),

        # 2 — Laptop Available
        Asset(id=_uuid(), client_id=cid, asset_number=_num(2), asset_uuid=_uuid(),
              asset_name="MacBook Pro 14-inch M3",
              category_id=cat_it, category_name=cn_it,
              sub_category_id=sc_lap, sub_category_name=sn_lap,
              status="Available", brand="Apple", manufacturer="Apple Inc.",
              model_number="MBP14-M3-2023", serial_number="SN-APPLE-002",
              purchase_date=date(2023, 11, 20), purchase_cost=195000, currency="INR",
              vendor_name="iStore Mumbai", invoice_number="INV-APPLE-2023-002",
              warranty_available=True, warranty_start_date=date(2023, 11, 20),
              warranty_end_date=date(2024, 11, 19), warranty_provider="Apple",
              created_at=NOW(), updated_at=NOW()),

        # 3 — Monitor Available
        Asset(id=_uuid(), client_id=cid, asset_number=_num(3), asset_uuid=_uuid(),
              asset_name="LG 27UK850 4K Monitor",
              category_id=cat_it, category_name=cn_it,
              sub_category_id=sc_mon, sub_category_name=sn_mon,
              status="Available", brand="LG", manufacturer="LG Electronics",
              model_number="27UK850-W", serial_number="SN-LG-MON-003",
              purchase_date=date(2023, 3, 8), purchase_cost=42000, currency="INR",
              vendor_name="Reliance Digital", invoice_number="INV-RD-2023-045",
              warranty_available=True, warranty_start_date=date(2023, 3, 8),
              warranty_end_date=date(2026, 3, 7), warranty_provider="LG",
              created_at=NOW(), updated_at=NOW()),

        # 4 — Desktop Assigned
        Asset(id=_uuid(), client_id=cid, asset_number=_num(4), asset_uuid=_uuid(),
              asset_name="HP EliteDesk 800 G9",
              category_id=cat_it, category_name=cn_it,
              sub_category_id=sc_des, sub_category_name=sn_des,
              status="Assigned", brand="HP", manufacturer="HP Inc.",
              model_number="EliteDesk 800 G9", serial_number="SN-HP-DES-004",
              purchase_date=date(2022, 9, 1), purchase_cost=68000, currency="INR",
              vendor_name="HP Authorized Partner", invoice_number="INV-HP-2022-088",
              warranty_available=True, warranty_start_date=date(2022, 9, 1),
              warranty_end_date=date(2025, 8, 31), warranty_provider="HP",
              assigned_employee_name="Priya Nair",
              assigned_date=date(2022, 9, 5), expected_return_date=None,
              created_at=NOW(), updated_at=NOW()),

        # 5 — Printer Under Maintenance
        Asset(id=_uuid(), client_id=cid, asset_number=_num(5), asset_uuid=_uuid(),
              asset_name="Canon PIXMA G3010",
              category_id=cat_it, category_name=cn_it,
              sub_category_id=sc_prt, sub_category_name=sn_prt,
              status="Under Maintenance", brand="Canon", manufacturer="Canon India",
              model_number="PIXMA G3010", serial_number="SN-CANON-005",
              purchase_date=date(2021, 4, 12), purchase_cost=15000, currency="INR",
              vendor_name="Canon Authorised Dealer", invoice_number="INV-CAN-2021-032",
              warranty_available=False,
              maintenance_required=True, last_maintenance_date=date(2024, 10, 1),
              next_maintenance_date=date(2025, 4, 1), maintenance_frequency="Half Yearly",
              created_at=NOW(), updated_at=NOW()),

        # 6 — Office Chair Available
        Asset(id=_uuid(), client_id=cid, asset_number=_num(6), asset_uuid=_uuid(),
              asset_name="Featherlite Aria High-Back Chair",
              category_id=cat_furn, category_name=cn_furn,
              sub_category_id=sc_chr, sub_category_name=sn_chr,
              status="Available", brand="Featherlite", manufacturer="Featherlite",
              model_number="ARIA-HB-BLK", serial_number="SN-FTL-CHR-006",
              purchase_date=date(2023, 1, 25), purchase_cost=12500, currency="INR",
              vendor_name="Featherlite Showroom Bangalore",
              warranty_available=True, warranty_start_date=date(2023, 1, 25),
              warranty_end_date=date(2025, 1, 24), warranty_provider="Featherlite",
              created_at=NOW(), updated_at=NOW()),

        # 7 — Meeting Table Available
        Asset(id=_uuid(), client_id=cid, asset_number=_num(7), asset_uuid=_uuid(),
              asset_name="Godrej Interio Conference Table 10-Seater",
              category_id=cat_furn, category_name=cn_furn,
              sub_category_id=sc_tbl, sub_category_name=sn_tbl,
              status="Available", brand="Godrej", manufacturer="Godrej & Boyce",
              model_number="CONF-10S-OAK", serial_number="SN-GI-TBL-007",
              purchase_date=date(2022, 7, 15), purchase_cost=78000, currency="INR",
              vendor_name="Godrej Interio Store",
              warranty_available=True, warranty_start_date=date(2022, 7, 15),
              warranty_end_date=date(2024, 7, 14), warranty_provider="Godrej",
              created_at=NOW(), updated_at=NOW()),

        # 8 — Mobile Phone Assigned
        Asset(id=_uuid(), client_id=cid, asset_number=_num(8), asset_uuid=_uuid(),
              asset_name="Samsung Galaxy S24 Ultra",
              category_id=cat_elec, category_name=cn_elec,
              sub_category_id=sc_mob, sub_category_name=sn_mob,
              status="Assigned", brand="Samsung", manufacturer="Samsung Electronics",
              model_number="SM-S928B", serial_number="SN-SAM-MOB-008",
              purchase_date=date(2024, 2, 5), purchase_cost=130000, currency="INR",
              vendor_name="Samsung SmartPlaza",
              warranty_available=True, warranty_start_date=date(2024, 2, 5),
              warranty_end_date=date(2025, 2, 4), warranty_provider="Samsung",
              assigned_employee_name="Ankit Mehta",
              assigned_date=date(2024, 2, 10),
              created_at=NOW(), updated_at=NOW()),

        # 9 — Microsoft 365 License Available
        Asset(id=_uuid(), client_id=cid, asset_number=_num(9), asset_uuid=_uuid(),
              asset_name="Microsoft 365 Business Standard — 25 Seats",
              category_id=cat_sw, category_name=cn_sw,
              sub_category_id=sc_m365, sub_category_name=sn_m365,
              status="Available", brand="Microsoft", manufacturer="Microsoft Corporation",
              model_number="M365-BS-25", serial_number="LIC-MS365-009",
              purchase_date=date(2024, 4, 1), purchase_cost=55000, currency="INR",
              vendor_name="Microsoft Reseller India",
              warranty_available=False,
              insurance_available=False,
              amc_applicable=True, amc_start_date=date(2024, 4, 1),
              amc_end_date=date(2025, 3, 31), amc_vendor="Microsoft",
              amc_cost=55000,
              created_at=NOW(), updated_at=NOW()),

        # 10 — Damaged Laptop
        Asset(id=_uuid(), client_id=cid, asset_number=_num(10), asset_uuid=_uuid(),
              asset_name="Lenovo ThinkPad E14 Gen 4",
              category_id=cat_it, category_name=cn_it,
              sub_category_id=sc_lap, sub_category_name=sn_lap,
              status="Damaged", brand="Lenovo", manufacturer="Lenovo India",
              model_number="ThinkPad E14 G4", serial_number="SN-LEN-LAP-010",
              purchase_date=date(2022, 11, 8), purchase_cost=62000, currency="INR",
              vendor_name="Lenovo Exclusive Store",
              warranty_available=True, warranty_start_date=date(2022, 11, 8),
              warranty_end_date=date(2024, 11, 7), warranty_provider="Lenovo",
              created_at=NOW(), updated_at=NOW()),

        # 11 — Network Switch Available with Insurance
        Asset(id=_uuid(), client_id=cid, asset_number=_num(11), asset_uuid=_uuid(),
              asset_name="Cisco Catalyst 2960-X 24-Port Switch",
              category_id=cat_net, category_name=cn_net,
              status="Available", brand="Cisco", manufacturer="Cisco Systems",
              model_number="WS-C2960X-24TD-L", serial_number="SN-CIS-NET-011",
              purchase_date=date(2021, 8, 20), purchase_cost=95000, currency="INR",
              vendor_name="Cisco Authorised Partner",
              warranty_available=True, warranty_start_date=date(2021, 8, 20),
              warranty_end_date=date(2024, 8, 19), warranty_provider="Cisco",
              insurance_available=True, insurance_provider="New India Assurance",
              policy_number="POL-NIA-2021-NET-001", coverage_amount=100000,
              insurance_start_date=date(2021, 8, 20), insurance_end_date=date(2025, 8, 19),
              created_at=NOW(), updated_at=NOW()),

        # 12 — Retired Projector
        Asset(id=_uuid(), client_id=cid, asset_number=_num(12), asset_uuid=_uuid(),
              asset_name="Epson EB-X51 Projector",
              category_id=cat_ofc, category_name=cn_ofc,
              status="Retired", brand="Epson", manufacturer="Epson India",
              model_number="EB-X51", serial_number="SN-EPS-PRJ-012",
              purchase_date=date(2019, 2, 14), purchase_cost=45000, currency="INR",
              vendor_name="Epson Dealer",
              warranty_available=False,
              created_at=NOW(), updated_at=NOW()),
    ]

    db.bulk_save_objects(assets)

    # activity logs
    logs = [
        AssetActivity(id=_uuid(), client_id=cid, asset_id=a.id,
                      action="asset.created",
                      description=f"Asset {a.asset_number} '{a.asset_name}' created",
                      actor_name="System Seed", created_at=NOW())
        for a in assets
    ]
    db.bulk_save_objects(logs)
    db.commit()
    db.close()
    platform_db.close()

    print(f"✅  Seeded {len(assets)} assets into ORT client database.")


if __name__ == "__main__":
    seed()
