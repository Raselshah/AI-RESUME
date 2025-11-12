"use client";
import axios from "axios";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [err, setErr] = useState("");

  const uploadResume = async () => {
    if (!file) return setErr("পিডিএফ সিভি আপলোড করুন। (Please upload a PDF resume)");
    setErr(""); setLoading(true); setAnalysis(null);

    const form = new FormData();
    form.append("resume", file);

    try {
      const res = await axios.post("http://localhost:4000/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });
      if (res.data?.success) {
        setAnalysis(res.data.data);
      } else {
        setErr("Analysis failed");
      }
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">

        {/* aziz */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Resume ATS Analyzer — Ollama</h1>
          <p className="text-gray-600 mt-2">আপনার সিভি আপলোড করুন এবং এটিএস স্কোর, দক্ষতা মিল এবং উন্নতির পরামর্শ পান। (Upload your resume to get ATS score, skill matches, and improvement suggestions.)</p>
        </header>

        <section className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <input
              id="resume"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="hidden"
            />
            <label htmlFor="resume" className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-md">
              Choose PDF
            </label>

            <div className="flex-1">
              <div className="text-sm text-gray-700">
                {file ? <>{file.name} • {(file.size/1024/1024).toFixed(2)} MB</> : "No file selected"}
              </div>
            </div>

            <button
              onClick={uploadResume}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Analyze Resume"}
            </button>
          </div>

          {err && <div className="mt-3 text-red-600">{err}</div>}
        </section>

        {analysis && (
          <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* rasel */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{analysis.primary_role || "Unknown Role"}</h2>
                    <p className="text-sm text-gray-600 mt-1">{analysis.short_summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">ATS স্কোর</div>
                    <div className="mt-1 text-3xl font-bold" style={{ color: analysis.ats_score >= 70 ? "#059669" : "#b91c1c" }}>
                      {analysis.ats_score}%
                    </div>
                  </div>
                </div>
              </div>

{/* monisha */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Skills detected</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.skills || []).map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">{s}</span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm">Matched Skills</h4>
                    <div className="mt-2">
                      {(analysis.matched_skills || []).length ? (
                        (analysis.matched_skills || []).map((s,i) => (
                          <div key={i} className="inline-block mr-2 mb-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">{s}</div>
                        ))
                      ) : <div className="text-gray-500">None</div>}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm">Missing Skills</h4>
                    <div className="mt-2">
                      {(analysis.missing_skills || []).length ? (
                        (analysis.missing_skills || []).map((s,i) => (
                          <div key={i} className="inline-block mr-2 mb-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">{s}</div>
                        ))
                      ) : <div className="text-gray-500">None</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Improvement Suggestions</h3>
                <ol className="list-decimal ml-5 space-y-2 text-sm">
                  {(analysis.improvements || []).map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ol>
              </div>
            </div>

{/* sakib */}
            <aside className="space-y-4">
              <div className="bg-white p-4 rounded shadow">
                <h4 className="font-semibold mb-2">Quick Actions</h4>
                <button className="w-full mb-2 px-3 py-2 bg-indigo-600 text-white rounded">Download ATS-friendly template</button>
                <button className="w-full px-3 py-2 border rounded">Improve resume with suggestions</button>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h4 className="font-semibold mb-2">Notes</h4>
                <p className="text-sm text-gray-600">This analysis runs locally on your machine via Ollama. If the model fails to produce JSON, a fallback heuristic is used.</p>
              </div>
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}

// improvem
// "use client";
// import { useState } from "react";

// export default function ResumeAnalyzer() {
//   const [file, setFile] = useState<File | null>(null);
//   const [result, setResult] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const handleUpload = async () => {
//     if (!file) return alert("Please select a resume file first!");
//     setLoading(true);
//     const formData = new FormData();
//     formData.append("resume", file);
//     const res = await fetch("http://localhost:4000/api/upload", { method: "POST", body: formData });
//     const data = await res.json();
//     setResult(data);
//     setLoading(false);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex flex-col items-center py-10 text-white">
//       <h1 className="text-3xl font-bold mb-4">🤖 AI Resume Analyzer</h1>
//       <div className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-xl w-full">
//         <input
//           type="file"
//           accept="application/pdf"
//           onChange={(e) => setFile(e.target.files?.[0] || null)}
//           className="mb-4 block w-full border border-gray-600 bg-gray-700 rounded p-2"
//         />
//         <button
//           onClick={handleUpload}
//           disabled={loading}
//           className="w-full bg-blue-600 hover:bg-blue-700 transition py-2 rounded font-semibold"
//         >
//           {loading ? "Analyzing..." : "Upload & Analyze"}
//         </button>
//       </div>

//       {result && (
//         <div className="mt-8 bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-3xl space-y-4">
//           <h2 className="text-2xl font-semibold">📋 Role: {result.role}</h2>
//           <p className="text-lg">📊 ATS স্কোর: <span className="font-bold text-green-400">{result.ats_score}%</span></p>

//           <div>
//             <h3 className="font-semibold text-blue-400">🧠 Skills Detected</h3>
//             <p className="text-gray-300">{result.skills_detected?.join(", ") || "None"}</p>
//           </div>

//           <div>
//             <h3 className="font-semibold text-green-400">✅ Matched Skills</h3>
//             <p>{result.matched_skills?.join(", ") || "None"}</p>
//           </div>

//           <div>
//             <h3 className="font-semibold text-red-400">❌ Missing Skills</h3>
//             <p>{result.missing_skills?.join(", ") || "None"}</p>
//           </div>

//           <div>
//             <h3 className="font-semibold text-yellow-400">💡 Improvement Suggestions</h3>
//             <ul className="list-disc list-inside text-gray-200 space-y-1">
//               {result.improvement_suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}
//             </ul>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
