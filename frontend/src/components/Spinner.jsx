/** Reusable loading spinner. */
export default function Spinner({ size = "md", className = "" }) {
  return (
    <div
      className={`spinner ${size === "lg" ? "spinner-lg" : ""} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
