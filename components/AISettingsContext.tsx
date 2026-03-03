import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AIConfig, OpenRouterModel } from '../types';

interface AISettingsContextType extends AIConfig {
    models: OpenRouterModel[];
    isSettingsOpen: boolean;
    loadingModels: boolean;
    setApiKey: (key: string) => void;
    setTextModel: (model: string) => void;
    setImageModel: (model: string) => void;
    openSettings: () => void;
    closeSettings: () => void;
    refreshModels: () => void;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

const CACHE_KEY_SETTINGS = 'launchkit_ai_settings';
const CACHE_KEY_MODELS = 'launchkit_models_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const AISettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Basic settings state
    const [apiKey, setApiKey] = useState<string>('');
    const [textModel, setTextModel] = useState<string>('google/gemini-2.5-flash');
    const [imageModel, setImageModel] = useState<string>('google/gemini-2.5-flash-preview-image-generation'); // Optional default image model
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Models cache state
    const [models, setModels] = useState<OpenRouterModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // Initialize from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem(CACHE_KEY_SETTINGS);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.apiKey) setApiKey(parsed.apiKey);
                if (parsed.textModel) setTextModel(parsed.textModel);
                if (parsed.imageModel) setImageModel(parsed.imageModel);
            } catch (e) {
                console.error("Failed to parse settings cache", e);
            }
        }
        
        loadModelsFromApiOrCache();
    }, []);

    // Save to localStorage when settings change
    useEffect(() => {
        localStorage.setItem(CACHE_KEY_SETTINGS, JSON.stringify({
            apiKey, textModel, imageModel
        }));
    }, [apiKey, textModel, imageModel]);

    const loadModelsFromApiOrCache = async (forceRefresh: boolean = false) => {
        setLoadingModels(true);
        try {
            if (!forceRefresh) {
                const cachedModelsStr = localStorage.getItem(CACHE_KEY_MODELS);
                if (cachedModelsStr) {
                    const cachedData = JSON.parse(cachedModelsStr);
                    const now = new Date().getTime();
                    if (cachedData.timestamp && (now - cachedData.timestamp < CACHE_TTL_MS)) {
                        setModels(cachedData.models);
                        setLoadingModels(false);
                        return;
                    }
                }
            }

            const response = await fetch('https://openrouter.ai/api/v1/models');
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.data)) {
                    // Cache the new models
                    localStorage.setItem(CACHE_KEY_MODELS, JSON.stringify({
                        models: data.data,
                        timestamp: new Date().getTime()
                    }));
                    setModels(data.data);
                }
            } else {
                console.error("Failed to fetch models: status", response.status);
            }
        } catch (e) {
            console.error("Failed to fetch openrouter models", e);
        } finally {
            setLoadingModels(false);
        }
    };

    const refreshModels = useCallback(() => {
        loadModelsFromApiOrCache(true);
    }, []);

    const openSettings = useCallback(() => setIsSettingsOpen(true), []);
    const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

    return (
        <AISettingsContext.Provider value={{
            apiKey, textModel, imageModel, setApiKey, setTextModel, setImageModel,
            models, isSettingsOpen, loadingModels, openSettings, closeSettings, refreshModels
        }}>
            {children}
        </AISettingsContext.Provider>
    );
};

export const useAISettings = () => {
    const context = useContext(AISettingsContext);
    if (context === undefined) {
        throw new Error('useAISettings must be used within an AISettingsProvider');
    }
    return context;
};
