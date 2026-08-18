/**
 * SearchBar — reusable search input with icon and clear button.
 */
import { Search, X } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "Search…", id }) {
  return (
    <div className="search-bar">
      <Search size={15} className="search-icon" />
      <input
        id={id}
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button
          className="search-clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
          type="button"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
