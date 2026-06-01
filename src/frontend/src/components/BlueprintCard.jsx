import { useState } from "react";
import api from "../services/api";
import "./BlueprintCard.css";

const BlueprintCard = ({ bp, onConfirm, onAssign, onUnassign, onUnconfirm, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(bp.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/blueprints/${bp.id}/content`, { content });
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bp-card">
      <div className="bp-card-top">
        <div className="bp-card-meta">
          <span className={`bp-difficulty bp-difficulty--${bp.difficulty}`}>{bp.difficulty}</span>
          <span className="bp-domain">{bp.domain}</span>
        </div>
        <span className={`bp-status bp-status--${bp.status}`}>{bp.status}</span>
      </div>

      <h3 className="bp-title">{bp.title}</h3>
      <p className="bp-description">{content.context_description}</p>

      <div className="bp-divider" />

      <div className="bp-section">
        <div className="bp-section-label">Minimum specs</div>
        {editing ? (
          <textarea className="bp-textarea" value={(content.minimum_specs || []).join("\n")} onChange={(e) => setContent({ ...content, minimum_specs: e.target.value.split("\n") })} rows={5} />
        ) : (
          <ul className="bp-list">
            {(content.minimum_specs || []).map((spec, i) => (
              <li key={i} className="bp-list-item">
                <span className="bp-bullet">→</span>
                {spec}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bp-divider" />

      <div className="bp-two-col">
        <div className="bp-section">
          <div className="bp-section-label">Folder structure</div>
          {editing ? (
            <textarea
              className="bp-textarea"
              value={Object.entries(content.expected_folder_structure || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
              onChange={(e) => {
                const obj = {};
                e.target.value.split("\n").forEach((line) => {
                  const [k, ...v] = line.split(": ");
                  if (k) obj[k] = v.join(": ");
                });
                setContent({ ...content, expected_folder_structure: obj });
              }}
              rows={6}
            />
          ) : (
            <ul className="bp-list">
              {Object.entries(content.expected_folder_structure || {}).map(([k, v]) => (
                <li key={k} className="bp-list-item">
                  <code className="bp-code">{k}</code>
                  <span className="bp-list-desc">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bp-section">
          <div className="bp-section-label">Commit conventions</div>
          <ul className="bp-list">
            {Object.entries(content.commit_conventions || {}).map(([k, v]) => (
              <li key={k} className="bp-list-item">
                <code className="bp-code">{k}</code>
                <span className="bp-list-desc">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bp-footer">
        {bp.status === "generated" && (
          <>
            {editing ? (
              <>
                <button className="bp-btn-ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="bp-btn-ghost" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <button className="bp-btn-ghost" onClick={() => setEditing(true)}>
                Edit blueprint
              </button>
            )}
            <button className="bp-btn-confirm" onClick={() => onConfirm(bp.id)}>
              Confirm blueprint
            </button>
          </>
        )}
        {bp.status === "confirmed" && (
          <div className="bp-footer-assigned">
            <button className="bp-btn-ghost" onClick={() => onUnconfirm(bp.id)}>
              Edit
            </button>
            <button className="bp-btn-assign" onClick={() => onAssign(bp.id)}>
              Assign to students
            </button>
          </div>
        )}
        {bp.status === "assigned" && (
          <div className="bp-footer-assigned">
            <span className="bp-assigned-note">✓ Assigned to students</span>
            <button className="bp-btn-ghost" onClick={() => onUnassign(bp.id)}>
              Unassign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlueprintCard;
