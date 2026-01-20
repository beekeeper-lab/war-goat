import { useState } from 'react';
import { Shield } from 'lucide-react';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onConsent: (trackPatterns: boolean) => void;
}

/**
 * First-run modal for privacy consent
 * Cannot be dismissed without making a choice
 */
export function PrivacyConsentModal({ isOpen, onConsent }: PrivacyConsentModalProps) {
  const [trackPatterns, setTrackPatterns] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsent(trackPatterns);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-olive-100 rounded-lg">
              <Shield className="w-6 h-6 text-olive-700" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Welcome to War Goat</h2>
          </div>

          <div className="space-y-4 text-gray-600">
            <p>
              We value your privacy. Before you begin, please review our data collection practices.
            </p>

            <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Pattern Tracking (Optional)</h3>
              <p className="text-sm mb-3">
                To provide smart suggestions and personalized recommendations, we can track:
              </p>
              <ul className="text-sm space-y-1 mb-3">
                <li>- Tags you frequently use</li>
                <li>- Content types you prefer</li>
                <li>- Categories you explore</li>
              </ul>
              <p className="text-sm text-olive-700">
                This data is stored locally on your device and never sent to any server.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={trackPatterns}
                  onChange={(e) => setTrackPatterns(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Enable Smart Suggestions</span>
                  <p className="text-sm text-gray-500">
                    Track my usage patterns to provide personalized tag and content suggestions
                  </p>
                </div>
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-500 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-400 text-center">
              You can change this setting anytime in Settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
