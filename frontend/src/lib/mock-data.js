export const dashboardSummary = {
  totals: [
    { label: "Files Processed", value: 1284, change: "+18.2%", tone: "primary" },
    { label: "Recent Exports", value: 96, change: "+12 today", tone: "accent" },
    { label: "Active Templates", value: 14, change: "3 updated", tone: "secondary" },
    { label: "Validation Warnings", value: 23, change: "-9 resolved", tone: "warning" },
  ],
  chart: [
    { name: "Mon", processed: 76, exports: 34 },
    { name: "Tue", processed: 98, exports: 41 },
    { name: "Wed", processed: 120, exports: 53 },
    { name: "Thu", processed: 132, exports: 61 },
    { name: "Fri", processed: 154, exports: 75 },
    { name: "Sat", processed: 84, exports: 30 },
  ],
  exports: [
    { module: "Dataset Splitter", file: "faculty_batches.xlsx", status: "Completed", time: "09:12" },
    { module: "Record Sorter", file: "record_batch_04.zip", status: "Completed", time: "08:25" },
    { module: "Sort Machine", file: "clean_matric_data.csv", status: "Warning", time: "Yesterday" },
  ],
  warnings: [
    "Three uploads have unrecognized subject columns.",
    "Two mapping profiles are missing department codes.",
    "One rule preset was edited but not published.",
  ],
};

export const splitterGroups = [
  { group: "Faculty of Science", count: 324, percentage: "28.4%" },
  { group: "Faculty of Arts", count: 218, percentage: "19.1%" },
  { group: "Faculty of Education", count: 287, percentage: "25.1%" },
  { group: "Faculty of Social Sciences", count: 311, percentage: "27.4%" },
];

export const tablePreview = [
  { matric: "ADS/24/001", name: "Adeyemi Tobi", programme: "Computer Science", level: "100", status: "Qualified" },
  { matric: "ADS/24/002", name: "Amina Yusuf", programme: "Economics", level: "100", status: "Warning" },
  { matric: "ADS/24/003", name: "Chukwuemeka Obi", programme: "Biochemistry", level: "100", status: "Qualified" },
  { matric: "ADS/24/004", name: "Fatima Lawal", programme: "History", level: "100", status: "Not Qualified" },
  { matric: "ADS/24/005", name: "Grace Bassey", programme: "Education Biology", level: "200", status: "Qualified" },
];

export const mappingRows = [
  { target: "Matric Number", source: "matric_no", status: "Mapped" },
  { target: "Surname", source: "last_name", status: "Mapped" },
  { target: "First Name", source: "first_name", status: "Mapped" },
  { target: "Programme Code", source: "programme", status: "Needs Review" },
  { target: "Faculty", source: "faculty_name", status: "Mapped" },
];

export const rules = [
  { title: "UTME Score Threshold", detail: "Minimum 180 for general programmes, 220 for competitive programmes.", status: "Active" },
  { title: "Subject Combination", detail: "English and Mathematics required for all science-based admissions.", status: "Active" },
  { title: "Entry Mode Rule", detail: "Direct Entry applicants must have an upper credit equivalent.", status: "Draft" },
];

export const workflows = [
  { name: "Trim + Normalize", steps: 4, lastUsed: "2 hours ago", status: "Reusable" },
  { name: "Faculty Export Workflow", steps: 7, lastUsed: "Today", status: "Published" },
  { name: "NYSC Audit Clean-up", steps: 5, lastUsed: "Yesterday", status: "Draft" },
];

export const exportHistory = [
  { id: "EXP-2401", module: "Admission Splitter", format: "XLSX", file: "faculty_breakdown.xlsx", status: "Completed", createdAt: "2026-03-17 09:12" },
  { id: "EXP-2402", module: "Admission Confirmation", format: "CSV", file: "qualification_report.csv", status: "Completed", createdAt: "2026-03-17 08:46" },
  { id: "EXP-2403", module: "NYSC Sorter", format: "ZIP", file: "nysc_export_bundle.zip", status: "Queued", createdAt: "2026-03-16 16:09" },
];

export const templates = [
  { name: "NYSC Senate List", fields: 21, type: "Excel", updatedAt: "2026-03-16" },
  { name: "Admission Confirmation Export", fields: 15, type: "CSV", updatedAt: "2026-03-15" },
  { name: "Faculty Summary Pack", fields: 9, type: "Excel", updatedAt: "2026-03-14" },
];
