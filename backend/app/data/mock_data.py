from __future__ import annotations

from datetime import datetime

DEFAULT_RULES = [
    {
        "name": "UTME Score Threshold",
        "rule_type": "threshold",
        "field": "utme_score",
        "operator": ">=",
        "value": 180,
        "status": "Active",
        "message": "UTME score must be at least 180.",
    },
    {
        "name": "Science Subjects",
        "rule_type": "subject_requirement",
        "field": "subjects",
        "operator": "contains_all",
        "value": ["english", "mathematics"],
        "status": "Active",
        "message": "English and Mathematics are compulsory.",
    },
]

DEFAULT_TEMPLATES = [
    {"name": "NYSC Senate List", "fields": 21, "type": "Excel", "updatedAt": "2026-03-16"},
    {"name": "Admission Confirmation Export", "fields": 15, "type": "CSV", "updatedAt": "2026-03-15"},
    {"name": "Faculty Summary Pack", "fields": 9, "type": "Excel", "updatedAt": "2026-03-14"},
]

DEFAULT_EXPORT_HISTORY = [
    {
        "id": "EXP-MOCK-001",
        "module": "Admission Splitter",
        "format": "XLSX",
        "file": "faculty_breakdown.xlsx",
        "status": "Completed",
        "createdAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
]

SAMPLE_ADMISSION_ROWS = [
    {
        "matric_no": "ADS/24/001",
        "student_name": "Adeyemi Tobi",
        "faculty": "Science",
        "department": "Computer Science",
        "programme": "Computer Science",
        "level": "100",
        "utme_score": 248,
        "subjects": "English, Mathematics, Physics, Chemistry",
        "entry_mode": "UTME",
    },
    {
        "matric_no": "ADS/24/002",
        "student_name": "Amina Yusuf",
        "faculty": "Social Sciences",
        "department": "Economics",
        "programme": "Economics",
        "level": "100",
        "utme_score": 198,
        "subjects": "English, Economics, Government",
        "entry_mode": "Direct Entry",
    },
    {
        "matric_no": "ADS/24/003",
        "student_name": "Grace Bassey",
        "faculty": "Education",
        "department": "Education Biology",
        "programme": "Education Biology",
        "level": "200",
        "utme_score": 212,
        "subjects": "English, Mathematics, Biology, Chemistry",
        "entry_mode": "UTME",
    },
]
