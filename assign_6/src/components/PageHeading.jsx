import { ListTodo } from "lucide-react";
export default function PageHeading({ title, subtitle, children }) {
  return (
    <div className="page-heading">
      <div>
        <ListTodo size={31} className="page-icon" />
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
