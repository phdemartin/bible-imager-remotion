"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface FileContextType {
    file: File | null;
    setFile: (file: File | null) => void;
    fileDuration: number;
    setFileDuration: (duration: number) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
    const [file, setFile] = useState<File | null>(null);
    const [fileDuration, setFileDuration] = useState<number>(0);

    return (
        <FileContext.Provider value={{ file, setFile, fileDuration, setFileDuration }}>
            {children}
        </FileContext.Provider>
    );
}

export function useFile() {
    const context = useContext(FileContext);
    if (context === undefined) {
        throw new Error("useFile must be used within a FileProvider");
    }
    return context;
}
