// shared/schema.js
// Single source of truth for the Project Kickoff data points.
// Derived from the "Kickoff Check list" document. Used by both the
// frontend form and the Netlify functions that build the Monday board.
//
// This file is plain ES module syntax and is imported by the browser.
// The functions read the same definitions via a small re-export.

export const TEXT_GROUPS = [
  {
    key: "overview",
    title: "Overview",
    fields: [
      { key: "project", label: "Project", type: "text", required: true },
      { key: "builder", label: "Builder", type: "text" },
      { key: "builder_poc", label: "Builder POC info", type: "textarea" },
    ],
  },
  {
    key: "schedule",
    title: "Time Schedule",
    fields: [
      { key: "start_date", label: "Estimated Start date", type: "date" },
      { key: "duration", label: "Estimated Duration", type: "text" },
    ],
  },
  {
    key: "invoicing",
    title: "Invoicing",
    fields: [
      { key: "invoicing", label: "Invoicing", type: "textarea" },
    ],
  },
  {
    key: "resources",
    title: "Resources",
    fields: [
      { key: "material_ordering", label: "Material ordering", type: "textarea" },
      { key: "suppliers", label: "What supplier(s)", type: "textarea" },
      { key: "material_quotes", label: "Material quotes", type: "textarea" },
      { key: "equipment_needs", label: "Equipment needs", type: "textarea" },
      { key: "manpower", label: "Manpower", type: "textarea" },
    ],
  },
  {
    key: "handoff",
    title: "Hand-off meeting",
    fields: [
      { key: "handoff_who", label: "Who", type: "text" },
      { key: "handoff_date", label: "Date", type: "date" },
    ],
  },
];

// "Additional Office Binder Needs" — tracked as a checklist of statuses.
export const BINDER_ITEMS = [
  { key: "statement_of_values", label: "Statement of Values" },
  { key: "job_cost_sheet", label: "Job cost sheet" },
  { key: "new_job_info_sheet", label: "New Job information sheet" },
  { key: "estimate", label: "Estimate" },
  { key: "contract", label: "Contract" },
  { key: "architecture_drawings", label: "Architecture drawings" },
  { key: "shop_drawings", label: "Shop Drawings" },
  { key: "takeoff", label: "Takeoff" },
  { key: "submittals", label: "Submittals" },
  { key: "submittal_approval", label: "Submittal approval" },
  { key: "scope", label: "Scope" },
  { key: "road_map", label: "Road Map" },
  { key: "spec_sheet", label: "Spec Sheet" },
  { key: "other_binders", label: "Other - Binders -" },
  { key: "safety_plan_binder", label: "Safety Plan Binder" },
];

export const BINDER_GROUP_TITLE = "Additional Office Binder Needs";

// Flat list of every text field, handy for iteration on the server.
export const ALL_TEXT_FIELDS = TEXT_GROUPS.flatMap((g) =>
  g.fields.map((f) => ({ ...f, group: g.key }))
);
