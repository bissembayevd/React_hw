export default function Badge({ value }) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
      <span className="dot" />
      {value}
    </span>
  );
}
