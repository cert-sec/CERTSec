import { createContext, useContext, useState, ReactNode } from "react";

type Company = {
  id: number;
  name: string;
};

type CompanyContextType = {
  company: Company | null;
  setCompany: React.Dispatch<React.SetStateAction<Company | null>>;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};

type CompanyProviderProps = {
  children: ReactNode;
};

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
  const [company, setCompany] = useState<Company | null>(null);

  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};
