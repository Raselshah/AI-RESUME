import { spawn } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import pdfParse from "pdf-parse";

dotenv.config();
const PORT = process.env.PORT || 4000;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const MAX_TEXT_CHARS = parseInt(process.env.MAX_TEXT_CHARS || "30000", 10);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

/**
 * Call Ollama CLI: `ollama run <model>`
 * We spawn a child and write the prompt to stdin.
 * Expect the model to output valid JSON only (we force that in the prompt).
 */
function callOllama(prompt) {
  return new Promise((resolve, reject) => {
    // spawn ollama run <model>
    const cmd = "ollama";
    const args = ["run", OLLAMA_MODEL];
    const proc = spawn(cmd, args);

    let stdout = "";
    let stderr = "";

    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`Ollama exited ${code}. Stderr: ${stderr}`));
      }
      resolve({ stdout, stderr, code });
    });

    proc.on("error", (err) => reject(err));
  });
}

/**
 * Build a careful prompt that asks the model to output JSON ONLY.
 * We ask for:
 *  - ats_score (0-100)
 *  - primary_role
 *  - skills: array
 *  - matched_skills: array
 *  - missing_skills: array
 *  - improvements: array of suggestions in Bangla (also English)
 *  - short_summary
 */
function buildPromptFromText(text) {
  const limited = text.slice(0, MAX_TEXT_CHARS);
  return `
You are an expert HR & ATS assistant. Given the resume text below, produce VALID JSON ONLY (no explanations). EXACT SCHEMA (keys must appear in this order):
{
  "ats_score": <integer 0-100>,
  "primary_role": "<short role title>",
  "skills": ["skill1","skill2",...],
  "matched_skills": ["skill1","skill2",...],
  "missing_skills": ["skill1","skill2",...],
  "improvements": ["concise suggestion 1 (Bangla or English)","suggestion 2",...],
  "short_summary": "<one-sentence summary>"
}

Rules:
- Determine the primary role from the resume. Keep it short (e.g., "Frontend Engineer", "Product Manager", "HR Executive").
- ATS score: estimate how ATS-friendly the resume is (consider keywords, headings, contact info, layout hints). Output integer 0-100.
- Skills: extract a deduplicated list of skills (technical and professional) mentioned in the resume.
- matched_skills & missing_skills: compare the skills to a reasonable set of role-required skills (infer typical requirements for that role). Put matched in matched_skills; missing in missing_skills.
- Provide clear, actionable improvements in the improvements array. Include at least two suggestions in Bangla (বাংলায়) and two in English if applicable.
- short_summary: one-line summary of candidate experience & role match.

Resume text (begin):
"""${limited}"""
Resume text (end).

Return ONLY the JSON that matches the schema. Do not add any commentary.
`;
}

// fallback simple skill extractor if model outputs fail
function fallbackSkillExtractor(text) {
  const CANDIDATES = [
    "javascript",
    "react",
    "node.js",
    "node",
    "express",
    "mongodb",
    "sql",
    "typescript",
    "python",
    "django",
    "flask",
    "aws",
    "docker",
    "kubernetes",
    "html",
    "css",
    "tailwind",
    "redux",
    "graphql",
    "pandas",
    "numpy",
    "machine learning",
    "excel",
    "tableau",
    "powerbi",
    "jira",
    "agile",
    "recruitment",
    "payroll",
    "seo",
    "content strategy",
    "salesforce",
    "crm",
  ];
  const t = text.toLowerCase();
  const found = new Set();
  for (const s of CANDIDATES) {
    if (t.includes(s)) found.add(s);
  }
  return Array.from(found);
}

app.post("/api/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    const text = (pdfData.text || "").trim();

    // Build prompt and call Ollama
    const prompt = buildPromptFromText(text);

    let parsedJson = null;
    try {
      const { stdout } = await callOllama(prompt);
      // try to find first JSON block in stdout
      const firstBrace = stdout.indexOf("{");
      const lastBrace = stdout.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = stdout.slice(firstBrace, lastBrace + 1);
        parsedJson = JSON.parse(jsonStr);
      } else {
        throw new Error("No JSON output from model");
      }
    } catch (err) {
      console.warn("LLM parse failed:", err.message || err);
      // fallback heuristics
      const skills = fallbackSkillExtractor(text);
      parsedJson = {
        ats_score: 65,
        primary_role: "Unknown",
        skills,
        matched_skills: [],
        missing_skills: [],
        improvements: [
          "Add clear section headings (e.g., Experience, Education).",
          "বাংলায়: আপনি অর্জন-ভিত্তিক ফলাফল (quantifiable achievements) যোগ করুন।",
        ],
        short_summary: "Could not parse resume fully; used heuristics.",
      };
    }

    // delete uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch {}

    return res.json({ success: true, data: parsedJson });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ok", note: "resume-ollama-backend" });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);

// improvment
// import { spawn } from "child_process";
// import cors from "cors";
// import express from "express";
// import fs from "fs";
// import multer from "multer";
// import pdfParse from "pdf-parse";

// const app = express();
// app.use(cors());
// app.use(express.json());
// const upload = multer({ dest: "uploads/" });

// // 🔹 Run Ollama prompt locally
// function runOllama(prompt) {
//   return new Promise((resolve, reject) => {
//     const proc = spawn("ollama", ["run", "llama3"], {
//       stdio: ["pipe", "pipe", "inherit"],
//     });
//     let output = "";
//     proc.stdout.on("data", (data) => (output += data.toString()));
//     proc.on("close", () => resolve(output.trim()));
//     proc.stdin.write(prompt);
//     proc.stdin.end();
//   });
// }

// // 🔹 Parse resume text
// async function extractText(buffer) {
//   const data = await pdfParse(buffer);
//   return data.text.replace(/\s+/g, " ").trim();
// }

// // 🔹 Analyze resume using Ollama
// async function analyzeResume(text) {
//   const prompt = `
// You are an ATS resume analyzer.
// Analyze this resume and return a JSON object with:
// {
//   "role": "Detected professional role",
//   "ats_score": "number between 0-100 based on completeness",
//   "skills_detected": [],
//   "matched_skills": [],
//   "missing_skills": [],
//   "improvement_suggestions": [],
//   "language": "বাংলা"
// }
// Resume:
// ${text}
// `;

//   const result = await runOllama(prompt);

//   try {
//     const jsonStart = result.indexOf("{");
//     const jsonEnd = result.lastIndexOf("}");
//     return JSON.parse(result.slice(jsonStart, jsonEnd + 1));
//   } catch {
//     return {
//       role: "Frontend Engineer (heuristic)",
//       ats_score: 60,
//       skills_detected: ["javascript", "react", "html", "css"],
//       matched_skills: ["react", "javascript"],
//       missing_skills: ["typescript", "redux", "webpack"],
//       improvement_suggestions: [
//         "Add measurable achievements with metrics.",
//         "Include clear section titles like 'Experience' and 'Education'.",
//         "বাংলায়: আরো প্রজেক্ট ও কাজের দায়িত্ব সংযুক্ত করুন।",
//       ],
//     };
//   }
// }

// app.post("/api/upload", upload.single("resume"), async (req, res) => {
//   const buffer = fs.readFileSync(req.file.path);
//   const text = await extractText(buffer);
//   fs.unlinkSync(req.file.path);

//   const analysis = await analyzeResume(text);
//   res.json(analysis);
// });

// app.listen(4000, () =>
//   console.log("✅ Ollama ATS Analyzer running on port 4000")
// );
