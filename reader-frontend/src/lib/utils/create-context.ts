import { createContext, useContext } from "react";

export function createContextStore<T>(name = "ContextStore") {
    const Context = createContext<T | null>(null);
    Context.displayName = name;

    const useStore = (): T => {
        const value = useContext(Context);
        if (value === null) {
            throw new Error(`useStore("${name}") must be used within a <Provider> of ${name}.`);
        }
        return value;
    };

    const useOptionalStore = (): T | null => useContext(Context);
    const Provider = Context.Provider;

    return { Context, Provider, useStore, useOptionalStore } as const;
}