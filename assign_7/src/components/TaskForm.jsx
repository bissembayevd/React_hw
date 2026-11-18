import { useState } from "react";
export default function TaskForm({ task, onSubmit, pending, onCancel }) {
  const [form, setForm] = useState(
    task || {
      title: "",
      description: "",
      category: "Assignment",
      priority: "Medium",
      dueDate: "",
    },
  );
  function field(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <label>
        Title
        <input
          autoFocus
          disabled={pending}
          required
          maxLength={160}
          value={form.title}
          onChange={(e) => field("title", e.target.value)}
          placeholder="What needs to get done?"
        />
      </label>
      <label>
        Description
        <textarea
          aria-label="Description"
          rows={4}
          disabled={pending}
          maxLength={4000}
          value={form.description}
          onChange={(e) => field("description", e.target.value)}
          placeholder="Add a little more detail…"
        />
      </label>
      <div className="form-grid">
        {[
          ["priority", ["Low", "Medium", "High"]],
          [
            "category",
            [
              "Assignment",
              "Development",
              "Learning",
              "Project",
              "Research",
              "University",
              "Personal",
              "Exercise",
            ],
          ],
        ].map(([name, values]) => (
          <label key={name}>
            {name === "priority" ? "Priority" : "Category"}
            <select
              aria-label={name === "priority" ? "Priority" : "Category"}
              disabled={pending}
              value={form[name]}
              onChange={(e) => field(name, e.target.value)}
            >
              {values.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Due date
          <input
            type="date"
            disabled={pending}
            value={form.dueDate}
            onChange={(e) => field("dueDate", e.target.value)}
          />
        </label>
      </div>
      <footer className="dialog-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={pending}>
          {pending ? "Saving…" : task ? "Save changes" : "Create task"}
        </button>
      </footer>
    </form>
  );
}
