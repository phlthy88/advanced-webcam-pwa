import React, { useState, useRef, ChangeEvent, useMemo } from 'react';
import { CameraSettings, SettingsPreset, PtzPreset, ExtendedMediaTrackCapabilities } from '../types';
import { DEFAULT_SETTINGS, FILTERS, RESOLUTIONS, FRAME_RATES } from '../constants';
import ControlSection from './ControlSection';
import Joystick from './Joystick';

interface ControlsPanelProps {
    settings: CameraSettings;
    onSettingsChange: (newSettings: Partial<CameraSettings>) => void;
    capabilities: ExtendedMediaTrackCapabilities | null;
    isHardwareControl: (control: keyof CameraSettings) => boolean;
    stream: MediaStream | null;
    settingsPresets: SettingsPreset[];
    setSettingsPresets: React.Dispatch<React.SetStateAction<SettingsPreset[]>>;
    ptzPresets: (PtzPreset | null)[];
    setPtzPresets: React.Dispatch<React.SetStateAction<(PtzPreset | null)[]>>;
    addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    isFaceTrackingActive: boolean;
    onToggleFaceTracking: () => void;
    blurMode: 'none' | 'portrait' | 'full';
    setBlurMode: (mode: 'none' | 'portrait' | 'full') => void;
    aiBackgroundUrl: string | null;
    setAiBackgroundUrl: (url: string | null) => void;
    isGeneratingBackground: boolean;
    onGenerateBackground: () => void;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
}

const Slider: React.FC<{ label: string; id: keyof CameraSettings; value: number; min: number; max: number; step: number; onChange: (id: keyof CameraSettings, value: number) => void; disabled?: boolean; unit?: string; }> = 
({ label, id, value, min, max, step, onChange, disabled, unit }) => (
    <div className={`flex flex-col gap-2 ${disabled ? 'opacity-50' : ''}`}>
        <label htmlFor={id} className="text-sm font-medium flex justify-between">
            <span>{label}</span>
            <span className="text-blue-500 font-semibold">{value.toFixed(1)}{unit}</span>
        </label>
        <input type="range" id={id} name={id} min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(id, parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
        />
    </div>
);

const Select: React.FC<{ label: string; id: keyof CameraSettings; value: string; options: {value: string, label: string}[]; onChange: (id: keyof CameraSettings, value: string) => void; disabled?: boolean; }> =
({label, id, value, options, onChange, disabled}) => (
     <div className={`flex flex-col gap-2 ${disabled ? 'opacity-50' : ''}`}>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <select id={id} name={id} value={value} onChange={(e) => onChange(id, e.target.value)} disabled={disabled}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

const ControlsPanel: React.FC<ControlsPanelProps> = ({
    settings, onSettingsChange, capabilities, isHardwareControl, stream,
    settingsPresets, setSettingsPresets, ptzPresets, setPtzPresets, addToast,
    isFaceTrackingActive, onToggleFaceTracking,
    blurMode, setBlurMode, aiBackgroundUrl, setAiBackgroundUrl, isGeneratingBackground, onGenerateBackground, aiPrompt, setAiPrompt
}) => {
    const [presetName, setPresetName] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const importFileRef = useRef<HTMLInputElement>(null);

    const exposureModeOptions = useMemo(() => {
        if (capabilities?.exposureMode?.length) {
            const labels: Record<string, string> = { continuous: 'Auto', manual: 'Manual', none: 'None' };
            return capabilities.exposureMode.map(mode => ({ value: mode, label: labels[mode] || mode }));
        }
        return [{value: 'continuous', label: 'Auto'}, {value: 'manual', label: 'Manual'}];
    }, [capabilities]);

    const whiteBalanceModeOptions = useMemo(() => {
        if (capabilities?.whiteBalanceMode?.length) {
            const labels: Record<string, string> = { continuous: 'Auto', manual: 'Manual', none: 'None' };
            return capabilities.whiteBalanceMode.map(mode => ({ value: mode, label: labels[mode] || mode }));
        }
        return [{value: 'continuous', label: 'Auto'}, {value: 'manual', label: 'Manual'}];
    }, [capabilities]);

    const focusModeOptions = useMemo(() => {
        if (capabilities?.focusMode?.length) {
            const labels: Record<string, string> = { continuous: 'Continuous Auto', manual: 'Manual', 'single-shot': 'Single Shot' };
            return capabilities.focusMode.map(mode => ({ value: mode, label: labels[mode] || mode }));
        }
        return [
            {value: 'continuous', label: 'Continuous Auto'},
            {value: 'manual', label: 'Manual'},
            {value: 'single-shot', label: 'Single Shot'}
        ];
    }, [capabilities]);

    const handleSliderChange = (id: keyof CameraSettings, value: number) => {
        onSettingsChange({ [id]: value });
    };
    
    const handleSelectChange = (id: keyof CameraSettings, value: string) => {
        onSettingsChange({ [id]: value });
    };

    const handleResolutionChange = async (e: ChangeEvent<HTMLSelectElement>) => {
        if (!stream) return;
        const [width, height] = e.target.value.split('x').map(Number);
        try {
            await stream.getVideoTracks()[0].applyConstraints({ width: { exact: width }, height: { exact: height }});
            addToast(`Resolution set to ${width}x${height}`, 'success');
        } catch (err) {
            addToast('Resolution not supported', 'error');
        }
    }
    
    const handleFrameRateChange = async (e: ChangeEvent<HTMLSelectElement>) => {
         if (!stream) return;
        const frameRate = Number(e.target.value);
        try {
            await stream.getVideoTracks()[0].applyConstraints({ frameRate: { exact: frameRate }});
            addToast(`Frame rate set to ${frameRate}fps`, 'success');
        } catch (err) {
            addToast('Frame rate not supported', 'error');
        }
    }

    const resetSection = (section: string) => {
        let keysToReset: (keyof CameraSettings)[] = [];
        switch(section) {
            case 'exposure': keysToReset = ['brightness', 'contrast', 'gamma', 'exposureMode', 'exposureCompensation']; break;
            case 'color': keysToReset = ['saturation', 'hue', 'whiteBalanceMode', 'whiteBalanceTemperature']; break;
            case 'focus': keysToReset = ['focusMode', 'sharpness']; break;
            case 'gain': keysToReset = ['iso']; break;
            case 'ptz': keysToReset = ['zoom', 'pan', 'tilt']; break;
            case 'effects': 
                keysToReset = ['filter', 'rotation', 'blur', 'faceSmoothing', 'portraitLighting'];
                setBlurMode('none');
                setAiBackgroundUrl(null);
                break;
        }
        const newSettings: Partial<CameraSettings> = {};
        keysToReset.forEach(key => { (newSettings as any)[key] = DEFAULT_SETTINGS[key]; });
        onSettingsChange(newSettings);
        addToast(`${section.charAt(0).toUpperCase() + section.slice(1)} section reset`, 'info');
    };
    
    const handleSavePtzPreset = (index: number) => {
        const newPtzPresets = [...ptzPresets];
        newPtzPresets[index] = { pan: settings.pan, tilt: settings.tilt, zoom: settings.zoom };
        setPtzPresets(newPtzPresets);
        addToast(`PTZ Preset ${index + 1} saved`, 'success');
    };

    const handleLoadPtzPreset = (index: number) => {
        const preset = ptzPresets[index];
        if (preset) {
            onSettingsChange({ pan: preset.pan, tilt: preset.tilt, zoom: preset.zoom });
            addToast(`PTZ Preset ${index + 1} loaded`, 'success');
        }
    };
    
    const saveSettingsPreset = () => {
        const name = presetName.trim() || `Preset ${settingsPresets.length + 1}`;
        const newPreset: SettingsPreset = { name, timestamp: new Date().toISOString(), settings };
        setSettingsPresets([...settingsPresets, newPreset]);
        setPresetName('');
        addToast(`Settings preset "${name}" saved.`, 'success');
    };

    const loadSettingsPreset = () => {
        if (!selectedPreset) return;
        const presetToLoad = settingsPresets[parseInt(selectedPreset, 10)];
        if (presetToLoad) {
            onSettingsChange(presetToLoad.settings);
            addToast(`Preset "${presetToLoad.name}" loaded.`, 'success');
        }
    };

    const deleteSettingsPreset = () => {
        if (!selectedPreset) return;
        const index = parseInt(selectedPreset, 10);
        const presetName = settingsPresets[index].name;
        if (window.confirm(`Are you sure you want to delete preset "${presetName}"?`)) {
            setSettingsPresets(settingsPresets.filter((_, i) => i !== index));
            setSelectedPreset('');
            addToast(`Preset "${presetName}" deleted.`, 'info');
        }
    };

    const exportSettings = () => {
        const data = { settings, settingsPresets, ptzPresets };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcam-settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Settings exported', 'success');
    };

    const importSettings = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.settings) onSettingsChange(data.settings);
                if (data.settingsPresets) setSettingsPresets(data.settingsPresets);
                if (data.ptzPresets) setPtzPresets(data.ptzPresets);
                addToast('Settings imported successfully', 'success');
            } catch {
                addToast('Invalid settings file', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    };

    const isPtzDisabled = isFaceTrackingActive;

    const BlurButton: React.FC<{mode: 'none' | 'portrait' | 'full', label: string}> = ({mode, label}) => (
         <button 
            onClick={() => { setBlurMode(mode); if(mode !== 'none') setAiBackgroundUrl(null); }}
            className={`p-2 w-full text-sm rounded-md transition-colors ${blurMode === mode && !aiBackgroundUrl ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
            {label}
        </button>
    )

    return (
        <div className="flex flex-col gap-4">
            <ControlSection title="Exposure & Light" onReset={() => resetSection('exposure')}>
                 <Slider label="Brightness" id="brightness" min={capabilities?.brightness?.min ?? 0} max={capabilities?.brightness?.max ?? 255} step={capabilities?.brightness?.step ?? 1} value={settings.brightness} onChange={handleSliderChange} disabled={!isHardwareControl('brightness')} />
                 <Slider label="Contrast" id="contrast" min={capabilities?.contrast?.min ?? 0} max={capabilities?.contrast?.max ?? 255} step={capabilities?.contrast?.step ?? 1} value={settings.contrast} onChange={handleSliderChange} disabled={!isHardwareControl('contrast')} />
                 <Slider label="Gamma" id="gamma" min={100} max={300} step={10} value={settings.gamma} onChange={handleSliderChange} />
                 <Select label="Exposure Mode" id="exposureMode" value={settings.exposureMode} options={exposureModeOptions} onChange={handleSelectChange} disabled={!isHardwareControl('exposureMode')} />
                 <Slider label="Exposure Comp." id="exposureCompensation" min={capabilities?.exposureCompensation?.min ?? -2} max={capabilities?.exposureCompensation?.max ?? 2} step={capabilities?.exposureCompensation?.step ?? 0.1} value={settings.exposureCompensation} onChange={handleSliderChange} disabled={!isHardwareControl('exposureCompensation')} />
            </ControlSection>
            
             <ControlSection title="Color" onReset={() => resetSection('color')}>
                <Slider label="Saturation" id="saturation" min={capabilities?.saturation?.min ?? 0} max={capabilities?.saturation?.max ?? 255} step={capabilities?.saturation?.step ?? 1} value={settings.saturation} onChange={handleSliderChange} disabled={!isHardwareControl('saturation')} />
                <Slider label="Hue" id="hue" min={-180} max={180} step={1} value={settings.hue} onChange={handleSliderChange} />
                <Select label="White Balance Mode" id="whiteBalanceMode" value={settings.whiteBalanceMode} options={whiteBalanceModeOptions} onChange={handleSelectChange} disabled={!isHardwareControl('whiteBalanceMode')} />
                <Slider label="WB Temp." id="whiteBalanceTemperature" unit="K" min={capabilities?.colorTemperature?.min ?? 2800} max={capabilities?.colorTemperature?.max ?? 6500} step={capabilities?.colorTemperature?.step ?? 100} value={settings.whiteBalanceTemperature} onChange={handleSliderChange} disabled={!isHardwareControl('whiteBalanceTemperature')} />
            </ControlSection>

            <ControlSection title="Focus & Clarity" onReset={() => resetSection('focus')}>
                <Select label="Focus Mode" id="focusMode" value={settings.focusMode} options={focusModeOptions} onChange={handleSelectChange} disabled={!isHardwareControl('focusMode')} />
                <Slider label="Sharpness" id="sharpness" min={capabilities?.sharpness?.min ?? 0} max={capabilities?.sharpness?.max ?? 255} step={capabilities?.sharpness?.step ?? 1} value={settings.sharpness} onChange={handleSliderChange} disabled={!isHardwareControl('sharpness')} />
            </ControlSection>
            
            <ControlSection title="Pan-Tilt-Zoom (PTZ)" onReset={() => resetSection('ptz')} badge={isHardwareControl('zoom') ? { text: 'Hardware', color: 'green' } : { text: 'Digital', color: 'yellow' }}>
                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                    <label htmlFor="face-track-toggle" className="text-sm font-medium">Auto-Frame Face (AI)</label>
                    <button onClick={onToggleFaceTracking} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isFaceTrackingActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isFaceTrackingActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <Slider label="Zoom" id="zoom" unit="%" min={100} max={400} step={10} value={settings.zoom} onChange={handleSliderChange} disabled={isPtzDisabled} />
                <div className="flex justify-center my-2">
                    <Joystick pan={settings.pan} tilt={settings.tilt} onPtzChange={(pan, tilt) => onSettingsChange({pan, tilt})} disabled={isPtzDisabled || (!isHardwareControl('pan') && !isHardwareControl('tilt') && settings.zoom <= 100)} />
                </div>
                <div className="flex flex-col gap-4">
                    <Slider label="Pan" id="pan" unit="°" min={-180} max={180} step={5} value={settings.pan} onChange={handleSliderChange} disabled={isPtzDisabled || (!isHardwareControl('pan') && settings.zoom <= 100)} />
                    <Slider label="Tilt" id="tilt" unit="°" min={-90} max={90} step={5} value={settings.tilt} onChange={handleSliderChange} disabled={isPtzDisabled || (!isHardwareControl('tilt') && settings.zoom <= 100)}/>
                </div>
                <div className="mt-4">
                    <label className="text-sm font-medium">PTZ Presets</label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {ptzPresets.map((preset, i) => (
                            <div key={i} className="relative group">
                                <button className={`w-full aspect-square rounded-md text-sm transition-colors ${preset ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    {i+1}
                                </button>
                                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity rounded-md">
                                    <button onClick={() => handleSavePtzPreset(i)} className="text-white bg-green-500 hover:bg-green-600 rounded px-2 py-1 text-xs">Save</button>
                                    <button onClick={() => handleLoadPtzPreset(i)} disabled={!preset} className="text-white bg-blue-500 hover:bg-blue-600 rounded px-2 py-1 text-xs disabled:bg-gray-500">Load</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ControlSection>

             <ControlSection title="AI & Creative Effects" onReset={() => resetSection('effects')} badge={{ text: 'AI', color: 'blue' }}>
                <Slider label="Face Smoothing" id="faceSmoothing" min={0} max={100} step={1} value={settings.faceSmoothing} onChange={handleSliderChange} />
                <Slider label="Portrait Lighting" id="portraitLighting" min={0} max={100} step={1} value={settings.portraitLighting} onChange={handleSliderChange} />
                <div className="flex flex-col gap-2">
                   <label className="text-sm font-medium">Background Blur</label>
                   <div className="grid grid-cols-3 gap-2">
                      <BlurButton mode="none" label="None" />
                      <BlurButton mode="portrait" label="Portrait" />
                      <BlurButton mode="full" label="Full" />
                   </div>
                </div>
                 <div className="flex flex-col gap-2">
                    <label htmlFor="aiPrompt" className="text-sm font-medium">AI Background Prompt</label>
                    <textarea id="aiPrompt" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2} placeholder="e.g. a cozy library with a fireplace" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                     <button onClick={onGenerateBackground} disabled={isGeneratingBackground} className="p-2 w-full text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2">
                         {isGeneratingBackground && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                         {isGeneratingBackground ? 'Generating...' : 'Generate'}
                     </button>
                    <button onClick={() => setAiBackgroundUrl(null)} disabled={!aiBackgroundUrl} className="p-2 w-full text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-400">Clear</button>
                </div>
            </ControlSection>

            <ControlSection title="Video Format">
                <div className="flex flex-col gap-2">
                    <label htmlFor="resolutionSelect" className="text-sm font-medium">Resolution</label>
                    <select id="resolutionSelect" onChange={handleResolutionChange} defaultValue={`${stream?.getVideoTracks()[0].getSettings().width}x${stream?.getVideoTracks()[0].getSettings().height}`} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                        {RESOLUTIONS.map(r => <option key={r.label} value={`${r.width}x${r.height}`}>{r.label}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="frameRateSelect" className="text-sm font-medium">Frame Rate</label>
                    <select id="frameRateSelect" onChange={handleFrameRateChange} defaultValue={stream?.getVideoTracks()[0].getSettings().frameRate} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                        {FRAME_RATES.map(fr => <option key={fr} value={fr}>{fr} fps</option>)}
                    </select>
                </div>
            </ControlSection>

            <ControlSection title="Color Filters" onReset={() => onSettingsChange({ filter: 'none' })}>
                <Select label="Color Filter" id="filter" value={settings.filter} options={FILTERS} onChange={handleSelectChange} />
                <Slider label="Blur" id="blur" unit="px" min={0} max={20} step={0.1} value={settings.blur} onChange={handleSliderChange} />
            </ControlSection>

            <ControlSection title="Presets & Settings" startCollapsed>
                <div className="flex flex-col gap-2">
                    <label htmlFor="presetName" className="text-sm font-medium">Preset Name</label>
                    <input type="text" id="presetName" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Enter preset name" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={saveSettingsPreset} className="p-2 w-full text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Settings</button>
                    <button onClick={() => importFileRef.current?.click()} className="p-2 w-full text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600">Import JSON</button>
                    <input type="file" ref={importFileRef} onChange={importSettings} accept=".json" className="hidden" />
                    <button onClick={exportSettings} className="p-2 w-full text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 col-span-2">Export JSON</button>
                </div>
                 <div className="flex flex-col gap-2 mt-4">
                    <label htmlFor="loadPreset" className="text-sm font-medium">Load Preset</label>
                    <select id="loadPreset" value={selectedPreset} onChange={e => setSelectedPreset(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                        <option value="">-- Select a preset --</option>
                        {settingsPresets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={loadSettingsPreset} disabled={!selectedPreset} className="p-2 w-full text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400">Load</button>
                    <button onClick={deleteSettingsPreset} disabled={!selectedPreset} className="p-2 w-full text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400">Delete</button>
                </div>
            </ControlSection>

        </div>
    );
};

export default ControlsPanel;