import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

export default function ExitInterviewPage() {
  const { subdomain, resignationId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [interview, setInterview]  = useState(null);
  const [responses, setResponses]  = useState({});
  const [loading, setLoading]      = useState(true);
  const [submitting, setSubmitting]= useState(false);
  const [error, setError]          = useState("");

  useEffect(() => {
    Promise.all([
      portalExitApi.getInterviewQuestions(subdomain),
      portalExitApi.getInterview(subdomain, resignationId),
    ]).then(([qRes, iRes]) => {
      setQuestions(qRes.data || []);
      setInterview(iRes.data);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [subdomain, resignationId]);

  const setResp = (qId, field, val) =>
    setResponses(r => ({ ...r, [qId]: { ...(r[qId] || {}), question_id: qId, [field]: val } }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true); setError("");
    const payload = { responses: Object.values(responses).filter(r => r.question_id) };
    try {
      await portalExitApi.submitInterviewResponses(subdomain, resignationId, payload);
      navigate(`/portal/${subdomain}/hrms/exit/resignations/${resignationId}`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (interview?.status === "Completed") return (
    <div className="p-8 text-center">
      <p className="text-green-600 font-semibold text-lg">Exit interview already completed.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">← Back</button>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Exit Interview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please answer all questions honestly. Your feedback helps us improve.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              {i + 1}. {q.question_text} {q.is_required && <span className="text-red-400">*</span>}
            </p>
            {q.topic && <p className="text-xs text-gray-400 mb-3">{q.topic}</p>}

            {q.question_type === "Rating Scale" && (
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5].map(n => (
                  <button type="button" key={n} onClick={() => setResp(q.id, "rating_value", n)}
                    className={`w-10 h-10 rounded-full text-sm font-semibold transition ${
                      responses[q.id]?.rating_value === n
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50"}`}>
                    {n}
                  </button>
                ))}
                <span className="text-xs text-gray-400 self-center ml-2">1 = Poor · 5 = Excellent</span>
              </div>
            )}

            {q.question_type === "Multiple Choice" && (
              <div className="space-y-2">
                {(q.options || []).map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="radio" name={`q_${q.id}`} value={opt}
                      checked={responses[q.id]?.text_value === opt}
                      onChange={() => setResp(q.id, "text_value", opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.question_type === "Text Area" && (
              <textarea rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                value={responses[q.id]?.text_value || ""}
                onChange={e => setResp(q.id, "text_value", e.target.value)}
                placeholder="Your response…" />
            )}
          </div>
        ))}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
          <button type="submit" disabled={submitting}
            className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit Interview"}
          </button>
        </div>
      </form>
    </div>
  );
}
