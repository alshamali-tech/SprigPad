import type { MapNode } from "./model";
import { ROOT_STYLE, defaultStyle, makeMap, makeNode } from "./model";
import { branchColor } from "./mapEngine";

export interface Template {
  id: string;
  name: string;
  blurb: string;
  tag: string;
  build: () => MapNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kid = [string, ...any[]];

function branch(text: string, i: number, kids: Kid[] = [], opts?: { icon?: string }): MapNode {
  const node = makeNode(text, defaultStyle(branchColor(i), 1));
  if (opts?.icon) node.style.icon = opts.icon;
  node.children = kids.map((k) => kid(k, branchColor(i), 2));
  return node;
}

function kid(def: Kid, color: { bg: string; fg: string }, depth: number): MapNode {
  const [text, ...rest] = def;
  const opts = (rest[0] ?? null) as { icon?: string } | null;
  const hasOpts = opts && typeof opts === "object" && !Array.isArray(opts);
  const children = (hasOpts ? rest.slice(1) : rest) as Kid[];
  const node = makeNode(text, defaultStyle(color, depth));
  if (hasOpts && opts?.icon) node.style.icon = opts.icon;
  node.children = children.map((c) => kid(c, color, depth + 1));
  return node;
}

const T = (name: string, tag: string, blurb: string, rootText: string, branches: MapNode[]): Template => ({
  id: name.toLowerCase().replace(/[^\w]+/g, "-"),
  name,
  tag,
  blurb,
  build: () => {
    const root = makeNode(rootText, { ...ROOT_STYLE });
    root.children = branches;
    return root;
  },
});

export const TEMPLATES: Template[] = [
  T("Project Plan", "Work", "Kick off a project with scope, owners, timeline and risks.", "Project Phoenix", [
    branch("Scope", 0, [["Deliverables", ["MVP", "Docs"]], ["Out of scope"]]),
    branch("Team", 2, [["Design"], ["Engineering"], ["Stakeholders"]]),
    branch("Timeline", 4, [["Milestones", ["Alpha", "Beta", "Launch"]], ["Dependencies"]]),
    branch("Risks", 7, [["Budget"], ["Hiring"], ["Mitigations"]]),
  ]),
  T("Weekly Review", "Personal", "A Friday ritual: wins, loose ends and next week's focus.", "Week 32", [
    branch("Wins", 3, [["Shipped the roadmap"], ["Great 1:1s"]]),
    branch("Loose ends", 4, [["Follow up with Ana"], ["Inbox zero"]]),
    branch("Next week", 0, [["Top 3 priorities", ["Spec review"], ["Deep work block"]], ["Calendar audit"]]),
    branch("Energy", 8, [["What drained me"], ["What charged me"]]),
  ]),
  T("SWOT Analysis", "Strategy", "Strengths, weaknesses, opportunities, threats — the classic grid.", "Acme Coffee", [
    branch("Strengths", 3, [["Loyal regulars"], ["Prime location"]]),
    branch("Weaknesses", 7, [["Slow weekday traffic"], ["No delivery"]]),
    branch("Opportunities", 0, [["Catering"], ["Subscription beans"]]),
    branch("Threats", 6, [["New chain next block"], ["Bean prices rising"]]),
  ]),
  T("Exam Prep", "Study", "Break a syllabus into topics, recall prompts and weak spots.", "Biology Final", [
    branch("Cell biology", 1, [["Mitochondria"], ["Osmosis"], ["Past-paper Qs"]]),
    branch("Genetics", 9, [["Punnett squares"], ["Meiosis vs mitosis"]]),
    branch("Ecology", 2, [["Food webs"], ["Carbon cycle"]]),
    branch("Weak spots", 7, [["Krebs cycle"], ["Hardy–Weinberg"]], { icon: "flag" }),
  ]),
  T("Brainstorm", "Ideation", "An open tree for raw ideas — judgment suspended.", "How might we…", [
    branch("Wild ideas", 8, [["No idea is too big"], ["Combine two domains"]]),
    branch("Constraints", 4, [["Budget"], ["Time"], ["Physics"]]),
    branch("Borrow", 1, [["What would a chef do?"], ["What would a game designer do?"]]),
    branch("Later", 5, [["Parking lot"]]),
  ]),
  T("Product Launch", "Work", "Everything between 'it works' and 'it's famous'.", "v2.0 Launch", [
    branch("Positioning", 0, [["One-liner"], ["Audience"], ["Proof points"]]),
    branch("Assets", 9, [["Landing page"], ["Demo video"], ["Changelog"]]),
    branch("Channels", 1, [["Newsletter"], ["Communities"], ["Press"]]),
    branch("Day-of", 6, [["War room"], ["Metrics to watch"]]),
  ]),
  T("Meeting Notes", "Work", "Agenda in, decisions and owners out.", "Roadmap sync", [
    branch("Agenda", 0, [["Q3 numbers"], ["Hiring plan"]]),
    branch("Decisions", 3, [["Ship search first"]], { icon: "check" }),
    branch("Action items", 4, [["@Sam: spec by Fri"], ["@Lee: user interviews"]], { icon: "flag" }),
    branch("Parking lot", 5, [["Revisit pricing in Oct"]]),
  ]),
  T("Goal Setting", "Personal", "OKRs without the ceremony: objectives, key results, habits.", "2026 Goals", [
    branch("Health", 2, [["Run 2×/week"], ["Sleep 7.5h"]]),
    branch("Craft", 0, [["Ship side project"], ["Write 12 essays"]]),
    branch("Money", 4, [["Emergency fund"], ["Index monthly"]]),
    branch("People", 8, [["Monthly calls with old friends"]]),
  ]),
  T("Book Notes", "Study", "Arguments, quotes and what you'll actually use.", "Thinking in Systems", [
    branch("Core ideas", 1, [["Stocks & flows"], ["Feedback loops"], ["Leverage points"]]),
    branch("Quotes", 9, [['"Purposive behavior" — p.42']]),
    branch("Disagree with", 7, [["Too abstract on policy"]]),
    branch("Apply to", 3, [["Team processes"], ["Personal habits"]]),
  ]),
  T("Trip Planning", "Life", "Logistics, must-sees and the food list.", "Lisbon, May", [
    branch("Flights & stay", 0, [["Compare Tue/Wed"], ["Alfama vs Chiado"]]),
    branch("Must-see", 1, [["Belém at opening"], ["Sintra day trip"], ["Fado night"]]),
    branch("Food", 4, [["Pastéis de Belém"], ["Time Out Market"], ["Cervejaria"]]),
    branch("Packing", 5, [["Adapters"], ["Walking shoes"]]),
  ]),
];

export function instantiateTemplate(t: Template) {
  const map = makeMap(t.name);
  map.root = t.build();
  return map;
}
