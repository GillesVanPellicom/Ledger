import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Switch from '../ui/Switch';
import Select from '../ui/Select';
import { questionRegistry } from '../../wizard/questionRegistry';
import { wizardState } from '../../settings/wizardState';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PlayCircle, RotateCcw, SkipForward, Settings2, Bug, EyeOff } from 'lucide-react';

const WizardDevTools: React.FC = () => {
  const { updateSettings } = useSettingsStore();
  const [startAtQuestionId, setStartAtQuestionId] = useState<string>('');
  const [questionsToReset, setQuestionsToReset] = useState<string[]>([]);
  const [simulateUpgradeN, setSimulateUpgradeN] = useState<number>(0);
  const [skipHello, setSkipHello] = useState(false);
  const [autoApplyDefaults, setAutoApplyDefaults] = useState(false);
  const [verboseLogging, setVerboseLogging] = useState(false);
  const [ignoreHistory, setIgnoreHistory] = useState(false);

  const questionOptions = questionRegistry.map(q => ({ value: q.id, label: q.id }));

  const handleResetAll = () => {
    console.log('[WizardDevTools] Resetting all wizard history');
    updateSettings({ wizard: { askedQuestions: {}, inProgress: false } } as any);
  };

  const handleResetSpecific = () => {
    const currentAsked = wizardState.getAskedQuestions();
    const newAsked = { ...currentAsked };
    questionsToReset.forEach(id => delete newAsked[id]);
    console.log('[WizardDevTools] Resetting specific questions:', questionsToReset);
    updateSettings({ wizard: { askedQuestions: newAsked } } as any);
    setQuestionsToReset([]);
  };

  const handleSimulateUpgrade = () => {
    const currentAsked = wizardState.getAskedQuestions();
    const newAsked: Record<string, number> = {};
    Object.entries(currentAsked).forEach(([id, version]) => {
      newAsked[id] = Math.max(0, version - simulateUpgradeN);
    });
    console.log(`[WizardDevTools] Simulating upgrade by lowering versions by ${simulateUpgradeN}`, newAsked);
    updateSettings({ wizard: { askedQuestions: newAsked } } as any);
  };

  const handleRunWizard = () => {
    const config = {
      startAtQuestionId: startAtQuestionId || undefined,
      skipHello,
      autoApplyDefaults,
      verboseLogging,
      ignoreHistory
    };
    
    console.log('[WizardDevTools] Saving debug config and reloading:', config);
    
    // Configure debug settings
    wizardState.setDebugConfig(config);

    // Ensure wizard is triggered by clearing inProgress (so it starts fresh) 
    // or relying on the debug config to force it.
    // We also need to make sure the questions we want to see are not marked as asked 
    // if we are forcing a run, OR we rely on the controller to respect the debug config override.
    // For now, let's just reload. The controller needs to be updated to read debug config.
    window.location.reload();
  };

  return (
    <div className="space-y-6 p-4 bg-bg-2 rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-medium text-font-1">Wizard Debug Configuration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select
            label="Start at Question"
            value={startAtQuestionId}
            onChange={(e) => setStartAtQuestionId(e.target.value)}
            options={[{ value: '', label: 'Start from beginning' }, ...questionOptions]}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-font-1">Reset Specific Questions</label>
            <div className="flex flex-wrap gap-2">
              {questionOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setQuestionsToReset(prev => 
                      prev.includes(opt.value) 
                        ? prev.filter(id => id !== opt.value)
                        : [...prev, opt.value]
                    );
                  }}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    questionsToReset.includes(opt.value)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg text-font-2 border-border hover:border-font-2'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={handleResetSpecific} disabled={questionsToReset.length === 0}>
              Reset Selected
            </Button>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-font-1">Simulate Upgrade (Lower Versions by N)</label>
             <div className="flex gap-2">
               <Input 
                 type="number" 
                 min="0" 
                 value={simulateUpgradeN} 
                 onChange={(e) => setSimulateUpgradeN(parseInt(e.target.value) || 0)}
                 className="w-20"
               />
               <Button size="sm" variant="secondary" onClick={handleSimulateUpgrade} disabled={simulateUpgradeN <= 0}>
                 Apply Downgrade
               </Button>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <Switch
            label="Ignore History (Force Show All)"
            description="Show all questions regardless of whether they've been asked before."
            isEnabled={ignoreHistory}
            onToggle={() => setIgnoreHistory(!ignoreHistory)}
            icon={EyeOff}
          />
          <Switch
            label="Skip Hello Page"
            description="Jump straight to the first real question."
            isEnabled={skipHello}
            onToggle={() => setSkipHello(!skipHello)}
            icon={SkipForward}
          />
          <Switch
            label="Auto-Apply Defaults"
            description="Automatically select defaults for all questions."
            isEnabled={autoApplyDefaults}
            onToggle={() => setAutoApplyDefaults(!autoApplyDefaults)}
            icon={PlayCircle}
          />
          <Switch
            label="Verbose Logging"
            description="Log events to console."
            isEnabled={verboseLogging}
            onToggle={() => setVerboseLogging(!verboseLogging)}
            icon={Bug}
          />
          
          <div className="pt-4 border-t border-border">
             <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-font-1">Global Actions</span>
             </div>
             <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleResetAll} icon={RotateCcw}>
                  Reset All History
                </Button>
             </div>
          </div>
        </div>
      </div>

      <div className="pt-6 mt-2 border-t border-border flex justify-end">
        <Button size="lg" onClick={handleRunWizard} icon={PlayCircle}>
          Run Wizard with Config
        </Button>
      </div>
    </div>
  );
};

export default WizardDevTools;
