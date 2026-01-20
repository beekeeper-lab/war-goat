interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  selectedTags: string[];
}

/**
 * Displays inline clickable chips for tag/category suggestions
 *
 * - Shows up to 5 suggestions
 * - Most frequent first
 * - Excludes already-selected tags
 * - Click to add
 */
export function SuggestionChips({ suggestions, onSelect, selectedTags }: SuggestionChipsProps) {
  const availableSuggestions = suggestions
    .filter(s => !selectedTags.includes(s))
    .slice(0, 5);

  if (availableSuggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-xs text-olive-500">Suggestions:</span>
      {availableSuggestions.map(suggestion => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="px-2 py-1 text-xs bg-olive-100 hover:bg-olive-200 text-olive-700 rounded-full transition-colors border border-olive-300"
        >
          + {suggestion}
        </button>
      ))}
    </div>
  );
}
