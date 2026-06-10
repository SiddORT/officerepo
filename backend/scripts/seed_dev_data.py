#!/usr/bin/env python3
"""
Dev Data Seeder — Office Repo
Run:  python -m backend.scripts.seed_dev_data

What it does
  1. Flushes all org / employee data for the ORT client (client DB)
  2. Seeds five ORT-group companies
  3. Seeds Acme Technologies Pvt Ltd with 5 departments,
     13 designations, and 50 employees (realistic Indian names)
"""

import os, sys, uuid
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

ORT_CLIENT_ID = "d3b5260a-0de8-4239-8d14-9be2711b561c"


def _uuid() -> str:
    return str(uuid.uuid4())


def _get_client_db_url() -> str:
    """Look up ORT client's DB URL from the platform DB."""
    from sqlalchemy import create_engine, text
    engine = create_engine(os.environ["DATABASE_URL"])
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT * FROM client_db_connections WHERE client_id = :cid"),
            {"cid": ORT_CLIENT_ID},
        ).fetchone()
    if not row:
        raise RuntimeError(f"No client_db_connection row found for client {ORT_CLIENT_ID}")

    # Reuse platform DB credentials (same Postgres server, different DB name)
    from urllib.parse import urlparse
    base = urlparse(os.environ["DATABASE_URL"])
    host     = row.database_host or base.hostname or "localhost"
    port     = row.database_port or base.port or 5432
    user     = row.database_username or base.username or "postgres"
    password = base.password or ""
    dbname   = row.database_name

    if password:
        return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
    return f"postgresql://{user}@{host}:{port}/{dbname}"


def run() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set"); sys.exit(1)

    client_url = _get_client_db_url()
    print(f"Client DB: {client_url.split('@')[-1]}")   # log host/db only (no creds)

    # Ensure all client tables are created
    from backend.app.database.client_db import provision_portal_schema, make_client_session
    provision_portal_schema(client_url, force=True)

    db = make_client_session(client_url)

    from backend.app.modules.organization_management.models import (
        OrgBranch, OrgCompany, OrgDepartment, OrgDesignation,
    )
    from backend.app.modules.employee_management.models import Employee

    try:
        # ── 1. FLUSH ─────────────────────────────────────────────────────────────
        print("Flushing existing ORT org/employee data …")
        db.query(Employee).filter(Employee.client_id == ORT_CLIENT_ID).delete(synchronize_session=False)
        db.query(OrgDesignation).filter(OrgDesignation.client_id == ORT_CLIENT_ID).delete(synchronize_session=False)
        db.query(OrgDepartment).filter(OrgDepartment.client_id == ORT_CLIENT_ID).delete(synchronize_session=False)
        db.query(OrgBranch).filter(OrgBranch.client_id == ORT_CLIENT_ID).delete(synchronize_session=False)
        db.query(OrgCompany).filter(OrgCompany.client_id == ORT_CLIENT_ID).delete(synchronize_session=False)
        db.commit()
        print("✓ Flush complete")

        # ── 2. ORT GROUP COMPANIES ────────────────────────────────────────────────
        ort_companies = [
            dict(code="ORT",  name="OneRoof Technologies Pvt Ltd",
                 legal="OneRoof Technologies Private Limited",
                 city="Mumbai",    state="Maharashtra", country="India",
                 email="info@onerooftech.in",   phone="+91-22-40001000"),
            dict(code="HYW",  name="Hyworth Solar Pvt Ltd",
                 legal="Hyworth Solar Private Limited",
                 city="Pune",      state="Maharashtra", country="India",
                 email="info@hyworthsolar.in",  phone="+91-20-40002000"),
            dict(code="HYC",  name="Hycharge EV Solutions Pvt Ltd",
                 legal="Hycharge EV Solutions Private Limited",
                 city="Bangalore", state="Karnataka",   country="India",
                 email="info@hycharge.in",       phone="+91-80-40003000"),
            dict(code="PRS",  name="Purple Soil Cabling Pvt Ltd",
                 legal="Purple Soil Cabling Private Limited",
                 city="Hyderabad", state="Telangana",   country="India",
                 email="info@purplesoil.in",     phone="+91-40-40004000"),
            dict(code="IFC",  name="Infracon Telecom Pvt Ltd",
                 legal="Infracon Telecom Private Limited",
                 city="Chennai",   state="Tamil Nadu",  country="India",
                 email="info@infracon.in",        phone="+91-44-40005000"),
        ]
        for c in ort_companies:
            db.add(OrgCompany(
                id=_uuid(), client_id=ORT_CLIENT_ID,
                company_code=c["code"],  company_name=c["name"],
                legal_name=c["legal"],   city=c["city"],
                state=c["state"],        country=c["country"],
                email=c["email"],        phone=c["phone"],
                is_active=True,
            ))
        db.commit()
        print(f"✓ {len(ort_companies)} ORT group companies seeded")

        # ── 3. ACME TECHNOLOGIES — company ───────────────────────────────────────
        acme_id = _uuid()
        db.add(OrgCompany(
            id=acme_id, client_id=ORT_CLIENT_ID,
            company_code="ACME",
            company_name="Acme Technologies Pvt Ltd",
            legal_name="Acme Technologies Private Limited",
            city="Bangalore", state="Karnataka", country="India",
            email="hr@acmetech.in", phone="+91-80-40006000",
            is_active=True,
        ))
        db.commit()
        print("✓ Acme Technologies Pvt Ltd created")

        # ── 4. ACME — branches ───────────────────────────────────────────────────
        branch_defs = [
            ("ACME-MUM", "Mumbai Head Office",     "Head Office",    "Mumbai",    "Maharashtra", "+91-22-40006001", "mumbai@acmetech.in"),
            ("ACME-PUN", "Pune Office",            "Branch Office",  "Pune",      "Maharashtra", "+91-20-40006002", "pune@acmetech.in"),
            ("ACME-BLR", "Bangalore Office",       "Regional Office","Bangalore", "Karnataka",   "+91-80-40006003", "blr@acmetech.in"),
            ("ACME-DEL", "Delhi Office",           "Branch Office",  "New Delhi", "Delhi",       "+91-11-40006004", "delhi@acmetech.in"),
        ]
        branch_ids: list[str] = []
        for code, name, btype, city, state, phone, email in branch_defs:
            bid = _uuid()
            branch_ids.append(bid)
            db.add(OrgBranch(
                id=bid, client_id=ORT_CLIENT_ID, company_id=acme_id,
                branch_code=code, branch_name=name, branch_type=btype,
                city=city, state=state, country="India",
                phone=phone, email=email, is_active=True,
            ))
        db.commit()
        print(f"✓ {len(branch_defs)} branches created for Acme Technologies")

        # ── 5. ACME — departments ─────────────────────────────────────────────────
        dept_defs = [
            ("HR",  "Human Resources",        "Talent acquisition, payroll and employee lifecycle"),
            ("FIN", "Finance",                "Financial planning, accounting and compliance"),
            ("IT",  "Information Technology", "Software development and IT operations"),
            ("OPS", "Operations",             "Business operations and supply-chain logistics"),
            ("SLS", "Sales",                  "Revenue generation and client acquisition"),
        ]
        dept_ids: dict[str, str] = {}
        for code, name, desc in dept_defs:
            did = _uuid()
            dept_ids[code] = did
            db.add(OrgDepartment(
                id=did, client_id=ORT_CLIENT_ID, company_id=acme_id,
                department_code=code, department_name=name,
                description=desc, is_active=True,
            ))
        db.commit()
        print(f"✓ {len(dept_defs)} departments created")

        # ── 5. ACME — designations (13) ───────────────────────────────────────────
        desig_defs = [
            (None,  "CEO",  "Chief Executive Officer",   1),
            ("HR",  "HRH",  "HR Head",                  3),
            ("HR",  "HRE",  "HR Executive",             6),
            ("FIN", "FM",   "Finance Manager",          4),
            ("FIN", "ACCT", "Accountant",               6),
            ("IT",  "ITM",  "IT Manager",               4),
            ("IT",  "SRSE", "Senior Software Engineer", 5),
            ("IT",  "SE",   "Software Engineer",        6),
            ("IT",  "SA",   "System Administrator",     5),
            ("OPS", "OPSM", "Operations Manager",       4),
            ("OPS", "LE",   "Logistics Executive",      6),
            ("SLS", "SM",   "Sales Manager",            4),
            ("SLS", "SLE",  "Sales Executive",          6),
        ]
        desig_ids: dict[str, str] = {}
        for dept_code, code, name, level in desig_defs:
            did = _uuid()
            desig_ids[code] = did
            db.add(OrgDesignation(
                id=did, client_id=ORT_CLIENT_ID, company_id=acme_id,
                department_id=dept_ids.get(dept_code) if dept_code else None,
                designation_code=code, designation_name=name,
                level=level, is_active=True,
            ))
        db.commit()
        print(f"✓ {len(desig_defs)} designations created")

        # ── 6. ACME — 50 employees ────────────────────────────────────────────────
        # (first, last, gender, desig_code, dept_code, join_date, mgr_code_ref)
        # Counts: CEO×1, HRH×1, HRE×4, FM×1, ACCT×5, ITM×1, SRSE×3,
        #         SE×10, SA×2, OPSM×1, LE×7, SM×1, SLE×13  → 50 total
        emp_defs = [
            # ── C-Suite
            ("Aditya",    "Sharma",     "Male",   "CEO",  None,  date(2015, 4,  1),  None),
            # ── HR
            ("Pradeep",   "Nair",       "Male",   "HRH",  "HR",  date(2016, 6,  1),  "ACME-001"),
            ("Priya",     "Sharma",     "Female", "HRE",  "HR",  date(2018, 3, 15),  "ACME-002"),
            ("Sneha",     "Reddy",      "Female", "HRE",  "HR",  date(2019, 7, 10),  "ACME-002"),
            ("Kavya",     "Nair",       "Female", "HRE",  "HR",  date(2020, 1,  6),  "ACME-002"),
            ("Ananya",    "Singh",      "Female", "HRE",  "HR",  date(2021, 5, 20),  "ACME-002"),
            # ── Finance
            ("Manish",    "Joshi",      "Male",   "FM",   "FIN", date(2016, 8,  1),  "ACME-001"),
            ("Divya",     "Kulkarni",   "Female", "ACCT", "FIN", date(2017, 9,  1),  "ACME-007"),
            ("Ritu",      "Verma",      "Female", "ACCT", "FIN", date(2018, 2,  1),  "ACME-007"),
            ("Sunita",    "Joshi",      "Female", "ACCT", "FIN", date(2019, 4, 15),  "ACME-007"),
            ("Meera",     "Pandey",     "Female", "ACCT", "FIN", date(2020, 6,  1),  "ACME-007"),
            ("Shalini",   "Gupta",      "Female", "ACCT", "FIN", date(2021, 8, 10),  "ACME-007"),
            # ── IT
            ("Vikram",    "Singh",      "Male",   "ITM",  "IT",  date(2015, 7,  1),  "ACME-001"),
            ("Rohan",     "Gupta",      "Male",   "SRSE", "IT",  date(2017, 3,  1),  "ACME-013"),
            ("Nikhil",    "Verma",      "Male",   "SRSE", "IT",  date(2018, 1, 15),  "ACME-013"),
            ("Kartik",    "Pandey",     "Male",   "SRSE", "IT",  date(2018, 6,  1),  "ACME-013"),
            ("Deepak",    "Tiwari",     "Male",   "SE",   "IT",  date(2019, 2,  1),  "ACME-014"),
            ("Harsh",     "Malhotra",   "Male",   "SE",   "IT",  date(2019, 5, 10),  "ACME-014"),
            ("Akash",     "Dubey",      "Male",   "SE",   "IT",  date(2019, 8, 15),  "ACME-015"),
            ("Varun",     "Kapoor",     "Male",   "SE",   "IT",  date(2020, 1,  6),  "ACME-015"),
            ("Gaurav",    "Srivastava", "Male",   "SE",   "IT",  date(2020, 3, 20),  "ACME-016"),
            ("Rahul",     "Mishra",     "Male",   "SE",   "IT",  date(2020, 7,  1),  "ACME-016"),
            ("Abhijit",   "Das",        "Male",   "SE",   "IT",  date(2021, 1, 10),  "ACME-014"),
            ("Neha",      "Agarwal",    "Female", "SE",   "IT",  date(2021, 4,  5),  "ACME-015"),
            ("Vivek",     "Pillai",     "Male",   "SE",   "IT",  date(2021, 6, 15),  "ACME-016"),
            ("Anjali",    "Mishra",     "Female", "SE",   "IT",  date(2022, 2,  1),  "ACME-016"),
            ("Mohit",     "Agarwal",    "Male",   "SA",   "IT",  date(2018, 9,  1),  "ACME-013"),
            ("Pramod",    "Kumar",      "Male",   "SA",   "IT",  date(2019, 11, 1),  "ACME-013"),
            # ── Operations
            ("Rajesh",    "Kumar",      "Male",   "OPSM", "OPS", date(2016, 4,  1),  "ACME-001"),
            ("Vinod",     "Sharma",     "Male",   "LE",   "OPS", date(2018, 3,  1),  "ACME-029"),
            ("Sunil",     "Yadav",      "Male",   "LE",   "OPS", date(2018, 7, 15),  "ACME-029"),
            ("Ramesh",    "Patel",      "Male",   "LE",   "OPS", date(2019, 1, 10),  "ACME-029"),
            ("Amit",      "Shah",       "Male",   "LE",   "OPS", date(2019, 9,  1),  "ACME-029"),
            ("Lalitha",   "Iyer",       "Female", "LE",   "OPS", date(2020, 3,  5),  "ACME-029"),
            ("Nirmala",   "Rao",        "Female", "LE",   "OPS", date(2020, 8, 20),  "ACME-029"),
            ("Ganesh",    "Prabhu",     "Male",   "LE",   "OPS", date(2021, 2,  1),  "ACME-029"),
            # ── Sales
            ("Sanjay",    "Mehta",      "Male",   "SM",   "SLS", date(2015, 10, 1),  "ACME-001"),
            ("Dinesh",    "Verma",      "Male",   "SLE",  "SLS", date(2017, 6,  1),  "ACME-037"),
            ("Ashok",     "Singh",      "Male",   "SLE",  "SLS", date(2017, 11, 1),  "ACME-037"),
            ("Pavan",     "Kumar",      "Male",   "SLE",  "SLS", date(2018, 4,  1),  "ACME-037"),
            ("Nagesh",    "Reddy",      "Male",   "SLE",  "SLS", date(2018, 8, 20),  "ACME-037"),
            ("Ravi",      "Chandra",    "Male",   "SLE",  "SLS", date(2019, 1,  7),  "ACME-037"),
            ("Suresh",    "Babu",       "Male",   "SLE",  "SLS", date(2019, 5, 15),  "ACME-037"),
            ("Pooja",     "Patel",      "Female", "SLE",  "SLS", date(2019, 9,  1),  "ACME-037"),
            ("Shreya",    "Bose",       "Female", "SLE",  "SLS", date(2020, 2, 10),  "ACME-037"),
            ("Swati",     "Tiwari",     "Female", "SLE",  "SLS", date(2020, 6,  1),  "ACME-037"),
            ("Pallavi",   "Shah",       "Female", "SLE",  "SLS", date(2020, 10, 5),  "ACME-037"),
            ("Rekha",     "Menon",      "Female", "SLE",  "SLS", date(2021, 3, 15),  "ACME-037"),
            ("Kiran",     "Bhat",       "Male",   "SLE",  "SLS", date(2021, 7,  1),  "ACME-037"),
            ("Uma",       "Krishnan",   "Female", "SLE",  "SLS", date(2022, 1, 10),  "ACME-037"),
        ]

        assert len(emp_defs) == 50, f"Expected 50 employees, got {len(emp_defs)}"

        # Branch + work-mode assignment patterns (cycle through branches, vary work modes)
        WORK_MODES = ["Onsite", "Work From Home", "Hybrid", "Remote"]
        # Deterministic assignment: (idx-1) % 4 → branch, (idx-1) % 4 → work_mode (offset by 1)
        def _branch_for(idx: int) -> str:
            return branch_ids[(idx - 1) % len(branch_ids)]
        def _work_mode_for(idx: int) -> str:
            return WORK_MODES[(idx) % len(WORK_MODES)]

        # Pass 1 — allocate all IDs so manager refs can be resolved
        code_to_id: dict[str, str] = {}
        emp_payloads = []
        for idx, (first, last, gender, desig_code, dept_code, join_dt, _) in enumerate(emp_defs, start=1):
            eid  = _uuid()
            code = f"ACME-{idx:03d}"
            code_to_id[code] = eid
            emp_payloads.append(dict(
                id=eid, client_id=ORT_CLIENT_ID, company_id=acme_id,
                branch_id=_branch_for(idx),
                department_id=dept_ids.get(dept_code) if dept_code else None,
                designation_id=desig_ids.get(desig_code),
                employee_code=code,
                first_name=first, last_name=last, gender=gender,
                official_email=f"{first.lower()}.{last.lower().replace(' ','')}@acmetech.in",
                mobile_country_code="+91",
                mobile_number=f"98{idx:08d}"[:10],
                joining_date=join_dt,
                employment_type="Full-time",
                employee_category="Permanent",
                employment_status="Active",
                work_mode=_work_mode_for(idx),
                nationality="Indian",
                current_city="Bangalore",
                current_state="Karnataka",
                current_country="India",
                is_active=True,
            ))

        # Pass 2 — wire manager IDs and insert
        for i, payload in enumerate(emp_payloads):
            mgr_ref = emp_defs[i][6]
            if mgr_ref:
                payload["reporting_manager_id"] = code_to_id.get(mgr_ref)
            db.add(Employee(**payload))

        db.commit()
        print(f"✓ {len(emp_payloads)} employees created for Acme Technologies")

        print("\n── Seed complete ──────────────────────────────────────────────────────────")
        print(f"  ORT group:  {len(ort_companies)} companies  (ORT · HYW · HYC · PRS · IFC)")
        print(f"  Acme Tech:  {len(emp_payloads)} employees  "
              f"across {len(dept_defs)} depts  ·  {len(desig_defs)} designations  ·  {len(branch_defs)} branches")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
