import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Layers3,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const offerCards = [
  {
    title: "Academic File Cleanup",
    price: "$25-$80",
    turnaround: "Same day to 24 hours",
    pitch: "Useful for registries, coordinators, consultants, and schools sending messy CSV or Excel files for cleanup.",
    stack: "Use Sort Machine for upload, messy-header detection, cleanup, filtering, and final academic export.",
  },
  {
    title: "Faculty and Department Split Pack",
    price: "$40-$120",
    turnaround: "24 to 48 hours",
    pitch: "Deliver grouped outputs for faculties, departments, programmes, campuses, or reporting units.",
    stack: "Use split rules and ZIP delivery to hand off academic-ready bundles without manual spreadsheet work.",
  },
  {
    title: "Academic Operations Rescue",
    price: "$75-$180",
    turnaround: "1 to 3 days",
    pitch: "Handle backlog files for schools, training centres, registries, admission teams, and education consultants.",
    stack: "Use Sort Machine as the working core, then reuse templates and export history for repeat academic work.",
  },
];

const jobAngles = [
  "Clean and standardize messy Excel or CSV data",
  "Split one workbook into multiple department or branch files",
  "Rename and normalize spreadsheet columns for database import",
  "Prepare school admission or academic records for reporting",
  "Remove unwanted rows and standardize values in bulk",
  "Deliver polished ZIP bundles with multiple output files",
];

const workflowSteps = [
  {
    title: "1. Intake",
    detail: "Ask for the source file, desired output format, rows to remove, target column names, and the academic grouping rules.",
  },
  {
    title: "2. Transform",
    detail: "Run Sort Machine to preview the sheet, clean values, rename fields, standardize text, and split outputs.",
  },
  {
    title: "3. Prove",
    detail: "Share before and after screenshots, a row-count summary, and one sample output so the client sees the academic data cleanup clearly.",
  },
  {
    title: "4. Deliver",
    detail: "Send the final XLSX, CSV, or ZIP plus a short delivery note listing what was cleaned, renamed, and grouped.",
  },
];

const deliveryChecklist = [
  "Confirm original row count versus final row count",
  "List removed keywords, duplicates, or invalid records",
  "State renamed columns in plain language",
  "Mention output format and split logic used",
  "Attach final files plus one preview screenshot",
];

const rowBands = {
  small: { label: "Up to 2,000 rows", price: 25, turnaround: "Same day" },
  medium: { label: "2,000 to 10,000 rows", price: 45, turnaround: "24 hours" },
  large: { label: "10,000 to 40,000 rows", price: 75, turnaround: "1 to 2 days" },
  huge: { label: "40,000+ rows", price: 110, turnaround: "2 to 3 days" },
};

const serviceTypes = {
  cleanup: { label: "Cleanup only", bonus: 0 },
  cleanup_and_rename: { label: "Cleanup and column rename", bonus: 15 },
  split_delivery: { label: "Split delivery pack", bonus: 30 },
  backlog_rescue: { label: "Backlog rescue", bonus: 55 },
};

const speedTypes = {
  standard: { label: "Standard", bonus: 0, note: "standard turnaround" },
  urgent: { label: "Urgent", bonus: 20, note: "priority turnaround" },
  express: { label: "Express", bonus: 40, note: "same-day priority turnaround" },
};

const initialDeskState = {
  clientName: "",
  organization: "",
  serviceType: "cleanup",
  rowBand: "medium",
  sourceFormat: "xlsx",
  outputFormat: "xlsx",
  splitRule: "No split required",
  deadlineMode: "standard",
  notes: "",
};

async function copyToClipboard(value, onSuccess) {
  await navigator.clipboard.writeText(value);
  onSuccess();
}

export function ClientDeskPage() {
  const [desk, setDesk] = useState(initialDeskState);
  const [copiedKey, setCopiedKey] = useState("");

  const quote = useMemo(() => {
    const rowBand = rowBands[desk.rowBand];
    const serviceType = serviceTypes[desk.serviceType];
    const deadlineMode = speedTypes[desk.deadlineMode];
    const floor = rowBand.price + serviceType.bonus + deadlineMode.bonus;
    const ceiling = floor + Math.max(20, Math.round(floor * 0.35));

    let packageName = "Academic File Cleanup";
    if (desk.serviceType === "split_delivery") {
      packageName = "Faculty and Department Split Pack";
    } else if (desk.serviceType === "backlog_rescue") {
      packageName = "Academic Operations Rescue";
    } else if (desk.serviceType === "cleanup_and_rename") {
      packageName = "Cleanup and Rename Pack";
    }

    return {
      packageName,
      recommendedPrice: `$${floor}-$${ceiling}`,
      turnaround: deadlineMode.bonus ? `${rowBand.turnaround} with priority handling` : rowBand.turnaround,
      scopeLabel: rowBand.label,
      speedLabel: deadlineMode.label,
      sourceLabel: desk.sourceFormat.toUpperCase(),
      outputLabel: desk.outputFormat.toUpperCase(),
    };
  }, [desk.deadlineMode, desk.outputFormat, desk.rowBand, desk.serviceType, desk.sourceFormat]);

  const intakeSummary = useMemo(() => {
    const clientLabel = desk.clientName.trim() || "Client not named yet";
    const organizationLabel = desk.organization.trim() || "Academic client";

    return [
      `Client: ${clientLabel}`,
      `Organization: ${organizationLabel}`,
      `Recommended package: ${quote.packageName}`,
      `Estimated budget: ${quote.recommendedPrice}`,
      `Turnaround: ${quote.turnaround}`,
      `Source format: ${quote.sourceLabel}`,
      `Delivery format: ${quote.outputLabel}`,
      `Dataset size: ${quote.scopeLabel}`,
      `Split rule: ${desk.splitRule || "No split required"}`,
      `Client notes: ${desk.notes.trim() || "No special notes yet."}`,
    ].join("\n");
  }, [desk.clientName, desk.notes, desk.organization, desk.splitRule, quote]);

  const deliveryNote = useMemo(() => {
    const clientLabel = desk.clientName.trim() || "Client";
    const organizationLabel = desk.organization.trim() || "your academic team";
    const notesLine = desk.notes.trim() ? `Special notes handled: ${desk.notes.trim()}` : "Special notes handled: none specified.";

    return [
      `Hello ${clientLabel},`,
      "",
      `Your academic data job for ${organizationLabel} has been completed.`,
      "",
      `Scope delivered`,
      `- Package: ${quote.packageName}`,
      `- Source format received: ${quote.sourceLabel}`,
      `- Output format delivered: ${quote.outputLabel}`,
      `- Dataset size band: ${quote.scopeLabel}`,
      `- Split rule used: ${desk.splitRule || "No split required"}`,
      "",
      `Work completed`,
      `- Cleaned and standardized spreadsheet values`,
      `- Reviewed headings and prepared export-ready structure`,
      `- Removed flagged or unwanted records where required`,
      `- Prepared final export bundle for reporting or system import`,
      `- ${notesLine}`,
      "",
      `Please review the attached outputs and let me know if you want an additional version by faculty, department, programme, or level.`,
      "",
      `Best regards,`,
      `Academic Data Processing Suite`,
    ].join("\n");
  }, [desk.clientName, desk.notes, desk.organization, desk.splitRule, quote]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Service Layer"
        title="Client Desk"
        description="An academic-facing service section for packaging the suite into client delivery work without losing the app's core identity as the Academic Data Processing Suite."
        actions={
          <>
            <Link to="/sort-machine">
              <Button>
                Open Sort Machine
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/export-history">
              <Button variant="outline">View Delivery History</Button>
            </Link>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <Card className="border-sky-200 bg-sky-50/80">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Fastest service</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">Academic Cleanup</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Best pricing range</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">$25-$180</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Primary engine</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">Sort Machine</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Repeat-work leverage</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">Templates + History</p>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <Layers3 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Academic Service Packages</CardTitle>
              <CardDescription className="mt-1">
                Position the current suite as an academic data operations service, not a separate app.
              </CardDescription>
            </div>
            <StatusBadge value="Reusable" />
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {offerCards.map((offer) => (
              <div key={offer.title} className="rounded-[24px] border border-slate-200 bg-white/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{offer.title}</CardTitle>
                  <StatusBadge value="Active" />
                </div>
                <p className="mt-3 text-sm text-slate-600">{offer.pitch}</p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Price Range</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{offer.price}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Turnaround</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{offer.turnaround}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{offer.stack}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Client Request Angles</CardTitle>
              <CardDescription className="mt-1">
                Common requests that map directly to the suite you already built.
              </CardDescription>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {jobAngles.map((angle) => (
              <div key={angle} className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white/75 px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-sky-700" />
                <p className="text-sm text-slate-700">{angle}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Client Intake and Quote Builder</CardTitle>
              <CardDescription className="mt-1">
                Capture the job quickly, get a price range, and turn it into a reusable project brief.
              </CardDescription>
            </div>
            <StatusBadge value="Active" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Client Name</p>
              <Input
                value={desk.clientName}
                onChange={(event) => setDesk((current) => ({ ...current, clientName: event.target.value }))}
                placeholder="Example: Esther James"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Organization</p>
              <Input
                value={desk.organization}
                onChange={(event) => setDesk((current) => ({ ...current, organization: event.target.value }))}
                placeholder="Example: Bright Future College"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Service Type</p>
              <Select
                value={desk.serviceType}
                onChange={(event) => setDesk((current) => ({ ...current, serviceType: event.target.value }))}
              >
                {Object.entries(serviceTypes).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Dataset Size</p>
              <Select
                value={desk.rowBand}
                onChange={(event) => setDesk((current) => ({ ...current, rowBand: event.target.value }))}
              >
                {Object.entries(rowBands).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Source Format</p>
              <Select
                value={desk.sourceFormat}
                onChange={(event) => setDesk((current) => ({ ...current, sourceFormat: event.target.value }))}
              >
                <option value="xlsx">XLSX</option>
                <option value="csv">CSV</option>
                <option value="mixed">Mixed files</option>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Delivery Format</p>
              <Select
                value={desk.outputFormat}
                onChange={(event) => setDesk((current) => ({ ...current, outputFormat: event.target.value }))}
              >
                <option value="xlsx">XLSX</option>
                <option value="csv">CSV</option>
                <option value="zip">ZIP bundle</option>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Deadline Mode</p>
              <Select
                value={desk.deadlineMode}
                onChange={(event) => setDesk((current) => ({ ...current, deadlineMode: event.target.value }))}
              >
                {Object.entries(speedTypes).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Split Rule</p>
              <Input
                value={desk.splitRule}
                onChange={(event) => setDesk((current) => ({ ...current, splitRule: event.target.value }))}
                placeholder="Example: split by faculty and programme"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Client Notes</p>
            <Textarea
              value={desk.notes}
              onChange={(event) => setDesk((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Example: remove withdrawn students, rename heading to Matric Number, deliver separate faculty files."
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Recommended Quote</CardTitle>
              <CardDescription className="mt-1">
                A fast pricing and turnaround suggestion based on the job shape.
              </CardDescription>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Recommended package</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{quote.packageName}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Suggested budget</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{quote.recommendedPrice}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Turnaround</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{quote.turnaround}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Delivery mode</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {quote.outputLabel} via {desk.deadlineMode === "standard" ? "normal queue" : "priority queue"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-sky-200 bg-sky-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Quick Positioning</p>
            <p className="mt-3 text-sm leading-6 text-sky-950">
              {quote.packageName} for {quote.scopeLabel.toLowerCase()} with {speedTypes[desk.deadlineMode].note}. Best fit
              for {desk.organization.trim() || "an academic client"} working with {quote.sourceLabel} source files and a{" "}
              {quote.outputLabel} delivery requirement.
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Generated Project Brief</CardTitle>
              <CardDescription className="mt-1">
                Copy this into Upwork chat, WhatsApp, email, or your own task tracker.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                copyToClipboard(intakeSummary, () => {
                  setCopiedKey("brief");
                })
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              {copiedKey === "brief" ? "Copied" : "Copy Brief"}
            </Button>
          </div>
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-200">{intakeSummary}</pre>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Delivery Note Generator</CardTitle>
              <CardDescription className="mt-1">
                Use this as your final handoff once the Sort Machine export is ready.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                copyToClipboard(deliveryNote, () => {
                  setCopiedKey("delivery");
                })
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              {copiedKey === "delivery" ? "Copied" : "Copy Delivery Note"}
            </Button>
          </div>
          <div className="mt-6 rounded-[24px] border border-teal-100 bg-teal-50/80 px-5 py-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">{deliveryNote}</pre>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardTitle>Client Workflow</CardTitle>
          <CardDescription className="mt-1">
            A simple operating flow you can reuse on academic cleanup and delivery jobs.
          </CardDescription>
          <div className="mt-6 space-y-4">
            {workflowSteps.map((step) => (
              <div key={step.title} className="rounded-[22px] border border-slate-200 bg-white/80 p-5">
                <p className="font-semibold text-slate-950">{step.title}</p>
                <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Delivery Standard</CardTitle>
              <CardDescription className="mt-1">
                Use this checklist in your final handoff so clients see a structured academic data service, not ad hoc spreadsheet edits.
              </CardDescription>
            </div>
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {deliveryChecklist.map((item) => (
              <div key={item} className="rounded-[20px] border border-teal-100 bg-teal-50/70 px-4 py-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Positioning Line</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              I clean messy academic Excel and CSV files, standardize columns and values, remove bad records, split
              outputs by custom rules, and deliver polished export bundles ready for reporting, registry review, or
              system import.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
