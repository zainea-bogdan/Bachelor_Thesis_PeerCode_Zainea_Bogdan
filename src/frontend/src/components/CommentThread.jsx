import { useState, useEffect } from "react";
import api from "../services/api";
import "./CommentThread.css";

const CommentThread = ({ assignmentId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) fetchComments();
  }, [assignmentId]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await api.post(`/assignments/${assignmentId}/comments`, { content: newComment });
      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <p className="ct-empty">Loading comments...</p>;

  return (
    <div className="ct-thread">
      {comments.length === 0 ? (
        <p className="ct-empty">No comments yet.</p>
      ) : (
        <div className="ct-messages">
          {comments.map((c) => {
            const isMe = c.author_id === currentUser?.id;
            return (
              <div key={c.id} className={`ct-message ${isMe ? "ct-message--me" : "ct-message--other"}`}>
                <div className="ct-message-header">
                  <span className={`ct-role-badge ct-role-badge--${c.author_role}`}>{c.author_role}</span>
                  <span className="ct-date">{formatDate(c.createdAt)}</span>
                </div>
                <div className="ct-bubble">{c.content}</div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handlePost} className="ct-form">
        <input type="text" className="ct-input" placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} required />
        <button type="submit" className="ct-send-btn" disabled={posting}>
          {posting ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default CommentThread;
