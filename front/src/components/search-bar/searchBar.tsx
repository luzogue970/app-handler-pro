import "./searchBar.css";

type Props = {
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
};
export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="toolbar">
      <input
        type="text"
        placeholder="Rechercher un projet (path ou remote)..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
        id="search"
      />
    </div>
  );
}
