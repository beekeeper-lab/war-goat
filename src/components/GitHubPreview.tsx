import { Star, GitFork, Circle } from 'lucide-react';

/**
 * Common programming language colors matching GitHub's language colors
 */
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Dart: '#00B4AB',
  R: '#198CE7',
  Lua: '#000080',
  Perl: '#0298c3',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  Clojure: '#db5855',
  Erlang: '#B83998',
  Julia: '#a270ba',
  Objective_C: '#438eff',
  MATLAB: '#e16737',
  Assembly: '#6E4C13',
  Makefile: '#427819',
  PowerShell: '#012456',
  Dockerfile: '#384d54',
};

/**
 * Format star count for display (e.g., 1234 → "1.2k")
 */
function formatStarCount(count: number): string {
  if (count >= 1000000) {
    const millions = count / 1000000;
    if (count % 1000000 === 0) {
      return `${Math.floor(millions)}M`;
    }
    return `${millions.toFixed(1)}M`;
  }
  if (count >= 1000) {
    const thousands = count / 1000;
    if (count % 1000 === 0) {
      return `${Math.floor(thousands)}k`;
    }
    return `${thousands.toFixed(1)}k`;
  }
  return String(count);
}

interface GitHubPreviewProps {
  stars: number;
  forks?: number;
  language: string | null;
  topics: string[];
  description?: string;
}

export function GitHubPreview({
  stars,
  forks,
  language,
  topics,
  description,
}: GitHubPreviewProps) {
  const languageColor = language ? LANGUAGE_COLORS[language] || '#858585' : null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        {/* Stars */}
        <div className="flex items-center gap-1 text-gray-700">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-medium">{formatStarCount(stars)}</span>
        </div>

        {/* Forks */}
        {forks !== undefined && forks > 0 && (
          <div className="flex items-center gap-1 text-gray-600">
            <GitFork className="w-4 h-4" />
            <span>{formatStarCount(forks)}</span>
          </div>
        )}

        {/* Language */}
        {language && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <Circle
              className="w-3 h-3"
              style={{
                fill: languageColor || '#858585',
                color: languageColor || '#858585',
              }}
            />
            <span>{language}</span>
          </div>
        )}
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {topic}
            </span>
          ))}
          {topics.length > 5 && (
            <span className="px-2 py-0.5 text-gray-500 text-xs">
              +{topics.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
