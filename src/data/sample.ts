import {
  createWorkspace,
  localDate,
  type Workspace,
  type ApplicationStatus,
} from "../lib/workspace";
export const sampleProfile = `Software engineering student building thoughtful tools with React, TypeScript, Node.js, and Python.
Built a full-stack analytics dashboard using React and REST APIs to help a student team understand project activity.
Automated data workflows with Python and SQL, replacing manual spreadsheet updates.
Created reusable, accessible interface components and responsive CSS layouts for a campus project.
Collaborated through GitHub pull requests, wrote tests, and documented implementation tradeoffs.
Presented project decisions to teammates and incorporated feedback into the next product iteration.`;
export const sampleJobDescription = `Frontend Software Engineer Intern\n\nBuild user-facing tools for a career technology platform. Work with React, TypeScript, design systems, REST APIs, and analytics dashboards.\n\nRequirements: communication, Git collaboration, testing, and attention to accessible, responsive interfaces.\n\nNice to have: Node.js, Python, SQL, data visualization, and experience turning product requirements into working features.`;
export function createDemoWorkspace(): Workspace {
  const w = createWorkspace();
  w.draft = {
    ...w.draft,
    company: "Linear",
    role: "Frontend Engineer Intern",
    profile: sampleProfile,
    jobDescription: sampleJobDescription,
    applicantName: "Alex Morgan",
    resumeVersionId: "demo-resume",
    url: "https://linear.app/careers",
    notes: "Explore the product engineering team.",
  };
  w.resumes = [
    {
      id: "demo-resume",
      name: "Software engineering · master",
      sourceType: "plain-text",
      rawContent: sampleProfile,
      parsedText: sampleProfile,
      parsedAt: new Date().toISOString(),
    },
  ];
  const rows: [string, string, ApplicationStatus, number, number][] = [
    ["Linear", "Frontend Engineer Intern", "Drafting", 91, 3],
    ["Notion", "Software Engineer Intern", "Applied", 86, 8],
    ["Stripe", "Product Engineer Intern", "Interviewing", 88, 5],
    ["Figma", "Software Engineer Intern", "Researching", 82, 11],
    ["Vercel", "Developer Experience Intern", "Drafting", 79, 14],
  ];
  w.applications = rows.map(([company, role, status, score, offset], i) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return {
      id: `demo-${i}`,
      company,
      role,
      status,
      score,
      nextAction:
        status === "Interviewing"
          ? "Prepare two project stories for the technical conversation."
          : status === "Applied"
            ? "Follow up with the recruiting team next week."
            : "Review the job description and tailor your materials.",
      url: `https://${company.toLowerCase() === "linear" ? "linear.app" : company.toLowerCase() === "notion" ? "notion.com" : company.toLowerCase() + ".com"}/careers`,
      contact: "",
      deadline: localDate(date),
      notes:
        "Illustrative demo opportunity. Check the company’s website for current openings.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      draft: { ...w.draft, company, role, applicationId: `demo-${i}` },
    };
  });
  return w;
}
