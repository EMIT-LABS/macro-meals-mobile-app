import { create } from 'zustand';

// Types for Adjust Goals Flow values. You may extend/minimize if needed
// (Mirrors GoalsFlowState, except step/array lengths)
type AdjustGoalsFlowState = {
    majorStep: number;
    subSteps: { [key: number]: number };
    completed: { [key: number]: boolean[] };
    setMajorStep: (step: number) => void;
    setSubStep: (major: number, sub: number) => void;
    markSubStepComplete: (major: number, sub: number) => void;
    handleBackNavigation: () => { canGoBack: boolean; shouldExitFlow: boolean };
    navigateToMajorStep: (step: number) => void;
    gender: string | null;
    setGender: (gender: string) => void;
    dateOfBirth: string | null;
    setDateOfBirth: (date: string) => void;
    height_unit_preference: 'imperial' | 'metric';
    weight_unit_preference: 'imperial' | 'metric';
    heightFt: number | null;
    heightIn: number | null;
    heightCm: number | null;
    weightLb: number | null;
    weightKg: number | null;
    setHeightUnitPreference: (unit: 'imperial' | 'metric') => void;
    setWeightUnitPreference: (unit: 'imperial' | 'metric') => void;
    setHeightFt: (ft: number | null) => void;
    setHeightIn: (inch: number | null) => void;
    setHeightCm: (cm: number | null) => void;
    setWeightLb: (lb: number | null) => void;
    setWeightKg: (kg: number | null) => void;
    dailyActivityLevel: string | null;
    setDailyActivityLevel: (level: string) => void;
    dietryPreference: string | null;
    setDietryPreference: (preference: string) => void;
    resetSteps: () => void;
    fitnessGoal: string | null;
    setFitnessGoal: (goal: string) => void;
    targetWeight: number | null;
    setTargetWeight: (weight: number) => void;
    progressRate: number;
    setProgressRate: (rate: number) => void;
    preferences: any | null;
    setPreferences: (prefs: any) => void;
    macroTargets: { carbs: number; fat: number; protein: number; calorie: number } | null;
    setMacroTargets: (macros: { carbs: number; fat: number; protein: number; calorie: number }) => void;
    resetToHeightMetrics: () => void;
};

export const useAdjustGoalsFlowStore = create<AdjustGoalsFlowState>((set, get) => ({
    gender: null,
    setGender: (gender) => set({ gender }),
    majorStep: 0,
    subSteps: { 0: 0, 1: 0, 2: 0 },
    completed: { 0: Array(4).fill(false), 1: Array(3).fill(false), 2: [false] },
    setMajorStep: (step) => set({ majorStep: step }),
    setSubStep: (major, sub) => set(state => ({ subSteps: { ...state.subSteps, [major]: sub } })),
    markSubStepComplete: (major, sub) => {
        set((state) => {
            const updated = [...state.completed[major]];
            updated[sub] = true;
            return { completed: { ...state.completed, [major]: updated } };
        });
    },
    dateOfBirth: null,
    setDateOfBirth: (date) => set({ dateOfBirth: date }),
    height_unit_preference: 'metric',
    weight_unit_preference: 'metric',
    heightFt: null,
    heightIn: null,
    heightCm: null,
    weightLb: null,
    weightKg: null,
    setHeightUnitPreference: (unit) => set({ height_unit_preference: unit }),
    setWeightUnitPreference: (unit) => set({ weight_unit_preference: unit }),
    setHeightFt: (ft) => set({ heightFt: ft }),
    setHeightIn: (inch) => set({ heightIn: inch }),
    setHeightCm: (cm) => set({ heightCm: cm }),
    setWeightLb: (lb) => set({ weightLb: lb }),
    setWeightKg: (kg) => set({ weightKg: kg }),
    dailyActivityLevel: null,
    setDailyActivityLevel: (level) => set({ dailyActivityLevel: level }),
    dietryPreference: null,
    setDietryPreference: (preference) => set({ dietryPreference: preference }),
    resetSteps: () => set({
        majorStep: 0,
        subSteps: { 0: 0, 1: 0, 2: 0 },
        completed: { 0: Array(4).fill(false), 1: Array(3).fill(false), 2: [false] },
        gender: null,
        dateOfBirth: null,
        heightFt: null,
        heightIn: null,
        heightCm: null,
        weightLb: null,
        weightKg: null,
        height_unit_preference: 'metric',
        weight_unit_preference: 'metric',
        dailyActivityLevel: null,
        dietryPreference: null,
        fitnessGoal: null,
        targetWeight: null,
    }),
    fitnessGoal: null,
    setFitnessGoal: (goal) => set({ fitnessGoal: goal }),
    targetWeight: null,
    setTargetWeight: (weight) => set({ targetWeight: weight }),
    progressRate: 0,
    setProgressRate: (rate) => set({ progressRate: rate }),
    preferences: null,
    setPreferences: (prefs) => set({ preferences: prefs }),
    macroTargets: null,
    setMacroTargets: (macros) => set({ macroTargets: macros }),
    resetToHeightMetrics: () => set({ majorStep: 0, subSteps: { 0: 0, 1: 0, 2: 0 } }) ,
    handleBackNavigation: () => {
        const state = get();
        const currentMajorStep = state.majorStep;
        const currentSubStep = state.subSteps[currentMajorStep];
        if (currentSubStep > 0) {
            set((state) => ({
                subSteps: { ...state.subSteps, [currentMajorStep]: currentSubStep - 1 }
            }));
            return { canGoBack: true, shouldExitFlow: false };
        }
        if (currentMajorStep > 0 && currentSubStep === 0) {
            return { canGoBack: true, shouldExitFlow: false };
        }
        return { canGoBack: false, shouldExitFlow: true };
    },
    navigateToMajorStep: (step: number) => {
        const state = get();
        const canNavigate = state.completed[step]?.every(Boolean);
        if (canNavigate) {
            set({
                majorStep: step,
                subSteps: { ...state.subSteps, [step]: 0 },
            });
        }
    },
}));



