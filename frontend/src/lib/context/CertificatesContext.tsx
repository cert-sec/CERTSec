import { createContext, useContext, useState, ReactNode } from "react";

export type Certificate = {
  id: number;
  name: string;
  description: string;
  // include other fields if needed
};

type CertificateContextType = {
  certificates: Record<string, Certificate> | null;
  setCertificates: React.Dispatch<
    React.SetStateAction<Record<string, Certificate> | null>
  >;
};

const CertificateContext = createContext<CertificateContextType | undefined>(
  undefined
);

export const useCertificate = () => {
  const context = useContext(CertificateContext);
  if (!context) {
    throw new Error("useCertificate must be used within a CertificateProvider");
  }
  return context;
};

type CertificatesProviderProps = {
  children: ReactNode;
};

export const CertificateProvider = ({
  children,
}: CertificatesProviderProps) => {
  const [certificates, setCertificates] = useState<Record<
    string,
    Certificate
  > | null>(null);

  return (
    <CertificateContext.Provider value={{ certificates, setCertificates }}>
      {children}
    </CertificateContext.Provider>
  );
};
