import React, { useState, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { config } from '~/api/config';
import { useRpcWebSocketProvider } from '~/api/WebSocketClient';
import { appState } from '~/App';

const NetworkDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customSelected, setCustomSelected] = useState(false);
  const [_wsUrl, _setWsUrl] = useState("");
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; message: string }>({ isValid: true, message: "" });
  const { wsUrl, setWsUrl } = useRpcWebSocketProvider();
  const appStateSnapshot = useSnapshot(appState);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wsUrl) {
      setCustomSelected(true);
      _setWsUrl(wsUrl);
    } else {
      setCustomSelected(false);
      _setWsUrl("");
    }
  }, [wsUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const validateUrl = (url: string): { isValid: boolean; message: string } => {
    if (!url.trim()) return { isValid: false, message: "URL cannot be empty" };
    try {
      new URL(url);
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        return { isValid: false, message: "URL must start with ws:// or wss://" };
      }
      return { isValid: true, message: "Valid WebSocket URL" };
    } catch {
      return { isValid: false, message: "Invalid URL format" };
    }
  };

  const handleCustomSelect = () => {
    setCustomSelected(true);
    const defaultUrl = import.meta.env.VITE_APP_DEFAULT_WS_URL || "";
    _setWsUrl(defaultUrl);
    setUrlValidation(validateUrl(defaultUrl));
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    _setWsUrl(newUrl);
    setUrlValidation(validateUrl(newUrl));
  };

  const handleUrlSubmit = () => {
    const validation = validateUrl(_wsUrl);
    if (validation.isValid) {
      setWsUrl(_wsUrl);
      setIsOpen(false);
    } else {
      setUrlValidation(validation);
    }
  };

  const handleChainSelect = (key: string) => {
    appState.chain = key;
    setWsUrl(null);
    setCustomSelected(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-stone-200 text-stone-800 px-3 py-2 text-sm font-medium border border-stone-400 w-full text-left flex justify-between items-center"
      >
        <span>{customSelected ? "Custom" : config.chains[appStateSnapshot.chain].name}</span>
        <span className="ml-2">▼</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-stone-300 shadow-lg z-10 rounded overflow-hidden">
          {Object.entries(config.chains)
            .filter(([key]) => key.includes("people"))
            .map(([key, net]) => (
              <button
                key={key}
                className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                onClick={() => handleChainSelect(key)}
              >
                {net.name}
              </button>
            ))}
          <button
            className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            onClick={handleCustomSelect}
          >
            Custom
          </button>
          {customSelected && (
            <div className="p-4 border-t border-stone-300">
              <input
                ref={inputRef}
                type="text"
                value={_wsUrl}
                onChange={handleUrlChange}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="wss://example.com/ws"
                className={`w-full px-3 py-2 text-sm border rounded mb-2 ${
                  urlValidation.isValid ? 'border-stone-300' : 'border-red-500'
                }`}
                aria-invalid={!urlValidation.isValid}
                aria-describedby="url-validation-message"
              />
              <p 
                id="url-validation-message"
                className={`text-xs mb-2 ${urlValidation.isValid ? 'text-green-600' : 'text-red-500'}`}
              >
                {urlValidation.message}
              </p>
              <button
                onClick={handleUrlSubmit}
                disabled={!urlValidation.isValid}
                className="w-full bg-stone-600 text-white py-2 text-sm font-medium rounded hover:bg-stone-700 disabled:bg-stone-400 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkDropdown;
