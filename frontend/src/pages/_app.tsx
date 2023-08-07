import * as React from "react";
import Head from "next/head";
import { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CacheProvider, EmotionCache } from "@emotion/react";
import theme from "../styles/theme";
import createEmotionCache from "../lib/utils/createEmotionCache";

import "../styles/globals.css";
import { QueryClient, QueryClientProvider } from "react-query";
import { CompanyProvider } from "@/lib/context/CompanyContext";
import { CertificateProvider } from "@/lib/context/CertificatesContext";
import { TasksDataProvider } from "@/lib/context/TaskDataContext";

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const queryClient = new QueryClient();

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <CompanyProvider>
            <CertificateProvider>
              <TasksDataProvider>
                <Component {...pageProps} />
              </TasksDataProvider>
            </CertificateProvider>
          </CompanyProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
